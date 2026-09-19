<?php
/**
 * Affiliate profile lifecycle.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Profiles {
	/** Keep persistence aligned with individual capability changes. */
	public static function synchronize_user( $user, $has_access, $suspended = false ) {
		$user_id = isset( $user->ID ) ? (int) $user->ID : 0;
		if ( $user_id < 1 ) {
			return 0;
		}

		$profile = Nakama_Affiliates_Repository::profile_by_user( $user_id );
		if ( ! $profile && ! $has_access ) {
			return 0;
		}

		$status = $has_access ? ( $suspended ? 'suspended' : 'active' ) : 'inactive';
		$now = Nakama_Affiliates_Repository::now_gmt();

		if ( ! $profile ) {
			$code = class_exists( 'Nakama_Affiliates_Codes' )
				? Nakama_Affiliates_Codes::suggest_for_user( $user )
				: self::fallback_code( $user_id );
			$profile_id = Nakama_Affiliates_Repository::insert_profile( array(
				'user_id'          => $user_id,
				'code'             => $code,
				'status'           => $status,
				'approved_at_gmt'  => $has_access ? $now : null,
				'suspended_at_gmt' => $suspended ? $now : null,
			) );
			if ( $profile_id ) {
				Nakama_Affiliates_Repository::audit(
					'profile_created',
					'affiliate',
					$profile_id,
					'Perfil de afiliado creado con estado ' . $status . '.'
				);
			}
			return $profile_id;
		}

		$updates = array(
			'status'           => $status,
			'suspended_at_gmt' => $suspended ? $now : null,
		);
		if ( $has_access && empty( $profile['approved_at_gmt'] ) ) {
			$updates['approved_at_gmt'] = $now;
		}

		Nakama_Affiliates_Repository::update_profile( (int) $profile['id'], $updates );
		if ( ! isset( $profile['status'] ) || $status !== $profile['status'] ) {
			Nakama_Affiliates_Repository::audit(
				'profile_status_changed',
				'affiliate',
				(int) $profile['id'],
				'Estado operativo actualizado a ' . $status . '.'
			);
		}

		return (int) $profile['id'];
	}

	public static function is_operational( array $profile ) {
		return isset( $profile['status'] ) && 'active' === $profile['status'];
	}

	/** Temporary deterministic fallback until the code service is loaded. */
	private static function fallback_code( $user_id ) {
		return 'AFILIADO-' . strtoupper( base_convert( (string) max( 1, (int) $user_id ), 10, 36 ) );
	}
}

