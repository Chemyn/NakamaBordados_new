<?php
/**
 * REST contracts for Nakama Affiliates.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_REST {
	const NAMESPACE_NAME = 'nakama/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route( self::NAMESPACE_NAME, '/affiliates/code', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'validate_code' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/access', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'access' ),
			'permission_callback' => '__return_true',
		) );
	}

	public static function validate_code( WP_REST_Request $request ) {
		$result = Nakama_Affiliates_Codes::public_validation( $request->get_param( 'code' ) );
		if ( empty( $result['valid'] ) ) {
			return self::no_store_response( array(
				'valid'   => false,
				'message' => 'Código de afiliado no válido.',
			) );
		}

		$days = isset( $result['attribution_days'] ) ? max( 1, (int) $result['attribution_days'] ) : 30;
		return self::no_store_response( array(
			'valid'     => true,
			'code'      => (string) $result['code'],
			'message'   => 'Código de afiliado aplicado.',
			'expiresAt' => gmdate( 'c', time() + ( $days * DAY_IN_SECONDS ) ),
		) );
	}

	/** Current-user capability probe for the static Next.js frontend. */
	public static function access() {
		$user_id = get_current_user_id();
		$profile = $user_id ? Nakama_Affiliates_Repository::profile_by_user( $user_id ) : null;
		$can = $user_id > 0 && Nakama_Affiliates_Permissions::current_user_can_access();

		return self::no_store_response( array(
			'can'        => $can,
			'vip'        => $can && Nakama_Affiliates_Permissions::current_user_is_vip(),
			'hasProfile' => (bool) $profile,
			'status'     => $profile && isset( $profile['status'] ) ? (string) $profile['status'] : ( $can ? 'support' : 'none' ),
		) );
	}

	private static function no_store_response( array $data ) {
		$response = rest_ensure_response( $data );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}

