<?php
/**
 * Affiliate code creation, validation and administration.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Codes {
	const MAX_LENGTH = 24;

	/** Normalize a code to the approved portable alphabet. */
	public static function normalize( $value ) {
		$value = function_exists( 'remove_accents' ) ? remove_accents( (string) $value ) : (string) $value;
		$value = strtoupper( trim( $value ) );
		$value = preg_replace( '/\s+/', '-', $value );
		$value = preg_replace( '/[^A-Z0-9_-]/', '', $value );
		$value = preg_replace( '/[-_]{2,}/', '-', $value );
		$value = trim( (string) $value, '-_' );
		return substr( $value, 0, self::MAX_LENGTH );
	}

	/** Suggest a unique code from the display name or login. */
	public static function suggest_for_user( $user ) {
		$user_id = isset( $user->ID ) ? (int) $user->ID : 0;
		$display_name = isset( $user->display_name ) ? (string) $user->display_name : '';
		$login = isset( $user->user_login ) ? (string) $user->user_login : '';
		$base = self::normalize( $display_name ?: $login );
		if ( '' === $base ) {
			$base = 'AFILIADO';
		}

		if ( self::is_available( $base, $user_id ) ) {
			return $base;
		}

		for ( $counter = 2; $counter <= 9999; $counter++ ) {
			$suffix = '-' . $counter;
			$candidate = substr( $base, 0, self::MAX_LENGTH - strlen( $suffix ) ) . $suffix;
			if ( self::is_available( $candidate, $user_id ) ) {
				return $candidate;
			}
		}

		$suffix = '-' . strtoupper( base_convert( (string) max( 1, $user_id ), 10, 36 ) );
		return substr( $base, 0, self::MAX_LENGTH - strlen( $suffix ) ) . $suffix;
	}

	/** Convert the administrator's percentage to a decimal rate. */
	public static function validate_percentage( $percentage ) {
		if ( ! is_numeric( $percentage ) ) {
			return array( 'valid' => false, 'message' => 'Indica un porcentaje de descuento válido.' );
		}

		$percentage = (float) $percentage;
		if ( $percentage <= 0 || $percentage > 10 ) {
			return array( 'valid' => false, 'message' => 'El descuento debe ser mayor que 0 y no superar 10%.' );
		}

		return array(
			'valid'      => true,
			'percentage' => round( $percentage, 4 ),
			'rate'       => Nakama_Affiliates_Domain::bounded_rate( $percentage / 100, Nakama_Affiliates_Domain::MAX_DISCOUNT_RATE ),
		);
	}

	/** Resolve the authoritative profile for checkout and attribution. */
	public static function resolve( $code ) {
		$normalized = self::normalize( $code );
		if ( '' === $normalized ) {
			return self::invalid();
		}

		$profile = Nakama_Affiliates_Repository::profile_by_code( $normalized );
		if ( ! $profile || ! Nakama_Affiliates_Profiles::is_operational( $profile ) ) {
			return self::invalid();
		}

		$user = get_userdata( (int) $profile['user_id'] );
		if ( ! $user || ! user_can( $user, Nakama_Affiliates_Permissions::ACCESS_CAP ) ) {
			return self::invalid();
		}

		return array(
			'valid'   => true,
			'code'    => $normalized,
			'message' => 'Código de afiliado aplicado.',
			'profile' => $profile,
		);
	}

	/** Return a deliberately narrow representation for unauthenticated clients. */
	public static function public_validation( $code ) {
		$result = self::resolve( $code );
		if ( empty( $result['valid'] ) ) {
			return self::invalid();
		}

		return array(
			'valid'            => true,
			'code'             => $result['code'],
			'message'          => 'Código de afiliado aplicado.',
			'attribution_days' => isset( $result['profile']['attribution_days'] )
				? max( 1, (int) $result['profile']['attribution_days'] )
				: Nakama_Affiliates_Domain::ATTRIBUTION_DAYS,
		);
	}

	/** Validate and save the two administrator-editable code settings. */
	public static function update_profile_settings( array $profile, $raw_code, $percentage ) {
		$code = self::normalize( $raw_code );
		if ( '' === $code ) {
			return array( 'success' => false, 'message' => 'Escribe un código de afiliado.' );
		}

		$rate = self::validate_percentage( $percentage );
		if ( empty( $rate['valid'] ) ) {
			return array( 'success' => false, 'message' => $rate['message'] );
		}

		$owner = Nakama_Affiliates_Repository::profile_by_code( $code );
		if ( $owner && (int) $owner['id'] !== (int) $profile['id'] ) {
			return array( 'success' => false, 'message' => 'Ese código ya pertenece a otro afiliado.' );
		}

		$updated = Nakama_Affiliates_Repository::update_profile( (int) $profile['id'], array(
			'code'          => $code,
			'discount_rate' => $rate['rate'],
		) );
		if ( ! $updated ) {
			return array( 'success' => false, 'message' => 'No se pudo guardar el código de afiliado.' );
		}

		Nakama_Affiliates_Repository::audit(
			'code_settings_updated',
			'affiliate',
			(int) $profile['id'],
			sprintf( 'Código actualizado a %s con descuento de %s%%.', $code, $rate['percentage'] )
		);

		return array(
			'success' => true,
			'code'    => $code,
			'rate'    => $rate['rate'],
		);
	}

	private static function is_available( $code, $user_id ) {
		$profile = Nakama_Affiliates_Repository::profile_by_code( $code );
		return ! $profile || (int) $profile['user_id'] === (int) $user_id;
	}

	private static function invalid() {
		return array(
			'valid'   => false,
			'message' => 'Código de afiliado no válido.',
		);
	}
}

