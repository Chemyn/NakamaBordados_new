<?php
/**
 * Explicit, idempotent migration for the retired apoyo_creador_* metadata.
 *
 * Legacy values represent commission amounts only. They never establish a
 * sales base, order attribution or monthly garment progress.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Legacy_Migration {
	const META_PATTERN = '/^apoyo_creador_(\d{4})_(0[1-9]|1[0-2])$/';

	/** Read exact monthly metadata without changing it or the affiliate ledger. */
	public static function preview( $user_id, $meta_loader = null ) {
		if ( ! self::admin_allowed() ) return self::failure( 'forbidden' );
		$user_id = (int) $user_id;
		if ( $user_id <= 0 ) return self::failure( 'user_required' );

		$profile = Nakama_Affiliates_Repository::profile_by_user( $user_id );
		if ( ! $profile ) return self::failure( 'profile_required' );
		$metadata = is_callable( $meta_loader )
			? call_user_func( $meta_loader, $user_id )
			: ( function_exists( 'get_user_meta' ) ? get_user_meta( $user_id ) : array() );
		$metadata = is_array( $metadata ) ? $metadata : array();

		$items = array();
		foreach ( $metadata as $meta_key => $values ) {
			if ( 1 !== preg_match( self::META_PATTERN, (string) $meta_key, $matches ) ) continue;
			$value = is_array( $values ) ? reset( $values ) : $values;
			$value = is_scalar( $value ) ? trim( (string) $value ) : '';
			if ( '' === $value || ! is_numeric( $value ) || (float) $value <= 0 ) continue;

			$period = $matches[1] . '-' . $matches[2];
			$event_key = self::event_key( (int) $profile['id'], $period );
			$existing = Nakama_Affiliates_Repository::ledger_by_event_key( $event_key );
			$closure = Nakama_Affiliates_Repository::closure_by_affiliate_period( (int) $profile['id'], $period );
			$items[] = array(
				'meta_key'       => (string) $meta_key,
				'period'         => $period,
				'commission_mxn' => self::money( $value ),
				'status'         => $existing ? 'already_imported' : ( $closure ? 'period_closed' : 'importable' ),
				'event_key'      => $event_key,
			);
		}
		usort( $items, static function ( $left, $right ) {
			return strcmp( $left['period'], $right['period'] );
		} );

		return array(
			'success'      => true,
			'user_id'      => $user_id,
			'affiliate_id' => (int) $profile['id'],
			'importable'   => count( array_filter( $items, static function ( $item ) { return 'importable' === $item['status']; } ) ),
			'skipped'      => count( array_filter( $items, static function ( $item ) { return 'importable' !== $item['status']; } ) ),
			'items'        => $items,
		);
	}

	/** Import only after confirmation, retaining the source metadata untouched. */
	public static function migrate( $user_id, $confirmed, $actor_user_id ) {
		if ( ! self::admin_allowed() ) return self::failure( 'forbidden' );
		if ( ! $confirmed ) return self::failure( 'confirmation_required' );
		if ( (int) $actor_user_id <= 0 ) return self::failure( 'actor_required' );

		$preview = self::preview( (int) $user_id );
		if ( empty( $preview['success'] ) ) return $preview;
		$imported = 0;
		$skipped = 0;
		foreach ( $preview['items'] as $item ) {
			if ( 'importable' !== $item['status'] ) {
				$skipped++;
				continue;
			}
			$result = Nakama_Affiliates_Repository::insert_ledger_event( array(
				'affiliate_id'     => (int) $preview['affiliate_id'],
				'event_key'       => (string) $item['event_key'],
				'event_type'      => 'legacy_commission',
				'order_id'        => 0,
				'refund_id'       => 0,
				'original_event_id'=> 0,
				'closure_id'      => 0,
				'period_key'      => (string) $item['period'],
				'source_currency' => 'MXN',
				'source_base'     => 0.0,
				'rate_to_mxn'     => 1.0,
				'base_mxn'        => 0.0,
				'commission_mxn'  => (float) $item['commission_mxn'],
				'status'          => 'posted',
				'review_reason'   => 'Comisión histórica importada desde ' . $item['meta_key'] . '; no se infirieron ventas.',
				'occurred_at_gmt' => (string) $item['period'] . '-01 00:00:00',
			) );
			if ( ! empty( $result['created'] ) ) $imported++; else $skipped++;
		}

		Nakama_Affiliates_Repository::audit(
			'legacy_creator_commissions_migrated',
			'affiliate',
			(int) $preview['affiliate_id'],
			self::encode( array( 'user_id' => (int) $user_id, 'imported' => $imported, 'skipped' => $skipped ) ),
			(int) $actor_user_id
		);
		return array( 'success' => true, 'imported' => $imported, 'skipped' => $skipped );
	}

	private static function event_key( $affiliate_id, $period ) {
		return 'legacy_commission:v1:' . (int) $affiliate_id . ':' . (string) $period;
	}

	private static function admin_allowed() {
		return function_exists( 'current_user_can' ) && current_user_can( 'manage_woocommerce' );
	}

	private static function money( $amount ) {
		$amount = is_numeric( $amount ) ? round( (float) $amount, 2, PHP_ROUND_HALF_UP ) : 0.0;
		return 0.0 === $amount ? 0.0 : $amount;
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function failure( $reason ) {
		return array( 'success' => false, 'reason' => (string) $reason );
	}
}
