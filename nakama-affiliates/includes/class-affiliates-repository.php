<?php
/**
 * Persistence gateway for Nakama Affiliates.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Repository {
	const TABLES = array(
		'profiles'      => 'nakama_affiliates',
		'ledger'        => 'nakama_affiliate_ledger',
		'closures'      => 'nakama_affiliate_closures',
		'documents'     => 'nakama_affiliate_documents',
		'benefits'      => 'nakama_affiliate_benefit_periods',
		'requests'      => 'nakama_affiliate_requests',
		'request_items' => 'nakama_affiliate_request_items',
		'evidence'      => 'nakama_affiliate_evidence',
		'audit'         => 'nakama_affiliate_audit',
	);

	public static function table( $name ) {
		global $wpdb;

		if ( ! isset( self::TABLES[ $name ] ) ) {
			throw new InvalidArgumentException( 'Unknown Nakama Affiliates table.' );
		}

		return $wpdb->prefix . self::TABLES[ $name ];
	}

	public static function now_gmt() {
		return gmdate( 'Y-m-d H:i:s' );
	}

	public static function profile_by_id( $affiliate_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE id = %d LIMIT 1',
			(int) $affiliate_id
		), ARRAY_A );
	}

	public static function profile_by_user( $user_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE user_id = %d LIMIT 1',
			(int) $user_id
		), ARRAY_A );
	}

	public static function profile_by_code( $code ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE code = %s LIMIT 1',
			(string) $code
		), ARRAY_A );
	}

	public static function insert_profile( array $data ) {
		global $wpdb;
		$now = self::now_gmt();
		$record = array_merge( array(
			'status'           => 'active',
			'discount_rate'    => Nakama_Affiliates_Domain::MAX_DISCOUNT_RATE,
			'commission_rate'  => Nakama_Affiliates_Domain::COMMISSION_RATE,
			'attribution_days' => Nakama_Affiliates_Domain::ATTRIBUTION_DAYS,
			'created_at_gmt'   => $now,
			'updated_at_gmt'   => $now,
		), $data );

		$inserted = $wpdb->insert( self::table( 'profiles' ), $record );
		return $inserted ? (int) $wpdb->insert_id : 0;
	}

	public static function update_profile( $affiliate_id, array $data ) {
		global $wpdb;
		$data['updated_at_gmt'] = self::now_gmt();
		return false !== $wpdb->update(
			self::table( 'profiles' ),
			$data,
			array( 'id' => (int) $affiliate_id )
		);
	}

	public static function ledger_by_event_key( $event_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'ledger' ) . ' WHERE event_key = %s LIMIT 1',
			(string) $event_key
		), ARRAY_A );
	}

	public static function ledger_events_for_order( $order_id ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'ledger' ) . ' WHERE order_id = %d ORDER BY id ASC',
			(int) $order_id
		), ARRAY_A );
	}

	public static function closure_by_affiliate_period( $affiliate_id, $period_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
	}

	/** Insert by unique event key and treat a duplicate race as success. */
	public static function insert_ledger_event( array $data ) {
		global $wpdb;
		$event_key = isset( $data['event_key'] ) ? (string) $data['event_key'] : '';
		if ( '' === $event_key ) {
			return array( 'created' => false, 'id' => 0, 'reason' => 'missing_event_key' );
		}

		$existing = self::ledger_by_event_key( $event_key );
		if ( $existing ) {
			return array( 'created' => false, 'id' => (int) $existing['id'], 'event' => $existing );
		}

		$data['created_at_gmt'] = self::now_gmt();
		$inserted = $wpdb->insert( self::table( 'ledger' ), $data );
		if ( $inserted ) {
			return array( 'created' => true, 'id' => (int) $wpdb->insert_id, 'event' => $data );
		}

		$existing = self::ledger_by_event_key( $event_key );
		return $existing
			? array( 'created' => false, 'id' => (int) $existing['id'], 'event' => $existing )
			: array( 'created' => false, 'id' => 0, 'reason' => 'insert_failed' );
	}

	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ) {
		global $wpdb;
		if ( null === $actor_user_id ) {
			$actor_user_id = function_exists( 'get_current_user_id' ) ? get_current_user_id() : 0;
		}

		return (bool) $wpdb->insert( self::table( 'audit' ), array(
			'actor_user_id' => (int) $actor_user_id,
			'action'        => (string) $action,
			'entity_type'   => (string) $entity_type,
			'entity_id'     => (int) $entity_id,
			'description'   => (string) $description,
			'created_at_gmt'=> self::now_gmt(),
		) );
	}
}
