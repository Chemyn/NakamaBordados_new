<?php
/**
 * Pure business rules for Nakama Affiliates.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Domain {
	const MAX_DISCOUNT_RATE = 0.10;
	const COMMISSION_RATE   = 0.10;
	const ATTRIBUTION_DAYS  = 30;
	const SECOND_TIER_MXN   = 10000.0;
	const THIRD_TIER_MXN    = 30000.0;

	/** Resolve a calendar month in the configured WordPress timezone. */
	public static function period_key( DateTimeInterface $instant, DateTimeZone $timezone ) {
		$local = ( new DateTimeImmutable( '@' . $instant->getTimestamp() ) )->setTimezone( $timezone );
		return $local->format( 'Y-m' );
	}

	/** Normalize a decimal rate and cap it without accepting negatives. */
	public static function bounded_rate( $value, $maximum ) {
		if ( ! is_numeric( $value ) || ! is_numeric( $maximum ) ) {
			return 0.0;
		}

		$maximum = max( 0.0, (float) $maximum );
		return round( min( $maximum, max( 0.0, (float) $value ) ), 6 );
	}

	/** Normalize a signed monetary amount to two decimals. */
	public static function money( $value ) {
		if ( ! is_numeric( $value ) ) {
			return 0.0;
		}

		$amount = round( (float) $value, 2, PHP_ROUND_HALF_UP );
		return 0.0 === $amount ? 0.0 : $amount;
	}

	/** Fixed commission for this approved version of the program. */
	public static function commission( $eligible_base_mxn ) {
		return self::money( self::money( $eligible_base_mxn ) * self::COMMISSION_RATE );
	}

	/** Resolve the monthly product quota and the next visible target. */
	public static function benefit_tier( $valid_sales_mxn ) {
		$sales = max( 0.0, self::money( $valid_sales_mxn ) );

		if ( $sales >= self::THIRD_TIER_MXN ) {
			return array(
				'tier'           => 3,
				'quota'          => 3,
				'sales_mxn'      => $sales,
				'next_threshold' => null,
			);
		}

		if ( $sales >= self::SECOND_TIER_MXN ) {
			return array(
				'tier'           => 2,
				'quota'          => 2,
				'sales_mxn'      => $sales,
				'next_threshold' => self::THIRD_TIER_MXN,
			);
		}

		return array(
			'tier'           => 1,
			'quota'          => 1,
			'sales_mxn'      => $sales,
			'next_threshold' => self::SECOND_TIER_MXN,
		);
	}
}

