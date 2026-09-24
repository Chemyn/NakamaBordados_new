<?php
/**
 * Bridge between affiliate profiles and the Nakama Discounts primary engine.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Discounts {
	const SESSION_CODE   = 'nakama_affiliate_code';
	const SESSION_SOURCE = 'nakama_affiliate_source';
	const KEY_PREFIX     = 'affiliate_code:';

	public static function init() {
		add_filter( 'nakama_discount_primary_candidates', array( __CLASS__, 'add_candidate' ), 20, 2 );
		add_filter( 'nakama_checkout_bridge_affiliate_result', array( __CLASS__, 'apply_checkout_bridge' ), 20, 3 );
		add_action( 'woocommerce_applied_coupon', array( __CLASS__, 'on_native_coupon_applied' ), 20 );
		add_action( 'nakama_discount_selection_applied', array( __CLASS__, 'on_promotion_selected' ), 20 );
		add_action( 'nakama_checkout_bridge_clear_promotion', array( __CLASS__, 'clear_selection' ), 20 );
	}

	/** Apply a bridge code only after WooCommerce has rebuilt a valid cart. */
	public static function apply_checkout_bridge( $result, $raw_code, $source = 'manual' ) {
		$selection = self::select_code( $raw_code, $source );
		return array(
			'handled' => true,
			'success' => ! empty( $selection['success'] ),
			'message' => isset( $selection['message'] )
				? (string) $selection['message']
				: ( empty( $selection['success'] ) ? 'El código de afiliado ya no está disponible.' : '' ),
		);
	}

	/** Add only the server-resolved affiliate stored in the Woo session. */
	public static function add_candidate( array $candidates, $context ) {
		$session = self::session();
		if ( ! $session ) {
			return $candidates;
		}

		$code = $session->get( self::SESSION_CODE, '' );
		if ( '' === $code ) {
			return $candidates;
		}

		$result = Nakama_Affiliates_Codes::resolve( $code );
		if ( empty( $result['valid'] ) ) {
			self::clear_selection();
			return $candidates;
		}

		$profile = $result['profile'];
		$rate = Nakama_Affiliates_Domain::bounded_rate(
			isset( $profile['discount_rate'] ) ? $profile['discount_rate'] : 0,
			Nakama_Affiliates_Domain::MAX_DISCOUNT_RATE
		);
		$subtotal = isset( $context->eligible_subtotal ) ? max( 0.0, (float) $context->eligible_subtotal ) : 0.0;
		if ( $rate <= 0 || $subtotal <= 0 ) {
			return $candidates;
		}

		$key = self::selection_key( (int) $profile['id'] );
		$candidates[ $key ] = array(
			'type'            => 'affiliate_code',
			'selection_key'   => $key,
			'affiliate_id'    => (int) $profile['id'],
			'affiliate_user_id'=> (int) $profile['user_id'],
			'code'            => (string) $result['code'],
			'label'           => sprintf( 'Código de afiliado %s (%s%%)', $result['code'], rtrim( rtrim( number_format( $rate * 100, 2, '.', '' ), '0' ), '.' ) ),
			'rate'            => $rate,
			'commission_rate' => Nakama_Affiliates_Domain::COMMISSION_RATE,
			'amount'          => round( $subtotal * $rate, 2, PHP_ROUND_HALF_UP ),
			'free_items'      => array(),
			'auto'            => false,
			'visible'         => false,
			'allow_modifiers' => false,
			'source'          => self::normalize_source( $session->get( self::SESSION_SOURCE, 'manual' ) ),
		);

		return $candidates;
	}

	/** Validate and select an affiliate primary entirely on the server. */
	public static function select_code( $raw_code, $source = 'manual' ) {
		$result = Nakama_Affiliates_Codes::resolve( $raw_code );
		if ( empty( $result['valid'] ) ) {
			self::clear_selection();
			return array( 'success' => false, 'message' => 'Código de afiliado no válido.' );
		}

		$session = self::session();
		if ( ! $session || ! class_exists( 'Nakama_Cart' ) ) {
			self::clear_selection();
			return array( 'success' => false, 'message' => 'No se pudo iniciar la selección del código.' );
		}

		$source = self::normalize_source( $source );
		$session->set( self::SESSION_CODE, $result['code'] );
		$session->set( self::SESSION_SOURCE, $source );
		Nakama_Cart::flush_plan();

		// The headless bridge rebuilds the WooCommerce cart immediately before
		// this method runs. Until totals are calculated, new cart rows can still
		// expose a zero line_subtotal, so the affiliate candidate is incorrectly
		// considered unavailable even though the code itself is valid.
		$cart = WC()->cart;
		if ( $cart && method_exists( $cart, 'calculate_totals' ) ) {
			$cart->calculate_totals();
		}

		$plan = Nakama_Cart::get_plan();
		$key = self::selection_key( (int) $result['profile']['id'] );
		$options = $plan && isset( $plan['options'] ) ? $plan['options'] : array();
		if ( ! Nakama_Cart::apply_selection( $key, $options ) ) {
			self::clear_selection();
			return array( 'success' => false, 'message' => 'El código ya no está disponible.' );
		}

		// Recalculate once more with the affiliate primary selected so the fee
		// is present on the first checkout render, not only after its next AJAX
		// order-review refresh.
		if ( $cart && method_exists( $cart, 'calculate_totals' ) ) {
			$cart->calculate_totals();
		}

		return array(
			'success'       => true,
			'code'          => $result['code'],
			'source'        => $source,
			'selection_key' => $key,
		);
	}

	/** A native coupon occupies the same mutually-exclusive slot. */
	public static function on_native_coupon_applied( $coupon_code = '' ) {
		self::clear_selection( false );
	}

	/** Selecting a different Nakama primary replaces the affiliate code. */
	public static function on_promotion_selected( $selection_key = '' ) {
		if ( 0 !== strpos( (string) $selection_key, self::KEY_PREFIX ) ) {
			self::clear_selection( false );
		}
	}

	public static function clear_selection( $clear_primary = true ) {
		$session = self::session();
		if ( ! $session ) {
			return;
		}

		$session->set( self::SESSION_CODE, '' );
		$session->set( self::SESSION_SOURCE, '' );
		if ( $clear_primary ) {
			$selected = (string) $session->get( 'nakama_selected_promo', '' );
			if ( 0 === strpos( $selected, self::KEY_PREFIX ) ) {
				$session->set( 'nakama_selected_promo', '' );
			}
		}
		if ( class_exists( 'Nakama_Cart' ) ) {
			Nakama_Cart::flush_plan();
		}
	}

	public static function selection_key( $affiliate_id ) {
		return self::KEY_PREFIX . max( 0, (int) $affiliate_id );
	}

	private static function normalize_source( $source ) {
		return 'referral' === $source ? 'referral' : 'manual';
	}

	private static function session() {
		if ( ! function_exists( 'WC' ) ) {
			return null;
		}
		$woocommerce = WC();
		return $woocommerce && isset( $woocommerce->session ) ? $woocommerce->session : null;
	}
}
