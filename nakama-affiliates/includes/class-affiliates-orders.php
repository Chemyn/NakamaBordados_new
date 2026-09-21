<?php
/**
 * Immutable affiliate attribution snapshot on WooCommerce orders.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Orders {
	public static function init() {
		add_action( 'nakama_discounts_order_plan_saved', array( __CLASS__, 'snapshot_from_plan' ), 20, 3 );
	}

	/** Sum product line subtotals before discounts and taxes. */
	public static function eligible_subtotal( $order ) {
		if ( ! $order || ! method_exists( $order, 'get_items' ) ) {
			return 0.0;
		}

		$total = 0.0;
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			if ( method_exists( $item, 'get_meta' ) && 'yes' === $item->get_meta( '_nakama_affiliate_benefit' ) ) {
				continue;
			}
			if ( method_exists( $item, 'get_subtotal' ) ) {
				$total += max( 0.0, (float) $item->get_subtotal() );
			}
		}

		return Nakama_Affiliates_Domain::money( $total );
	}

	/** Persist only a server-resolved affiliate primary. */
	public static function snapshot_from_plan( $order, $plan, $data = array() ) {
		if ( ! $order || 'yes' === $order->get_meta( '_nakama_affiliate_benefit' ) ) {
			return false;
		}

		$primary = is_array( $plan ) && isset( $plan['primary'] ) && is_array( $plan['primary'] )
			? $plan['primary']
			: array();
		if ( 'affiliate_code' !== ( $primary['type'] ?? '' ) ) {
			return false;
		}

		$affiliate_id = isset( $primary['affiliate_id'] ) ? (int) $primary['affiliate_id'] : 0;
		$user_id      = isset( $primary['affiliate_user_id'] ) ? (int) $primary['affiliate_user_id'] : 0;
		$code         = isset( $primary['code'] ) ? strtoupper( trim( (string) $primary['code'] ) ) : '';
		$base         = self::eligible_subtotal( $order );
		if ( $affiliate_id <= 0 || $user_id <= 0 || '' === $code || $base <= 0 ) {
			return false;
		}

		$currency = strtoupper( (string) $order->get_currency() );
		$is_mxn   = 'MXN' === $currency;
		$order->update_meta_data( '_nakama_affiliate_id', $affiliate_id );
		$order->update_meta_data( '_nakama_affiliate_user_id', $user_id );
		$order->update_meta_data( '_nakama_affiliate_code', $code );
		$order->update_meta_data(
			'_nakama_affiliate_discount_rate',
			Nakama_Affiliates_Domain::bounded_rate( $primary['rate'] ?? 0, Nakama_Affiliates_Domain::MAX_DISCOUNT_RATE )
		);
		$order->update_meta_data( '_nakama_affiliate_commission_rate', Nakama_Affiliates_Domain::COMMISSION_RATE );
		$order->update_meta_data( '_nakama_affiliate_eligible_subtotal', $base );
		$order->update_meta_data( '_nakama_affiliate_order_currency', $currency );
		$order->update_meta_data( '_nakama_affiliate_rate_to_mxn', $is_mxn ? 1.0 : 0.0 );
		$order->update_meta_data( '_nakama_affiliate_base_mxn', $is_mxn ? $base : 0.0 );
		$order->update_meta_data( '_nakama_affiliate_attributed_at', gmdate( 'Y-m-d H:i:s' ) );
		$order->update_meta_data( '_nakama_affiliate_source', 'referral' === ( $primary['source'] ?? '' ) ? 'referral' : 'manual' );
		return true;
	}
}
