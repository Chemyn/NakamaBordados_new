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

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/fiscal-document', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'fiscal_document' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'upload_fiscal_document' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/fiscal-document/download', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'download_fiscal_document' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/admin/documents/(?P<id>\d+)/review', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'review_fiscal_document' ),
			'permission_callback' => array( __CLASS__, 'admin_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/admin/documents/(?P<id>\d+)/download', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'download_fiscal_document' ),
			'permission_callback' => array( __CLASS__, 'admin_permission' ),
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
			'discountPercentage' => min( 10.0, max( 0.01, (float) $result['discount_percentage'] ) ),
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

	public static function affiliate_permission() {
		return get_current_user_id() > 0 && Nakama_Affiliates_Permissions::current_user_can_access();
	}

	public static function admin_permission() {
		return get_current_user_id() > 0 && current_user_can( 'manage_woocommerce' );
	}

	public static function fiscal_document() {
		return self::no_store_response( array(
			'success'  => true,
			'document' => Nakama_Affiliates_Documents::current_for_user(),
		) );
	}

	public static function upload_fiscal_document( WP_REST_Request $request ) {
		$files = method_exists( $request, 'get_file_params' ) ? $request->get_file_params() : array();
		$file  = $files['file'] ?? ( $files['document'] ?? null );
		if ( ! is_array( $file ) ) {
			return self::no_store_response( array( 'success' => false, 'message' => 'Selecciona un archivo PDF.' ) );
		}
		return self::no_store_response( Nakama_Affiliates_Documents::upload_for_current_user( $file ) );
	}

	public static function review_fiscal_document( WP_REST_Request $request ) {
		return self::no_store_response( Nakama_Affiliates_Documents::review(
			(int) $request->get_param( 'id' ),
			$request->get_param( 'status' ),
			$request->get_param( 'reason' )
		) );
	}

	public static function download_fiscal_document( WP_REST_Request $request ) {
		$document_id = (int) $request->get_param( 'id' );
		$result = Nakama_Affiliates_Documents::downloadable_for_current_user( $document_id );
		if ( empty( $result['success'] ) ) {
			return self::no_store_response( $result );
		}
		$document = $result['document'];
		if ( false === Nakama_Affiliates_Private_Files::stream_pdf_and_exit( $document['storage_key'], $document['original_name'] ) ) {
			return self::no_store_response( array( 'success' => false, 'message' => 'El archivo privado no está disponible.' ) );
		}
		return null;
	}

	private static function no_store_response( array $data ) {
		$response = rest_ensure_response( $data );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}
