<?php
/**
 * Immutable refund and post-payment reversal accounting.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Refunds {
	const LOCKED_CLOSURE_STATUSES = array( 'closed', 'approved', 'paid' );

	public static function init() {
		add_action( 'woocommerce_refund_created', array( __CLASS__, 'record_refund' ), 20 );
		add_action( 'woocommerce_order_refunded', array( __CLASS__, 'record_order_refund' ), 20, 2 );
		add_action( 'woocommerce_order_status_refunded', array( __CLASS__, 'reconcile_order_refunds' ), 20 );
		add_action( 'woocommerce_order_status_cancelled', array( __CLASS__, 'record_order_reversal' ), 20 );
		add_action( 'woocommerce_order_status_failed', array( __CLASS__, 'record_order_reversal' ), 20 );
		add_action( 'woocommerce_order_status_chargeback', array( __CLASS__, 'record_order_reversal' ), 20 );
	}

	public static function record_order_refund( $order_id, $refund_id ) {
		return self::record_refund( $refund_id );
	}

	/** Record a Woo refund only from reconstructable product line detail. */
	public static function record_refund( $refund_or_id ) {
		$refund = is_object( $refund_or_id )
			? $refund_or_id
			: ( function_exists( 'wc_get_order' ) ? wc_get_order( (int) $refund_or_id ) : false );
		if ( ! $refund || ! method_exists( $refund, 'get_parent_id' ) ) {
			return array( 'created' => false, 'reason' => 'missing_refund' );
		}

		$refund_id = (int) $refund->get_id();
		$event_key = 'refund:' . $refund_id;
		$existing  = Nakama_Affiliates_Repository::ledger_by_event_key( $event_key );
		if ( $existing ) {
			return array( 'created' => false, 'reason' => 'duplicate', 'event' => $existing );
		}

		$order_id = (int) $refund->get_parent_id();
		$order    = function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : false;
		$sale     = Nakama_Affiliates_Repository::ledger_by_event_key(
			Nakama_Affiliates_Commissions::sale_event_key( $order_id )
		);
		if ( ! $order || ! $sale ) {
			return array( 'created' => false, 'reason' => 'missing_sale' );
		}

		$detail = self::refunded_source_base( $order, $refund );
		if ( $detail['shipping_only'] ) {
			return array( 'created' => false, 'reason' => 'shipping_only' );
		}

		$remaining = self::remaining_source_base( $order_id, $sale );
		if ( $remaining <= 0 ) {
			return array( 'created' => false, 'reason' => 'fully_reversed' );
		}

		$source_base  = 0.0;
		$base_mxn     = 0.0;
		$commission   = 0.0;
		$status       = 'posted';
		$review_reason = '';
		if ( ! $detail['has_detail'] ) {
			$status        = 'review';
			$review_reason = 'El reembolso monetario no incluye líneas suficientes para calcular la base antes del descuento.';
		} else {
			$source_base = - Nakama_Affiliates_Domain::money( min( $remaining, $detail['base'] ) );
			$rate = (float) ( $sale['rate_to_mxn'] ?? 0 );
			if ( $rate <= 0 ) {
				$status        = 'review';
				$review_reason = 'La venta original no tiene un tipo de cambio MXN confirmado.';
			} else {
				$base_mxn   = - Nakama_Affiliates_Domain::money( abs( $source_base ) * $rate );
				$commission = - Nakama_Affiliates_Domain::commission( abs( $base_mxn ) );
			}
		}

		$occurred = self::refund_instant( $refund );
		$result = Nakama_Affiliates_Repository::insert_ledger_event( array(
			'affiliate_id'      => (int) $sale['affiliate_id'],
			'event_key'         => $event_key,
			'event_type'        => 'refund',
			'order_id'          => $order_id,
			'refund_id'         => $refund_id,
			'original_event_id' => (int) $sale['id'],
			'closure_id'        => 0,
			'period_key'        => self::adjustment_period( $sale, $occurred ),
			'source_currency'   => (string) $sale['source_currency'],
			'source_base'       => $source_base,
			'rate_to_mxn'       => (float) ( $sale['rate_to_mxn'] ?? 0 ),
			'base_mxn'          => $base_mxn,
			'commission_mxn'    => $commission,
			'status'            => $status,
			'review_reason'     => $review_reason,
			'occurred_at_gmt'   => gmdate( 'Y-m-d H:i:s', $occurred->getTimestamp() ),
		) );

		if ( 'review' === $status && method_exists( 'Nakama_Affiliates_Repository', 'audit' ) ) {
			Nakama_Affiliates_Repository::audit( 'refund_review_required', 'refund', $refund_id, $review_reason, 0 );
		}
		return $result;
	}

	/** Reconcile all refunds, useful after missed webhooks. */
	public static function reconcile_order_refunds( $order_id ) {
		$order = function_exists( 'wc_get_order' ) ? wc_get_order( (int) $order_id ) : false;
		if ( ! $order || ! method_exists( $order, 'get_refunds' ) ) {
			return array();
		}

		$results = array();
		foreach ( $order->get_refunds() as $refund ) {
			$results[] = self::record_refund( $refund );
		}
		return $results;
	}

	/** Reverse the still-attributable balance after a cancellation/chargeback. */
	public static function record_order_reversal( $order_id ) {
		$order = function_exists( 'wc_get_order' ) ? wc_get_order( (int) $order_id ) : false;
		$sale  = Nakama_Affiliates_Repository::ledger_by_event_key(
			Nakama_Affiliates_Commissions::sale_event_key( $order_id )
		);
		if ( ! $order || ! $sale ) {
			return array( 'created' => false, 'reason' => 'missing_sale' );
		}

		$status    = method_exists( $order, 'get_status' ) ? (string) $order->get_status() : 'reversal';
		$event_key = 'reversal:' . (int) $order_id . ':' . $status;
		$existing  = Nakama_Affiliates_Repository::ledger_by_event_key( $event_key );
		if ( $existing ) {
			return array( 'created' => false, 'reason' => 'duplicate', 'event' => $existing );
		}

		$remaining = self::remaining_source_base( $order_id, $sale );
		if ( $remaining <= 0 ) {
			return array( 'created' => false, 'reason' => 'fully_reversed' );
		}

		$rate          = (float) ( $sale['rate_to_mxn'] ?? 0 );
		$source_base   = - Nakama_Affiliates_Domain::money( $remaining );
		$base_mxn      = $rate > 0 ? - Nakama_Affiliates_Domain::money( $remaining * $rate ) : 0.0;
		$commission    = $rate > 0 ? - Nakama_Affiliates_Domain::commission( abs( $base_mxn ) ) : 0.0;
		$ledger_status = $rate > 0 ? 'posted' : 'review';
		$reason        = $rate > 0 ? '' : 'La venta original no tiene un tipo de cambio MXN confirmado.';
		$occurred      = new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) );

		return Nakama_Affiliates_Repository::insert_ledger_event( array(
			'affiliate_id'      => (int) $sale['affiliate_id'],
			'event_key'         => $event_key,
			'event_type'        => 'reversal',
			'order_id'          => (int) $order_id,
			'refund_id'         => 0,
			'original_event_id' => (int) $sale['id'],
			'closure_id'        => 0,
			'period_key'        => self::adjustment_period( $sale, $occurred ),
			'source_currency'   => (string) $sale['source_currency'],
			'source_base'       => $source_base,
			'rate_to_mxn'       => $rate,
			'base_mxn'          => $base_mxn,
			'commission_mxn'    => $commission,
			'status'            => $ledger_status,
			'review_reason'     => $reason,
			'occurred_at_gmt'   => gmdate( 'Y-m-d H:i:s', $occurred->getTimestamp() ),
		) );
	}

	private static function refunded_source_base( $order, $refund ) {
		$lines = method_exists( $refund, 'get_items' ) ? $refund->get_items( 'line_item' ) : array();
		if ( empty( $lines ) ) {
			$shipping = method_exists( $refund, 'get_items' ) ? $refund->get_items( 'shipping' ) : array();
			return array(
				'has_detail'   => false,
				'shipping_only' => ! empty( $shipping ),
				'base'          => 0.0,
			);
		}

		$base = 0.0;
		foreach ( $lines as $line ) {
			$original_id = method_exists( $line, 'get_meta' ) ? (int) $line->get_meta( '_refunded_item_id' ) : 0;
			$original    = $original_id > 0 && method_exists( $order, 'get_item' ) ? $order->get_item( $original_id ) : false;
			if ( $original && method_exists( $original, 'get_quantity' ) && method_exists( $original, 'get_subtotal' ) ) {
				$original_qty = abs( (int) $original->get_quantity() );
				$refund_qty   = method_exists( $line, 'get_quantity' ) ? abs( (int) $line->get_quantity() ) : 0;
				if ( $original_qty > 0 && $refund_qty > 0 ) {
					$base += min( 1.0, $refund_qty / $original_qty ) * abs( (float) $original->get_subtotal() );
					continue;
				}
			}
			if ( method_exists( $line, 'get_subtotal' ) ) {
				$base += abs( (float) $line->get_subtotal() );
			}
		}

		return array(
			'has_detail'   => $base > 0,
			'shipping_only' => false,
			'base'          => Nakama_Affiliates_Domain::money( $base ),
		);
	}

	private static function remaining_source_base( $order_id, $sale ) {
		$remaining = max( 0.0, (float) ( $sale['source_base'] ?? 0 ) );
		foreach ( Nakama_Affiliates_Repository::ledger_events_for_order( $order_id ) as $event ) {
			if ( ! in_array( $event['event_type'] ?? '', array( 'refund', 'reversal' ), true ) ) {
				continue;
			}
			if ( 'posted' !== ( $event['status'] ?? '' ) ) {
				continue;
			}
			$remaining += min( 0.0, (float) ( $event['source_base'] ?? 0 ) );
		}
		return max( 0.0, Nakama_Affiliates_Domain::money( $remaining ) );
	}

	private static function adjustment_period( $sale, DateTimeInterface $occurred ) {
		$original     = (string) $sale['period_key'];
		$affiliate_id = (int) $sale['affiliate_id'];
		$closure      = Nakama_Affiliates_Repository::closure_by_affiliate_period( $affiliate_id, $original );
		$locked       = ! empty( $sale['closure_id'] )
			|| ( $closure && in_array( $closure['status'] ?? '', self::LOCKED_CLOSURE_STATUSES, true ) );
		if ( ! $locked ) {
			return $original;
		}

		$timezone = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( 'UTC' );
		$current  = Nakama_Affiliates_Domain::period_key( $occurred, $timezone );
		$period   = max( self::next_period( $original ), $current );
		for ( $attempt = 0; $attempt < 60; $attempt++ ) {
			$candidate = Nakama_Affiliates_Repository::closure_by_affiliate_period( $affiliate_id, $period );
			if ( ! $candidate || ! in_array( $candidate['status'] ?? '', self::LOCKED_CLOSURE_STATUSES, true ) ) {
				return $period;
			}
			$period = self::next_period( $period );
		}
		return $period;
	}

	private static function next_period( $period ) {
		$date = DateTimeImmutable::createFromFormat( '!Y-m', (string) $period, new DateTimeZone( 'UTC' ) );
		return $date ? $date->modify( '+1 month' )->format( 'Y-m' ) : gmdate( 'Y-m' );
	}

	private static function refund_instant( $refund ) {
		$date = method_exists( $refund, 'get_date_created' ) ? $refund->get_date_created() : null;
		return $date instanceof DateTimeInterface
			? $date
			: new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) );
	}
}
