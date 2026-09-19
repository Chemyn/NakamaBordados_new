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

