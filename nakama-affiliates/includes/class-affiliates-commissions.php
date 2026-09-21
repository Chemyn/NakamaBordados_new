<?php
/**
 * Idempotent paid-sale commission ledger.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Commissions {
	public static function init() {
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'record_paid_order' ), 20 );
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'record_paid_order' ), 20 );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'record_paid_order' ), 20 );
	}

	/** Insert one immutable sale event regardless of repeated Woo hooks. */
	public static function record_paid_order( $order_id ) {
		$order = function_exists( 'wc_get_order' ) ? wc_get_order( (int) $order_id ) : false;
		if ( ! $order ) {
			return array( 'created' => false, 'reason' => 'missing_order' );
		}
		if ( 'yes' === $order->get_meta( '_nakama_affiliate_benefit' ) ) {
			return array( 'created' => false, 'reason' => 'benefit' );
		}

		$affiliate_id = (int) $order->get_meta( '_nakama_affiliate_id' );
		if ( $affiliate_id <= 0 ) {
			return array( 'created' => false, 'reason' => 'no_attribution' );
		}
		if ( ! self::is_paid( $order ) ) {
			return array( 'created' => false, 'reason' => 'unpaid' );
		}

		$event_key = 'sale:' . (int) $order->get_id();
		$existing  = Nakama_Affiliates_Repository::ledger_by_event_key( $event_key );
		if ( $existing ) {
			return array( 'created' => false, 'reason' => 'duplicate', 'event' => $existing );
		}

		$currency   = strtoupper( (string) $order->get_meta( '_nakama_affiliate_order_currency' ) );
		$source_base = Nakama_Affiliates_Domain::money( $order->get_meta( '_nakama_affiliate_eligible_subtotal' ) );
		$rate        = (float) $order->get_meta( '_nakama_affiliate_rate_to_mxn' );
		$conversion  = $rate > 0
			? array( 'available' => true, 'rate' => $rate, 'source' => 'order_snapshot' )
			: Nakama_Affiliates_Currency::rate_to_mxn( $currency );

		$status        = 'posted';
		$review_reason = '';
		$base_mxn      = 0.0;
		$commission    = 0.0;
		if ( empty( $conversion['available'] ) ) {
			$rate          = 0.0;
			$status        = 'review';
			$review_reason = 'No existe un tipo de cambio confiable para convertir la venta a MXN.';
		} else {
			$rate       = (float) $conversion['rate'];
			$base_mxn   = Nakama_Affiliates_Domain::money( $source_base * $rate );
			$commission = Nakama_Affiliates_Domain::commission( $base_mxn );
			$order->update_meta_data( '_nakama_affiliate_rate_to_mxn', $rate );
			$order->update_meta_data( '_nakama_affiliate_base_mxn', $base_mxn );
			if ( method_exists( $order, 'save' ) ) {
				$order->save();
			}
		}

		$paid_at  = method_exists( $order, 'get_date_paid' ) ? $order->get_date_paid() : null;
		$instant  = $paid_at instanceof DateTimeInterface ? $paid_at : new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) );
		$timezone = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( 'UTC' );
		$result = Nakama_Affiliates_Repository::insert_ledger_event( array(
			'affiliate_id'       => $affiliate_id,
			'event_key'          => $event_key,
			'event_type'         => 'sale',
			'order_id'           => (int) $order->get_id(),
			'refund_id'          => 0,
			'original_event_id'  => 0,
			'closure_id'         => 0,
			'period_key'         => Nakama_Affiliates_Domain::period_key( $instant, $timezone ),
			'source_currency'    => $currency,
			'source_base'        => $source_base,
			'rate_to_mxn'        => $rate,
			'base_mxn'           => $base_mxn,
			'commission_mxn'     => $commission,
			'status'             => $status,
			'review_reason'      => $review_reason,
			'occurred_at_gmt'    => gmdate( 'Y-m-d H:i:s', $instant->getTimestamp() ),
		) );

		if ( ! empty( $result['created'] ) ) {
			$order->update_meta_data( '_nakama_affiliate_sale_event_id', (int) $result['id'] );
			if ( method_exists( $order, 'save' ) ) {
				$order->save();
			}
		}
		return $result;
	}

	private static function is_paid( $order ) {
		if ( method_exists( $order, 'is_paid' ) && $order->is_paid() ) {
			return true;
		}
		$paid_statuses = function_exists( 'wc_get_is_paid_statuses' )
			? wc_get_is_paid_statuses()
			: array( 'processing', 'completed' );
		return method_exists( $order, 'get_status' )
			&& in_array( $order->get_status(), $paid_statuses, true );
	}
}
