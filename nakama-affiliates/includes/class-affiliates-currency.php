<?php
/**
 * Currency boundary for affiliate accounting.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Currency {
	/** Resolve the source-currency multiplier needed to produce MXN. */
	public static function rate_to_mxn( $currency, $provider = null ) {
		$currency = strtoupper( trim( (string) $currency ) );
		if ( 'MXN' === $currency ) {
			return array( 'available' => true, 'rate' => 1.0, 'source' => 'identity' );
		}

		if ( 'USD' !== $currency ) {
			return array( 'available' => false, 'rate' => 0.0, 'source' => 'unsupported' );
		}

		if ( is_callable( $provider ) ) {
			$details = call_user_func( $provider );
		} elseif ( function_exists( 'nakama_get_usd_rate_details' ) ) {
			$details = nakama_get_usd_rate_details();
		} else {
			$details = false;
		}

		// The shared provider expresses MXN -> USD. Affiliate accounting needs
		// the inverse multiplier to convert a paid USD subtotal back to MXN.
		$mxn_to_usd = is_array( $details ) && isset( $details['rate'] )
			? (float) $details['rate']
			: 0.0;
		if ( $mxn_to_usd <= 0 ) {
			return array( 'available' => false, 'rate' => 0.0, 'source' => 'unavailable' );
		}

		return array(
			'available' => true,
			'rate'      => round( 1 / $mxn_to_usd, 8, PHP_ROUND_HALF_UP ),
			'source'    => isset( $details['source'] ) ? (string) $details['source'] : 'shared_provider',
		);
	}
}
