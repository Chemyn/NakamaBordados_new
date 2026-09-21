<?php
/**
 * Monthly product benefits granted from confirmed affiliate closures.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Benefits {
	/** Freeze the following month's product quota from a confirmed closure. */
	public static function grant_from_closure( array $closure, $actor_user_id = 0 ) {
		$status = (string) ( $closure['status'] ?? '' );
		if ( ! in_array( $status, array( 'closed', 'approved', 'paid' ), true ) ) {
			return self::failure( 'closure_not_confirmed' );
		}

		$closure_id  = (int) ( $closure['id'] ?? 0 );
		$affiliate_id = (int) ( $closure['affiliate_id'] ?? 0 );
		$source_period = (string) ( $closure['period_key'] ?? '' );
		if ( $closure_id <= 0 || $affiliate_id <= 0 || ! self::valid_period( $source_period ) ) {
			return self::failure( 'invalid_closure' );
		}

		$period_key = self::next_period( $source_period );
		$existing   = Nakama_Affiliates_Repository::benefit_by_affiliate_period( $affiliate_id, $period_key );
		if ( $existing ) {
			return self::success( $existing, false );
		}

		$valid_sales = Nakama_Affiliates_Domain::money(
			( $closure['sales_mxn'] ?? 0 ) +
			( $closure['refunds_mxn'] ?? 0 ) +
			( $closure['adjustments_mxn'] ?? 0 )
		);
		$valid_sales = max( 0.0, $valid_sales );
		$tier        = Nakama_Affiliates_Domain::benefit_tier( $valid_sales );
		$now         = Nakama_Affiliates_Repository::now_gmt();
		$benefit_id  = Nakama_Affiliates_Repository::insert_benefit_period( array(
			'affiliate_id'      => $affiliate_id,
			'period_key'        => $period_key,
			'source_period_key' => $source_period,
			'source_closure_id' => $closure_id,
			'valid_sales_mxn'   => $valid_sales,
			'tier'              => (int) $tier['tier'],
			'quota'             => (int) $tier['quota'],
			'manual_reason'     => '',
			'created_at_gmt'    => $now,
			'updated_at_gmt'    => $now,
		) );
		if ( $benefit_id <= 0 ) {
			return self::failure( 'grant_failed' );
		}

		$benefit = Nakama_Affiliates_Repository::benefit_by_id( $benefit_id );
		if ( ! $benefit ) {
			return self::failure( 'grant_failed' );
		}

		Nakama_Affiliates_Repository::audit(
			'benefit_period_granted',
			'benefit_period',
			$benefit_id,
			self::encode( array(
				'source_closure_id' => $closure_id,
				'source_period_key' => $source_period,
				'period_key'        => $period_key,
				'valid_sales_mxn'   => $valid_sales,
				'tier'              => (int) $tier['tier'],
				'quota'             => (int) $tier['quota'],
			) ),
			(int) $actor_user_id
		);

		return self::success( $benefit, true );
	}

	/** Return the frozen monthly benefit or the non-persisted base allowance. */
	public static function for_period( $affiliate_id, $period_key ) {
		$affiliate_id = (int) $affiliate_id;
		$period_key   = (string) $period_key;
		if ( $affiliate_id <= 0 || ! self::valid_period( $period_key ) ) {
			return null;
		}

		$benefit = Nakama_Affiliates_Repository::benefit_by_affiliate_period( $affiliate_id, $period_key );
		if ( $benefit ) {
			$benefit['is_default'] = false;
			return $benefit;
		}

		return array(
			'id'                  => 0,
			'affiliate_id'        => $affiliate_id,
			'period_key'          => $period_key,
			'source_period_key'   => '',
			'source_closure_id'   => 0,
			'valid_sales_mxn'     => 0.0,
			'tier'                => 1,
			'quota'               => 1,
			'manual_reason'       => '',
			'is_default'          => true,
		);
	}

	/** Persist the base one-product allowance when no prior closure created it. */
	public static function ensure_period( $affiliate_id, $period_key, $actor_user_id = 0 ) {
		$benefit = self::for_period( $affiliate_id, $period_key );
		if ( ! $benefit ) return null;
		if ( (int) $benefit['id'] > 0 ) return $benefit;

		$date = DateTimeImmutable::createFromFormat( '!Y-m', (string) $period_key, new DateTimeZone( 'UTC' ) );
		$source_period = $date->modify( 'first day of previous month' )->format( 'Y-m' );
		$now = Nakama_Affiliates_Repository::now_gmt();
		$benefit_id = Nakama_Affiliates_Repository::insert_benefit_period( array(
			'affiliate_id'      => (int) $affiliate_id,
			'period_key'        => (string) $period_key,
			'source_period_key' => $source_period,
			'source_closure_id' => 0,
			'valid_sales_mxn'   => 0.0,
			'tier'              => 1,
			'quota'             => 1,
			'manual_reason'     => '',
			'created_at_gmt'    => $now,
			'updated_at_gmt'    => $now,
		) );
		if ( $benefit_id <= 0 ) return null;
		$benefit = Nakama_Affiliates_Repository::benefit_by_id( $benefit_id );
		if ( $benefit ) {
			Nakama_Affiliates_Repository::audit( 'benefit_period_defaulted', 'benefit_period', $benefit_id, 'Cupo base de una prenda sin cierre previo confirmado.', (int) $actor_user_id );
		}
		return $benefit;
	}

	/** Pure, reusable progress values for both monthly milestones. */
	public static function progress( $valid_sales_mxn ) {
		$tier  = Nakama_Affiliates_Domain::benefit_tier( $valid_sales_mxn );
		$sales = (float) $tier['sales_mxn'];
		$second_remaining = Nakama_Affiliates_Domain::money( max( 0.0, Nakama_Affiliates_Domain::SECOND_TIER_MXN - $sales ) );
		$third_remaining  = Nakama_Affiliates_Domain::money( max( 0.0, Nakama_Affiliates_Domain::THIRD_TIER_MXN - $sales ) );

		$next = null;
		if ( null !== $tier['next_threshold'] ) {
			$next_quota = 2 === (int) $tier['tier'] ? 3 : 2;
			$next = array(
				'threshold_mxn' => (float) $tier['next_threshold'],
				'remaining_mxn' => Nakama_Affiliates_Domain::money( max( 0.0, (float) $tier['next_threshold'] - $sales ) ),
				'reward_quota'  => $next_quota,
			);
		}

		return array(
			'sales_mxn' => $sales,
			'tier'      => (int) $tier['tier'],
			'quota'     => (int) $tier['quota'],
			'next'      => $next,
			'milestones'=> array(
				'second' => array(
					'threshold_mxn'  => Nakama_Affiliates_Domain::SECOND_TIER_MXN,
					'remaining_mxn'  => $second_remaining,
					'reached'        => 0.0 === $second_remaining,
					'progress_percent'=> self::percentage( $sales, Nakama_Affiliates_Domain::SECOND_TIER_MXN ),
				),
				'third' => array(
					'threshold_mxn'  => Nakama_Affiliates_Domain::THIRD_TIER_MXN,
					'remaining_mxn'  => $third_remaining,
					'reached'        => 0.0 === $third_remaining,
					'progress_percent'=> self::percentage( $sales, Nakama_Affiliates_Domain::THIRD_TIER_MXN ),
				),
			),
		);
	}

	/** Apply an exceptional manual quota correction and preserve its audit trail. */
	public static function correct_quota( $benefit_id, $quota, $reason, $actor_user_id ) {
		$benefit = Nakama_Affiliates_Repository::benefit_by_id( (int) $benefit_id );
		if ( ! $benefit ) {
			return self::failure( 'not_found' );
		}
		if ( ! is_numeric( $quota ) || (int) $quota < 1 || (int) $quota > 3 || (float) $quota !== (float) (int) $quota ) {
			return self::failure( 'invalid_quota' );
		}
		$reason = trim( (string) $reason );
		if ( '' === $reason ) {
			return self::failure( 'reason_required' );
		}
		if ( (int) $actor_user_id <= 0 ) {
			return self::failure( 'actor_required' );
		}

		$updated = Nakama_Affiliates_Repository::update_benefit_period( (int) $benefit_id, array(
			'quota'          => (int) $quota,
			'manual_reason'  => $reason,
			'updated_at_gmt' => Nakama_Affiliates_Repository::now_gmt(),
		) );
		if ( ! $updated ) {
			return self::failure( 'update_failed' );
		}

		Nakama_Affiliates_Repository::audit(
			'benefit_quota_corrected',
			'benefit_period',
			(int) $benefit_id,
			self::encode( array(
				'previous_quota' => (int) ( $benefit['quota'] ?? 1 ),
				'quota'          => (int) $quota,
				'reason'         => $reason,
			) ),
			(int) $actor_user_id
		);

		return self::success( Nakama_Affiliates_Repository::benefit_by_id( (int) $benefit_id ), false );
	}

	private static function percentage( $value, $threshold ) {
		return round( min( 100.0, max( 0.0, (float) $value / (float) $threshold * 100.0 ) ), 2 );
	}

	private static function next_period( $period_key ) {
		$date = DateTimeImmutable::createFromFormat( '!Y-m', (string) $period_key, new DateTimeZone( 'UTC' ) );
		return $date->modify( 'first day of next month' )->format( 'Y-m' );
	}

	private static function valid_period( $period_key ) {
		return 1 === preg_match( '/^\d{4}-(0[1-9]|1[0-2])$/', (string) $period_key );
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function success( array $benefit, $created ) {
		return array( 'success' => true, 'created' => (bool) $created, 'benefit' => $benefit );
	}

	private static function failure( $reason ) {
		return array( 'success' => false, 'reason' => (string) $reason );
	}
}
