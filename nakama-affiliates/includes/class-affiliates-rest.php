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

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'me' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/dashboard', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'dashboard' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/sales', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'sales' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/payments', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'payments' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/payments/(?P<id>\d+)/download', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'download_payment_receipt' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/products', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'products' ),
			'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/product-request', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'product_request' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'product_request' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
		) );

		register_rest_route( self::NAMESPACE_NAME, '/affiliates/me/evidence', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'evidence' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'evidence' ),
				'permission_callback' => array( __CLASS__, 'affiliate_permission' ),
			),
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

	public static function me( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] ) {
			return self::no_store_response( array( 'can' => false, 'message' => 'No existe un perfil de afiliado disponible.' ) );
		}

		$profile = $context['profile'];
		$fiscal  = self::fiscal_context( $profile, $context['support'] );
		return self::no_store_response( array(
			'can'             => true,
			'vip'             => self::profile_is_vip( $profile ),
			'supportMode'     => $context['support'],
			'financialAccess' => $context['support'] || 'approved' === $fiscal['status'],
			'profile'         => self::public_profile( $profile ),
			'fiscal'          => $fiscal,
		) );
	}

	public static function dashboard( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'forbidden', 'message' => 'No existe un perfil de afiliado disponible.' ) );
		}

		$fiscal = self::fiscal_context( $context['profile'], $context['support'] );
		if ( ! $context['support'] && 'approved' !== $fiscal['status'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'fiscal_required', 'fiscal' => $fiscal ) );
		}

		$period  = self::current_period();
		$summary = Nakama_Affiliates_Repository::ledger_summary( (int) $context['profile']['id'], $period );
		$progress = Nakama_Affiliates_Benefits::progress( (float) ( $summary['sales_mxn'] ?? 0 ) );
		return self::no_store_response( array(
			'success' => true,
			'period'  => $period,
			'code'    => (string) $context['profile']['code'],
			'referralUrl' => self::referral_url( $context['profile']['code'] ),
			'summary' => array(
				'salesCount'    => (int) ( $summary['sales_count'] ?? 0 ),
				'refundCount'   => (int) ( $summary['refund_count'] ?? 0 ),
				'salesMxn'      => (float) ( $summary['sales_mxn'] ?? 0 ),
				'commissionMxn' => (float) ( $summary['commission_mxn'] ?? 0 ),
			),
			'progress' => self::public_progress( $progress ),
		) );
	}

	public static function sales( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'forbidden', 'items' => array() ) );
		}
		$fiscal = self::fiscal_context( $context['profile'], $context['support'] );
		if ( ! $context['support'] && 'approved' !== $fiscal['status'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'fiscal_required', 'items' => array() ) );
		}

		$page = max( 1, (int) $request->get_param( 'page' ) );
		$data = Nakama_Affiliates_Repository::ledger_for_affiliate( (int) $context['profile']['id'], $page, 20 );
		$items = array_map( static function ( $event ) {
			return array(
				'id'             => (int) $event['id'],
				'eventType'      => (string) $event['event_type'],
				'orderId'        => (int) $event['order_id'],
				'period'         => (string) $event['period_key'],
				'sourceCurrency' => (string) $event['source_currency'],
				'sourceBase'     => (float) $event['source_base'],
				'rateToMxn'      => (float) $event['rate_to_mxn'],
				'baseMxn'        => (float) $event['base_mxn'],
				'commissionMxn'  => (float) $event['commission_mxn'],
				'status'         => (string) $event['status'],
				'occurredAt'     => (string) $event['occurred_at_gmt'],
			);
		}, $data['items'] ?? array() );

		return self::no_store_response( array(
			'success' => true,
			'page'    => $page,
			'hasMore' => ! empty( $data['has_more'] ),
			'items'   => $items,
		) );
	}

	public static function payments( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'forbidden', 'items' => array() ) );
		}
		$fiscal = self::fiscal_context( $context['profile'], $context['support'] );
		if ( ! $context['support'] && 'approved' !== $fiscal['status'] ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'fiscal_required', 'items' => array() ) );
		}

		$page = max( 1, (int) $request->get_param( 'page' ) );
		$data = Nakama_Affiliates_Repository::closures_for_affiliate( (int) $context['profile']['id'], $page, 20 );
		$items = array_map( static function ( $closure ) {
			return array(
				'id'                  => (int) $closure['id'],
				'period'              => (string) $closure['period_key'],
				'status'              => (string) $closure['status'],
				'salesMxn'             => (float) $closure['sales_mxn'],
				'refundsMxn'           => (float) $closure['refunds_mxn'],
				'adjustmentsMxn'       => (float) $closure['adjustments_mxn'],
				'commissionGrossMxn'  => (float) $closure['commission_gross_mxn'],
				'isrWithheldMxn'      => (float) $closure['isr_withheld_mxn'],
				'ivaWithheldMxn'      => (float) $closure['iva_withheld_mxn'],
				'otherAdjustmentsMxn' => (float) $closure['other_adjustments_mxn'],
				'netMxn'              => (float) $closure['net_mxn'],
				'paidNetMxn'          => (float) ( $closure['paid_net_mxn'] ?? 0 ),
				'paidAt'              => $closure['paid_at_gmt'] ?? null,
				'reference'           => (string) ( $closure['payment_reference'] ?? '' ),
				'receiptId'           => (int) ( $closure['payment_document_id'] ?? 0 ),
				'reversedAt'          => $closure['payment_reversed_at_gmt'] ?? null,
				'reversalReason'      => $closure['payment_reversal_reason'] ?? null,
			);
		}, $data['items'] ?? array() );
		return self::no_store_response( array( 'success' => true, 'page' => $page, 'hasMore' => ! empty( $data['has_more'] ), 'items' => $items ) );
	}

	public static function download_payment_receipt( WP_REST_Request $request ) {
		$result = Nakama_Affiliates_Payments::downloadable( (int) $request->get_param( 'id' ) );
		if ( empty( $result['success'] ) ) return self::no_store_response( $result );
		$document = $result['document'];
		if ( false === Nakama_Affiliates_Private_Files::stream_pdf_and_exit( $document['storage_key'], $document['original_name'] ) ) {
			return self::no_store_response( array( 'success' => false, 'message' => 'El comprobante privado no está disponible.' ) );
		}
		return null;
	}

	public static function products( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] || 'active' !== ( $context['profile']['status'] ?? '' ) ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'affiliate_inactive', 'items' => array() ) );
		}
		$page = max( 1, (int) $request->get_param( 'page' ) );
		$data = Nakama_Affiliates_Products::catalog( self::profile_is_vip( $context['profile'] ), $page, 20 );
		return self::no_store_response( array_merge( array( 'success' => true ), $data ) );
	}

	public static function product_request( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] || 'active' !== ( $context['profile']['status'] ?? '' ) ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'affiliate_inactive' ) );
		}
		$affiliate_id = (int) $context['profile']['id'];
		$period = self::current_period();
		$method = method_exists( $request, 'get_method' ) ? strtoupper( (string) $request->get_method() ) : 'GET';
		if ( 'POST' === $method ) {
			$body = method_exists( $request, 'get_json_params' ) ? $request->get_json_params() : array();
			$body = is_array( $body ) ? $body : array();
			$items = isset( $body['items'] ) && is_array( $body['items'] ) ? $body['items'] : array();
			$address = isset( $body['address'] ) && is_array( $body['address'] ) ? $body['address'] : array();
			$result = Nakama_Affiliates_Requests::submit(
				$affiliate_id,
				$period,
				$items,
				$address,
				self::profile_is_vip( $context['profile'] ),
				get_current_user_id()
			);
			if ( ! empty( $result['success'] ) && ! empty( $result['request'] ) ) $result['request'] = self::public_request( $result['request'] );
			return self::no_store_response( $result );
		}

		return self::no_store_response( array(
			'success'          => true,
			'period'           => $period,
			'benefit'          => self::public_benefit( Nakama_Affiliates_Benefits::for_period( $affiliate_id, $period ) ),
			'request'          => self::public_request( Nakama_Affiliates_Requests::for_period( $affiliate_id, $period ) ),
			'shippingCovered'  => true,
			'officialAccounts' => Nakama_Affiliates_Products::official_accounts(),
		) );
	}

	public static function evidence( WP_REST_Request $request ) {
		$context = self::affiliate_context( $request );
		if ( ! $context['profile'] || 'active' !== ( $context['profile']['status'] ?? '' ) ) {
			return self::no_store_response( array( 'success' => false, 'code' => 'affiliate_inactive' ) );
		}
		$method = method_exists( $request, 'get_method' ) ? strtoupper( (string) $request->get_method() ) : 'GET';
		$body = 'POST' === $method && method_exists( $request, 'get_json_params' ) ? $request->get_json_params() : array();
		$body = is_array( $body ) ? $body : array();
		$request_id = (int) ( $body['requestId'] ?? $request->get_param( 'request_id' ) );
		if ( $request_id <= 0 ) {
			$current = Nakama_Affiliates_Requests::for_period( (int) $context['profile']['id'], self::current_period() );
			$request_id = $current ? (int) $current['id'] : 0;
		}
		if ( $request_id <= 0 ) return self::no_store_response( array( 'success' => false, 'reason' => 'request_not_found' ) );

		if ( 'POST' === $method ) {
			$urls = isset( $body['urls'] ) && is_array( $body['urls'] ) ? $body['urls'] : array();
			return self::no_store_response( self::public_evidence_result( Nakama_Affiliates_Evidence::submit( $request_id, (int) $context['profile']['id'], $urls, get_current_user_id() ) ) );
		}
		return self::no_store_response( self::public_evidence_result( Nakama_Affiliates_Evidence::for_request( $request_id, (int) $context['profile']['id'] ) ) );
	}

	private static function public_progress( array $progress ) {
		$milestone = static function ( $item ) {
			return array(
				'thresholdMxn'   => (float) $item['threshold_mxn'],
				'remainingMxn'   => (float) $item['remaining_mxn'],
				'reached'        => (bool) $item['reached'],
				'progressPercent'=> (float) $item['progress_percent'],
			);
		};
		return array(
			'salesMxn' => (float) $progress['sales_mxn'],
			'tier'     => (int) $progress['tier'],
			'quota'    => (int) $progress['quota'],
			'next'     => $progress['next'] ? array(
				'thresholdMxn' => (float) $progress['next']['threshold_mxn'],
				'remainingMxn' => (float) $progress['next']['remaining_mxn'],
				'rewardQuota'  => (int) $progress['next']['reward_quota'],
			) : null,
			'milestones' => array(
				'second' => $milestone( $progress['milestones']['second'] ),
				'third'  => $milestone( $progress['milestones']['third'] ),
			),
		);
	}

	private static function public_benefit( $benefit ) {
		if ( ! is_array( $benefit ) ) return null;
		return array(
			'id'              => (int) $benefit['id'],
			'period'          => (string) $benefit['period_key'],
			'sourcePeriod'    => (string) $benefit['source_period_key'],
			'sourceClosureId' => (int) $benefit['source_closure_id'],
			'validSalesMxn'   => (float) $benefit['valid_sales_mxn'],
			'tier'            => (int) $benefit['tier'],
			'quota'           => (int) $benefit['quota'],
			'manualReason'    => (string) ( $benefit['manual_reason'] ?? '' ),
			'isDefault'       => ! empty( $benefit['is_default'] ),
		);
	}

	private static function public_request( $request ) {
		if ( ! is_array( $request ) ) return null;
		$items = array_map( static function ( $item ) {
			return array(
				'id'             => (int) ( $item['id'] ?? 0 ),
				'position'       => (int) $item['position'],
				'productId'      => (int) $item['product_id'],
				'variationId'    => (int) $item['variation_id'],
				'productName'    => (string) $item['product_name'],
				'variationLabel' => (string) $item['variation_label'],
				'quantity'       => (int) $item['quantity'],
			);
		}, $request['items'] ?? array() );
		return array(
			'id'               => (int) $request['id'],
			'period'           => (string) $request['period_key'],
			'status'           => (string) $request['status'],
			'shippingCovered'  => ! empty( $request['shipping_covered'] ),
			'carrier'          => (string) ( $request['carrier'] ?? '' ),
			'trackingCode'     => (string) ( $request['tracking_code'] ?? '' ),
			'rejectionReason'  => (string) ( $request['rejection_reason'] ?? '' ),
			'submittedAt'      => $request['submitted_at_gmt'] ?? null,
			'completedAt'      => $request['completed_at_gmt'] ?? null,
			'address'          => is_array( $request['address'] ?? null ) ? $request['address'] : array(),
			'items'            => $items,
		);
	}

	private static function public_evidence_result( array $result ) {
		if ( empty( $result['success'] ) ) return $result;
		$result['items'] = array_map( static function ( $item ) {
			return array(
				'id'           => (int) $item['id'],
				'slotKey'      => (string) $item['slot_key'],
				'contentType'  => (string) $item['content_type'],
				'position'     => (int) $item['position'],
				'url'          => (string) $item['url'],
				'status'       => (string) $item['status'],
				'reviewReason' => (string) ( $item['review_reason'] ?? '' ),
				'submittedAt'  => (string) $item['submitted_at_gmt'],
				'reviewedAt'   => $item['reviewed_at_gmt'] ?? null,
			);
		}, $result['items'] ?? array() );
		return $result;
	}

	private static function affiliate_context( WP_REST_Request $request ) {
		$is_support = current_user_can( 'manage_woocommerce' );
		$target_id  = $is_support ? (int) $request->get_param( 'affiliate_id' ) : 0;
		$profile    = $target_id > 0
			? Nakama_Affiliates_Repository::profile_by_id( $target_id )
			: Nakama_Affiliates_Repository::profile_by_user( get_current_user_id() );
		return array( 'profile' => $profile, 'support' => $is_support && $target_id > 0 );
	}

	private static function fiscal_context( $profile, $support = false ) {
		if ( $support && method_exists( 'Nakama_Affiliates_Documents', 'current_for_affiliate' ) ) {
			$document = Nakama_Affiliates_Documents::current_for_affiliate( (int) $profile['id'] );
		} else {
			$document = Nakama_Affiliates_Documents::current_for_user();
		}
		return array(
			'required' => true,
			'status'   => $document ? (string) $document['status'] : 'missing',
			'document' => $document,
		);
	}

	private static function public_profile( $profile ) {
		return array(
			'code'                 => (string) $profile['code'],
			'status'               => (string) $profile['status'],
			'discountPercentage'   => round( (float) $profile['discount_rate'] * 100, 2 ),
			'commissionPercentage' => round( (float) $profile['commission_rate'] * 100, 2 ),
			'referralUrl'          => self::referral_url( $profile['code'] ),
		);
	}

	private static function referral_url( $code ) {
		return home_url( '/?ref=' . rawurlencode( (string) $code ) );
	}

	private static function profile_is_vip( $profile ) {
		if ( function_exists( 'get_userdata' ) && function_exists( 'user_can' ) ) {
			$user = get_userdata( (int) $profile['user_id'] );
			return $user ? (bool) user_can( $user, Nakama_Affiliates_Permissions::VIP_CAP ) : false;
		}
		return false;
	}

	private static function current_period() {
		$timezone = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( 'UTC' );
		return ( new DateTimeImmutable( 'now', $timezone ) )->format( 'Y-m' );
	}

	private static function no_store_response( array $data ) {
		$response = rest_ensure_response( $data );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}
}
