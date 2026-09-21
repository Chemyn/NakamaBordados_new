<?php
/**
 * Affiliate social evidence with manual review and controlled replacement.
 *
 * Only URLs are stored. Social content is never fetched or copied.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Evidence {
	const SLOTS = array(
		'reel_1'  => array( 'content_type' => 'reel', 'position' => 1, 'required' => true ),
		'reel_2'  => array( 'content_type' => 'reel', 'position' => 2, 'required' => true ),
		'story_1' => array( 'content_type' => 'story', 'position' => 1, 'required' => true ),
		'bonus'   => array( 'content_type' => 'bonus', 'position' => 1, 'required' => false ),
	);

	public static function submit( $request_id, $affiliate_id, array $urls, $actor_user_id = 0 ) {
		$request = Nakama_Affiliates_Repository::request_by_id( (int) $request_id );
		if ( ! $request || (int) $request['affiliate_id'] !== (int) $affiliate_id ) return self::failure( 'request_not_found' );
		if ( ! in_array( $request['status'] ?? '', array( 'shipped', 'completed' ), true ) ) return self::failure( 'delivery_not_ready' );

		foreach ( $urls as $slot => $url ) {
			if ( '' !== trim( (string) $url ) && ! isset( self::SLOTS[ $slot ] ) ) return self::failure( 'invalid_slot' );
		}

		$existing = array();
		foreach ( Nakama_Affiliates_Repository::evidence_for_request( (int) $request_id ) as $item ) {
			$existing[ $item['slot_key'] ] = $item;
		}
		$effective = array();
		foreach ( $existing as $slot => $item ) {
			if ( 'rejected' !== ( $item['status'] ?? '' ) ) $effective[ $slot ] = (string) $item['url'];
		}

		$records = array();
		$replaced = array();
		foreach ( self::SLOTS as $slot => $meta ) {
			$raw = isset( $urls[ $slot ] ) ? trim( (string) $urls[ $slot ] ) : '';
			if ( '' === $raw ) continue;
			$normalized = self::normalize_url( $raw );
			if ( empty( $normalized['success'] ) ) return self::failure( $normalized['reason'] );
			$url = $normalized['url'];
			$current = $existing[ $slot ] ?? null;
			if ( $current && in_array( $current['status'] ?? '', array( 'pending', 'approved' ), true ) ) {
				if ( $url === (string) $current['url'] ) {
					$effective[ $slot ] = $url;
					continue;
				}
				return self::failure( 'slot_locked' );
			}

			$record = array(
				'request_id'       => (int) $request_id,
				'affiliate_id'     => (int) $affiliate_id,
				'slot_key'         => $slot,
				'content_type'     => $meta['content_type'],
				'position'         => (int) $meta['position'],
				'url'              => $url,
				'url_hash'         => hash( 'sha256', $url ),
				'status'           => 'pending',
				'review_reason'    => '',
				'submitted_at_gmt' => Nakama_Affiliates_Repository::now_gmt(),
				'reviewed_at_gmt'  => null,
				'reviewed_by'      => 0,
			);
			if ( $current ) {
				$record['id'] = (int) $current['id'];
				$replaced[] = array( 'slot' => $slot, 'old_url_hash' => (string) $current['url_hash'], 'new_url_hash' => $record['url_hash'] );
			}
			$records[] = $record;
			$effective[ $slot ] = $url;
		}

		foreach ( self::SLOTS as $slot => $meta ) {
			if ( $meta['required'] && empty( $effective[ $slot ] ) ) return self::failure( 'required_slots_missing' );
		}
		if ( count( $effective ) !== count( array_unique( array_values( $effective ) ) ) ) return self::failure( 'duplicate_url' );

		foreach ( $records as $record ) {
			$duplicate = Nakama_Affiliates_Repository::evidence_by_affiliate_period_hash(
				(int) $affiliate_id,
				(string) $request['period_key'],
				(string) $record['url_hash'],
				(int) ( $record['id'] ?? 0 )
			);
			if ( $duplicate ) return self::failure( 'duplicate_url' );
		}

		if ( $records && ! Nakama_Affiliates_Repository::save_evidence_batch( $records ) ) return self::failure( 'save_failed' );
		if ( $records ) {
			Nakama_Affiliates_Repository::audit(
				'affiliate_evidence_submitted',
				'affiliate_request',
				(int) $request_id,
				self::encode( array( 'slots' => array_column( $records, 'slot_key' ) ) ),
				(int) $actor_user_id
			);
		}
		foreach ( $replaced as $change ) {
			Nakama_Affiliates_Repository::audit( 'affiliate_evidence_replaced', 'affiliate_request', (int) $request_id, self::encode( $change ), (int) $actor_user_id );
		}
		return self::response( (int) $request_id );
	}

	public static function for_request( $request_id, $affiliate_id ) {
		$request = Nakama_Affiliates_Repository::request_by_id( (int) $request_id );
		if ( ! $request || (int) $request['affiliate_id'] !== (int) $affiliate_id ) return self::failure( 'request_not_found' );
		return self::response( (int) $request_id );
	}

	public static function review( $evidence_id, $status, $reason, $actor_user_id ) {
		$evidence = Nakama_Affiliates_Repository::evidence_by_id( (int) $evidence_id );
		if ( ! $evidence ) return self::failure( 'not_found' );
		if ( 'pending' !== ( $evidence['status'] ?? '' ) ) return self::failure( 'already_reviewed' );
		$status = (string) $status;
		if ( ! in_array( $status, array( 'approved', 'rejected' ), true ) ) return self::failure( 'invalid_status' );
		$reason = trim( (string) $reason );
		if ( 'rejected' === $status && '' === $reason ) return self::failure( 'reason_required' );
		if ( (int) $actor_user_id <= 0 ) return self::failure( 'actor_required' );

		$updated = Nakama_Affiliates_Repository::update_evidence( (int) $evidence_id, array(
			'status'          => $status,
			'review_reason'   => 'rejected' === $status ? $reason : '',
			'reviewed_at_gmt' => Nakama_Affiliates_Repository::now_gmt(),
			'reviewed_by'     => (int) $actor_user_id,
		) );
		if ( ! $updated ) return self::failure( 'update_failed' );
		Nakama_Affiliates_Repository::audit(
			'affiliate_evidence_' . $status,
			'affiliate_evidence',
			(int) $evidence_id,
			self::encode( array( 'slot' => $evidence['slot_key'], 'reason' => 'rejected' === $status ? $reason : '' ) ),
			(int) $actor_user_id
		);
		return array( 'success' => true, 'evidence' => Nakama_Affiliates_Repository::evidence_by_id( (int) $evidence_id ) );
	}

	private static function response( $request_id ) {
		$items = Nakama_Affiliates_Repository::evidence_for_request( (int) $request_id );
		usort( $items, static function ( $left, $right ) {
			$order = array_flip( array_keys( self::SLOTS ) );
			return ( $order[ $left['slot_key'] ] ?? 99 ) <=> ( $order[ $right['slot_key'] ] ?? 99 );
		} );
		return array(
			'success'                => true,
			'items'                  => $items,
			'requiredComplete'       => Nakama_Affiliates_Repository::request_has_approved_required_evidence( (int) $request_id ),
			'bonusPriorityPotential' => true,
			'bonusGuarantee'         => false,
		);
	}

	private static function normalize_url( $value ) {
		$parts = parse_url( trim( (string) $value ) );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || 'https' !== strtolower( (string) $parts['scheme'] ) ) return self::failure( 'https_required' );
		if ( empty( $parts['host'] ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) return self::failure( 'invalid_url' );
		$host = strtolower( (string) $parts['host'] );
		$port = isset( $parts['port'] ) && 443 !== (int) $parts['port'] ? ':' . (int) $parts['port'] : '';
		$path = isset( $parts['path'] ) ? rtrim( (string) $parts['path'], '/' ) : '';
		$query = isset( $parts['query'] ) && '' !== $parts['query'] ? '?' . $parts['query'] : '';
		$url = 'https://' . $host . $port . $path . $query;
		return filter_var( $url, FILTER_VALIDATE_URL ) ? array( 'success' => true, 'url' => $url ) : self::failure( 'invalid_url' );
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function failure( $reason ) {
		return array( 'success' => false, 'reason' => (string) $reason );
	}
}
