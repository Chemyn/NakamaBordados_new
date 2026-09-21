<?php
/**
 * Operational monthly product requests for affiliates.
 *
 * These records are free program benefits. They do not create WooCommerce
 * orders, sales attribution, commission or goal movements.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Requests {
	const STATES = array( 'draft', 'submitted', 'approved', 'preparing', 'shipped', 'completed', 'rejected', 'cancelled' );

	public static function submit( $affiliate_id, $period_key, array $selections, array $address, $is_vip, $actor_user_id = 0 ) {
		$affiliate_id = (int) $affiliate_id;
		$period_key   = (string) $period_key;
		if ( $affiliate_id <= 0 || ! self::valid_period( $period_key ) ) return self::failure( 'invalid_request' );
		if ( Nakama_Affiliates_Repository::request_by_affiliate_period( $affiliate_id, $period_key ) ) return self::failure( 'already_requested' );

		$prior = Nakama_Affiliates_Repository::latest_prior_request( $affiliate_id, $period_key );
		if ( $prior && ! Nakama_Affiliates_Repository::request_has_approved_required_evidence( (int) $prior['id'] ) ) {
			return self::failure( 'evidence_required', array( 'request' => self::hydrate( $prior ) ) );
		}

		$benefit = Nakama_Affiliates_Benefits::ensure_period( $affiliate_id, $period_key, (int) $actor_user_id );
		if ( ! $benefit ) return self::failure( 'benefit_unavailable' );
		$count = count( $selections );
		if ( $count < 1 ) return self::failure( 'selection_required' );
		if ( $count > (int) $benefit['quota'] ) return self::failure( 'quota_exceeded', array( 'quota' => (int) $benefit['quota'] ) );

		$confirmed_address = self::normalize_address( $address );
		if ( ! $confirmed_address ) return self::failure( 'address_required' );

		$items = array();
		$seen  = array();
		foreach ( $selections as $selection ) {
			$product_id   = (int) ( $selection['product_id'] ?? 0 );
			$variation_id = (int) ( $selection['variation_id'] ?? 0 );
			$key          = $product_id . ':' . $variation_id;
			if ( isset( $seen[ $key ] ) ) return self::failure( 'duplicate_selection' );
			$validated = Nakama_Affiliates_Products::validate_selection( $product_id, $variation_id, (bool) $is_vip );
			if ( empty( $validated['success'] ) ) return self::failure( $validated['reason'] ?? 'invalid_product' );
			$seen[ $key ] = true;
			$items[] = $validated['item'] + array( 'quantity' => 1, 'created_at_gmt' => Nakama_Affiliates_Repository::now_gmt() );
		}

		$now = Nakama_Affiliates_Repository::now_gmt();
		$request_id = Nakama_Affiliates_Repository::create_request_with_items( array(
			'affiliate_id'      => $affiliate_id,
			'benefit_period_id' => (int) $benefit['id'],
			'period_key'        => $period_key,
			'status'            => 'submitted',
			'address_json'      => self::encode( $confirmed_address ),
			'shipping_covered'  => 1,
			'carrier'           => '',
			'tracking_code'     => '',
			'rejection_reason'  => '',
			'submitted_at_gmt'  => $now,
			'completed_at_gmt'  => null,
			'created_at_gmt'    => $now,
			'updated_at_gmt'    => $now,
		), $items );
		if ( $request_id <= 0 ) return self::failure( 'already_requested' );

		Nakama_Affiliates_Repository::audit(
			'affiliate_product_request_submitted',
			'affiliate_request',
			$request_id,
			self::encode( array( 'period_key' => $period_key, 'units' => count( $items ), 'shipping_covered' => true, 'commercial_order' => false ) ),
			(int) $actor_user_id
		);
		return self::success( self::hydrate( Nakama_Affiliates_Repository::request_by_id( $request_id ) ) );
	}

	public static function for_period( $affiliate_id, $period_key ) {
		$request = Nakama_Affiliates_Repository::request_by_affiliate_period( (int) $affiliate_id, (string) $period_key );
		return $request ? self::hydrate( $request ) : null;
	}

	public static function transition( $request_id, $next_status, array $data, $actor_user_id ) {
		$request = Nakama_Affiliates_Repository::request_by_id( (int) $request_id );
		if ( ! $request ) return self::failure( 'not_found' );
		if ( (int) $actor_user_id <= 0 ) return self::failure( 'actor_required' );
		$next_status = (string) $next_status;
		$allowed = array(
			'draft'     => array( 'submitted', 'cancelled' ),
			'submitted' => array( 'approved', 'rejected', 'cancelled' ),
			'approved'  => array( 'preparing', 'rejected', 'cancelled' ),
			'preparing' => array( 'shipped', 'cancelled' ),
			'shipped'   => array( 'completed' ),
			'completed' => array(),
			'rejected'  => array(),
			'cancelled' => array(),
		);
		$current = (string) ( $request['status'] ?? '' );
		if ( ! isset( $allowed[ $current ] ) || ! in_array( $next_status, $allowed[ $current ], true ) ) return self::failure( 'invalid_transition' );

		$update = array( 'status' => $next_status, 'updated_at_gmt' => Nakama_Affiliates_Repository::now_gmt() );
		if ( 'rejected' === $next_status ) {
			$reason = self::clean_text( $data['reason'] ?? '' );
			if ( '' === $reason ) return self::failure( 'reason_required' );
			$update['rejection_reason'] = $reason;
		}
		if ( 'shipped' === $next_status ) {
			$carrier = self::clean_text( $data['carrier'] ?? '' );
			$tracking = self::clean_text( $data['tracking_code'] ?? '' );
			if ( '' === $carrier || '' === $tracking ) return self::failure( 'tracking_required' );
			$update['carrier'] = $carrier;
			$update['tracking_code'] = $tracking;
		}
		if ( 'completed' === $next_status ) $update['completed_at_gmt'] = Nakama_Affiliates_Repository::now_gmt();

		if ( ! Nakama_Affiliates_Repository::update_request( (int) $request_id, $update ) ) return self::failure( 'update_failed' );
		Nakama_Affiliates_Repository::audit(
			'affiliate_product_request_' . $next_status,
			'affiliate_request',
			(int) $request_id,
			self::encode( array( 'from' => $current, 'to' => $next_status, 'carrier' => $update['carrier'] ?? '', 'tracking_code' => $update['tracking_code'] ?? '', 'reason' => $update['rejection_reason'] ?? '' ) ),
			(int) $actor_user_id
		);
		return self::success( self::hydrate( Nakama_Affiliates_Repository::request_by_id( (int) $request_id ) ) );
	}

	private static function hydrate( array $request ) {
		$address = json_decode( (string) ( $request['address_json'] ?? '' ), true );
		$request['address'] = is_array( $address ) ? $address : array();
		$request['items']   = Nakama_Affiliates_Repository::request_items( (int) $request['id'] );
		unset( $request['address_json'] );
		return $request;
	}

	private static function normalize_address( array $address ) {
		$normalized = array();
		foreach ( array( 'name', 'address1', 'address2', 'city', 'state', 'postcode', 'country', 'phone' ) as $field ) {
			$normalized[ $field ] = self::clean_text( $address[ $field ] ?? '' );
		}
		foreach ( array( 'name', 'address1', 'city', 'state', 'postcode', 'country', 'phone' ) as $required ) {
			if ( '' === $normalized[ $required ] ) return null;
		}
		$normalized['country'] = strtoupper( substr( $normalized['country'], 0, 2 ) );
		return $normalized;
	}

	private static function clean_text( $value ) {
		$value = function_exists( 'sanitize_text_field' ) ? sanitize_text_field( $value ) : strip_tags( (string) $value );
		return trim( (string) $value );
	}

	private static function valid_period( $period_key ) {
		return 1 === preg_match( '/^\d{4}-(0[1-9]|1[0-2])$/', (string) $period_key );
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function success( array $request ) {
		return array( 'success' => true, 'request' => $request );
	}

	private static function failure( $reason, array $extra = array() ) {
		return array_merge( array( 'success' => false, 'reason' => (string) $reason ), $extra );
	}
}
