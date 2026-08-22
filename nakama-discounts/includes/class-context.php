<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * "Snapshot" del estado necesario para calcular descuentos.
 * El motor (Nakama_Engine) solo lee de aquí; no toca WooCommerce directamente.
 */
class Nakama_Context {
	const EXCLUDED_CATEGORY = 'lisas';

	public $customer_id   = 0;
	public $email         = '';
	public $subtotal      = 0.0;   // subtotal completo, sin cupones ni fees
	public $eligible_subtotal = 0.0; // subtotal que puede recibir beneficios
	public $payment_method = '';   // gateway elegido en checkout
	public $selected_promo = '';   // 'welcome' | 'special_10' | 'special_3x2' | ''
	public $cart          = null;

	// Ítems que califican para 3x2 (precio unitario expandido por cantidad).
	public $threexthree_prices = array();

	public static function build( $cart ) {
		$ctx = new self();
		$ctx->cart          = $cart;
		$ctx->customer_id   = get_current_user_id();
		$ctx->subtotal      = (float) $cart->get_subtotal(); // sin cupones/fees
		$ctx->eligible_subtotal = $ctx->collect_eligible_subtotal( $cart );
		$ctx->email         = $ctx->resolve_email();
		$ctx->payment_method = $ctx->resolve_payment_method();
		$ctx->selected_promo = (string) WC()->session->get( 'nakama_selected_promo', '' );
		$ctx->threexthree_prices = $ctx->collect_3x2_prices( $cart );
		return $ctx;
	}

	/** Subtotal sin productos asignados directamente a la categoria excluida. */
	private function collect_eligible_subtotal( $cart ) {
		$subtotal = 0.0;

		foreach ( $cart->get_cart() as $item ) {
			$product_id = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
			if ( $this->is_excluded_product( $product_id ) ) {
				continue;
			}

			$subtotal += isset( $item['line_subtotal'] )
				? (float) $item['line_subtotal']
				: (float) $item['data']->get_price() * (int) $item['quantity'];
		}

		return max( 0, $subtotal );
	}

	/** La exclusion es solo por asignacion directa del slug, no por descendencia. */
	private function is_excluded_product( $product_id ) {
		return $product_id > 0
			&& has_term( self::EXCLUDED_CATEGORY, 'product_cat', $product_id );
	}

	private function resolve_email() {
		if ( $this->customer_id ) {
			$u = get_userdata( $this->customer_id );
			return $u ? $u->user_email : '';
		}
		// Invitado: email tecleado en checkout.
		if ( WC()->customer ) {
			return WC()->customer->get_billing_email();
		}
		return '';
	}

	private function resolve_payment_method() {
		// En AJAX de checkout llega por POST; si no, lo guardado en sesión.
		if ( isset( $_POST['payment_method'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return sanitize_text_field( wp_unslash( $_POST['payment_method'] ) );
		}
		$chosen = WC()->session ? WC()->session->get( 'chosen_payment_method' ) : '';
		return $chosen ? $chosen : '';
	}

	/**
	 * Junta los precios unitarios de TODOS los ítems que pertenecen a alguna de
	 * las categorías habilitadas para 3x2, en una sola lista COMBINADA
	 * (bordados + gorras cuentan juntos, no por separado).
	 * @return array  lista plana de precios unitarios, ej. [199,199,150]
	 */
	private function collect_3x2_prices( $cart ) {
		$cats = (array) Nakama_Settings::get( 'special_3x2_categories', array() );
		if ( empty( $cats ) ) {
			return array();
		}

		$prices = array();

		foreach ( $cart->get_cart() as $item ) {
			$product_id = $item['product_id'];
			if ( $this->is_excluded_product( $product_id ) ) {
				continue;
			}

			$qty        = (int) $item['quantity'];
			$unit_price = (float) $item['data']->get_price(); // precio unitario actual

			// ¿Pertenece a AL MENOS una de las categorías 3x2?
			$qualifies = false;
			foreach ( $cats as $slug ) {
				if ( has_term( $slug, 'product_cat', $product_id ) ) {
					$qualifies = true;
					break;
				}
			}

			if ( $qualifies ) {
				// Expandir por cantidad: cada unidad va a la bolsa combinada.
				for ( $i = 0; $i < $qty; $i++ ) {
					$prices[] = $unit_price;
				}
			}
		}

		return $prices;
	}
}
