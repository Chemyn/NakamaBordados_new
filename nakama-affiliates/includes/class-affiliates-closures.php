<?php
/**
 * Auditable monthly closure state machine.
 *
 * Tax withholdings are stored only as administrator-provided amounts. This
 * class never derives a tax rate or presents fiscal advice.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Closures {
	const STATES = array( 'draft', 'closed', 'approved', 'paid' );

	/** Read the current closeable ledger without mutating it. */
	public static function preview( $affiliate_id, $period_key ) {
		if ( ! self::valid_identity( $affiliate_id, $period_key ) ) {
			return self::failure( 'invalid_period' );
		}

		$events = Nakama_Affiliates_Repository::closure_candidate_events( (int) $affiliate_id, (string) $period_key );
		return self::summarize( is_array( $events ) ? $events : array() );
	}

	/** Close a month only after a second, explicit confirmation. */
	public static function confirm( $affiliate_id, $period_key, $confirmed, $actor_user_id ) {
		if ( ! $confirmed ) {
			return self::failure( 'confirmation_required' );
		}
		if ( ! self::valid_identity( $affiliate_id, $period_key ) || (int) $actor_user_id <= 0 ) {
			return self::failure( 'invalid_request' );
		}

		$existing = Nakama_Affiliates_Repository::closure_by_affiliate_period( (int) $affiliate_id, (string) $period_key );
		if ( $existing ) {
			if ( 'draft' !== ( $existing['status'] ?? '' ) ) {
				return self::failure( 'already_closed', array( 'closure' => $existing ) );
			}
			$now = Nakama_Affiliates_Repository::now_gmt();
			Nakama_Affiliates_Repository::update_closure( (int) $existing['id'], array(
				'status'        => 'closed',
				'closed_at_gmt' => $now,
				'updated_at_gmt'=> $now,
			) );
			self::audit( 'closure_closed', (int) $existing['id'], 'Cierre reconfirmado después de una reapertura excepcional.', $actor_user_id );
			return self::success( Nakama_Affiliates_Repository::closure_by_id( (int) $existing['id'] ) );
		}

		$preview = self::preview( $affiliate_id, $period_key );
		if ( ! empty( $preview['review_count'] ) ) {
			return self::failure( 'review_pending', array( 'preview' => $preview ) );
		}

		$now = Nakama_Affiliates_Repository::now_gmt();
		$data = array(
			'affiliate_id'          => (int) $affiliate_id,
			'period_key'            => (string) $period_key,
			'status'                => 'closed',
			'sales_mxn'             => $preview['sales_mxn'],
			'refunds_mxn'           => $preview['refunds_mxn'],
			'adjustments_mxn'       => $preview['adjustments_mxn'],
			'commission_gross_mxn'  => $preview['commission_gross_mxn'],
			'isr_withheld_mxn'      => 0.0,
			'iva_withheld_mxn'      => 0.0,
			'other_adjustments_mxn' => 0.0,
			'net_mxn'               => $preview['commission_gross_mxn'],
			'adjustment_reason'     => '',
			'approved_by'           => 0,
			'closed_at_gmt'         => $now,
			'approved_at_gmt'       => null,
			'paid_at_gmt'           => null,
			'payment_reference'     => '',
			'payment_document_id'   => 0,
			'created_at_gmt'        => $now,
			'updated_at_gmt'        => $now,
		);
		$closure_id = Nakama_Affiliates_Repository::create_closure_with_events( $data, $preview['event_ids'] );
		if ( $closure_id <= 0 ) {
			$race = Nakama_Affiliates_Repository::closure_by_affiliate_period( (int) $affiliate_id, (string) $period_key );
			return self::failure( $race ? 'already_closed' : 'close_failed', array( 'closure' => $race ) );
		}

		self::audit( 'closure_preview_confirmed', $closure_id, self::encode( $preview ), $actor_user_id );
		self::audit( 'closure_closed', $closure_id, 'Periodo cerrado con movimientos congelados.', $actor_user_id );
		return self::success( Nakama_Affiliates_Repository::closure_by_id( $closure_id ) );
	}

	/** Store accountant-provided amounts; no percentage or tax logic is applied. */
	public static function set_manual_amounts( $closure_id, $isr_mxn, $iva_mxn, $other_mxn, $reason, $actor_user_id ) {
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) {
			return self::failure( 'not_found' );
		}
		if ( ! in_array( $closure['status'] ?? '', array( 'draft', 'closed' ), true ) ) {
			return self::failure( 'locked', array( 'closure' => $closure ) );
		}
		if ( ! is_numeric( $isr_mxn ) || ! is_numeric( $iva_mxn ) || ! is_numeric( $other_mxn ) || (float) $isr_mxn < 0 || (float) $iva_mxn < 0 ) {
			return self::failure( 'invalid_amount' );
		}

		$reason = trim( (string) $reason );
		if ( '' === $reason ) {
			return self::failure( 'reason_required' );
		}
		if ( (int) $actor_user_id <= 0 ) {
			return self::failure( 'actor_required' );
		}

		$isr   = Nakama_Affiliates_Domain::money( $isr_mxn );
		$iva   = Nakama_Affiliates_Domain::money( $iva_mxn );
		$other = Nakama_Affiliates_Domain::money( $other_mxn );
		$gross = Nakama_Affiliates_Domain::money( $closure['commission_gross_mxn'] ?? 0 );
		$net   = Nakama_Affiliates_Domain::money( $gross - $isr - $iva + $other );
		$now   = Nakama_Affiliates_Repository::now_gmt();

		$updated = Nakama_Affiliates_Repository::update_closure( (int) $closure_id, array(
			'isr_withheld_mxn'      => $isr,
			'iva_withheld_mxn'      => $iva,
			'other_adjustments_mxn' => $other,
			'net_mxn'               => $net,
			'adjustment_reason'     => $reason,
			'updated_at_gmt'        => $now,
		) );
		if ( ! $updated ) {
			return self::failure( 'update_failed' );
		}

		self::audit( 'closure_manual_amounts_updated', (int) $closure_id, self::encode( array(
			'isr_mxn' => $isr,
			'iva_mxn' => $iva,
			'other_mxn' => $other,
			'net_mxn' => $net,
			'reason' => $reason,
		) ), $actor_user_id );
		return self::success( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) );
	}

	public static function approve( $closure_id, $confirmed, $actor_user_id ) {
		if ( ! $confirmed ) {
			return self::failure( 'confirmation_required' );
		}
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) {
			return self::failure( 'not_found' );
		}
		if ( 'closed' !== ( $closure['status'] ?? '' ) ) {
			return self::failure( 'invalid_transition', array( 'closure' => $closure ) );
		}
		if ( '' === trim( (string) ( $closure['adjustment_reason'] ?? '' ) ) ) {
			return self::failure( 'manual_review_required' );
		}
		if ( (int) $actor_user_id <= 0 ) {
			return self::failure( 'actor_required' );
		}

		$now = Nakama_Affiliates_Repository::now_gmt();
		Nakama_Affiliates_Repository::update_closure( (int) $closure_id, array(
			'status'          => 'approved',
			'approved_by'     => (int) $actor_user_id,
			'approved_at_gmt' => $now,
			'updated_at_gmt'  => $now,
		) );
		self::audit( 'closure_approved', (int) $closure_id, 'Cierre aprobado después de la revisión manual.', $actor_user_id );
		return self::success( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) );
	}

	/** Payment service entry point. Evidence validation is added by the payment domain. */
	public static function mark_paid( $closure_id, array $payment, $actor_user_id ) {
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) {
			return self::failure( 'not_found' );
		}
		if ( 'approved' !== ( $closure['status'] ?? '' ) ) {
			return self::failure( 'not_approved', array( 'closure' => $closure ) );
		}

		$reference  = trim( (string) ( $payment['reference'] ?? '' ) );
		$paid_at    = trim( (string) ( $payment['paid_at_gmt'] ?? '' ) );
		$document_id = (int) ( $payment['document_id'] ?? 0 );
		if ( '' === $reference || '' === $paid_at || $document_id <= 0 || (int) $actor_user_id <= 0 ) {
			return self::failure( 'payment_data_required' );
		}

		Nakama_Affiliates_Repository::update_closure( (int) $closure_id, array(
			'status'              => 'paid',
			'paid_at_gmt'         => $paid_at,
			'payment_reference'   => $reference,
			'payment_document_id' => $document_id,
			'paid_net_mxn'        => Nakama_Affiliates_Domain::money( $closure['net_mxn'] ?? 0 ),
			'updated_at_gmt'      => Nakama_Affiliates_Repository::now_gmt(),
		) );
		self::audit( 'closure_paid', (int) $closure_id, 'Pago de comisión registrado con comprobante privado.', $actor_user_id );
		return self::success( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) );
	}

	public static function reopen( $closure_id, $reason, $actor_user_id ) {
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		$reason  = trim( (string) $reason );
		if ( ! $closure ) return self::failure( 'not_found' );
		if ( 'paid' === ( $closure['status'] ?? '' ) ) return self::failure( 'locked', array( 'closure' => $closure ) );
		if ( ! in_array( $closure['status'] ?? '', array( 'closed', 'approved' ), true ) ) return self::failure( 'invalid_transition' );
		if ( '' === $reason || (int) $actor_user_id <= 0 ) return self::failure( 'reason_required' );

		Nakama_Affiliates_Repository::update_closure( (int) $closure_id, array(
			'status'          => 'draft',
			'approved_by'     => 0,
			'approved_at_gmt' => null,
			'updated_at_gmt'  => Nakama_Affiliates_Repository::now_gmt(),
		) );
		self::audit( 'closure_reopened', (int) $closure_id, $reason, $actor_user_id );
		return self::success( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) );
	}

	private static function summarize( array $events ) {
		$summary = array(
			'sales_count' => 0,
			'refund_count' => 0,
			'adjustment_count' => 0,
			'review_count' => 0,
			'sales_mxn' => 0.0,
			'refunds_mxn' => 0.0,
			'adjustments_mxn' => 0.0,
			'commission_gross_mxn' => 0.0,
			'valid_sales_mxn' => 0.0,
			'event_ids' => array(),
		);

		foreach ( $events as $event ) {
			if ( 'posted' !== ( $event['status'] ?? '' ) ) {
				$summary['review_count']++;
				continue;
			}
			$base = Nakama_Affiliates_Domain::money( $event['base_mxn'] ?? 0 );
			$type = (string) ( $event['event_type'] ?? 'adjustment' );
			if ( 'sale' === $type ) {
				$summary['sales_count']++;
				$summary['sales_mxn'] += $base;
			} elseif ( in_array( $type, array( 'refund', 'reversal' ), true ) ) {
				$summary['refund_count']++;
				$summary['refunds_mxn'] += $base;
			} else {
				$summary['adjustment_count']++;
				$summary['adjustments_mxn'] += $base;
			}
			$summary['commission_gross_mxn'] += Nakama_Affiliates_Domain::money( $event['commission_mxn'] ?? 0 );
			$summary['event_ids'][] = (int) $event['id'];
		}

		foreach ( array( 'sales_mxn', 'refunds_mxn', 'adjustments_mxn', 'commission_gross_mxn' ) as $key ) {
			$summary[ $key ] = Nakama_Affiliates_Domain::money( $summary[ $key ] );
		}
		$summary['valid_sales_mxn'] = Nakama_Affiliates_Domain::money(
			$summary['sales_mxn'] + $summary['refunds_mxn'] + $summary['adjustments_mxn']
		);
		return $summary;
	}

	private static function valid_identity( $affiliate_id, $period_key ) {
		return (int) $affiliate_id > 0 && 1 === preg_match( '/^\d{4}-(0[1-9]|1[0-2])$/', (string) $period_key );
	}

	private static function audit( $action, $closure_id, $description, $actor_user_id ) {
		Nakama_Affiliates_Repository::audit( $action, 'closure', (int) $closure_id, (string) $description, (int) $actor_user_id );
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function success( $closure ) {
		return array( 'success' => true, 'closure' => $closure );
	}

	private static function failure( $reason, array $extra = array() ) {
		return array_merge( array( 'success' => false, 'reason' => (string) $reason ), $extra );
	}
}
