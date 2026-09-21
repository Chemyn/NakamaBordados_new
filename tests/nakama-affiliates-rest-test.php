<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'DAY_IN_SECONDS', 86400 );

$affiliate_rest_actions = array();
$affiliate_rest_routes = array();
$affiliate_rest_document_status = 'pending';
$affiliate_rest_ledger_filter = 0;

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_rest_actions;
	$affiliate_rest_actions[ $hook ][] = $callback;
}

function register_rest_route( $namespace, $route, $args ) {
	global $affiliate_rest_routes;
	$affiliate_rest_routes[ $namespace . $route ] = $args;
}

function rest_ensure_response( $data ) {
	return new WP_REST_Response( $data, 200 );
}

function current_user_can( $capability ) {
	return 'access_affiliate_dashboard' === $capability;
}

function wp_timezone() { return new DateTimeZone( 'America/Hermosillo' ); }
function home_url( $path = '' ) { return 'https://nakamabordados.com' . $path; }

function get_current_user_id() {
	return 7;
}

final class WP_REST_Server {
	const READABLE = 'GET';
}

final class WP_REST_Request {
	private $params;
	public function __construct( array $params ) { $this->params = $params; }
	public function get_param( $key ) { return $this->params[ $key ] ?? null; }
}

final class WP_REST_Response {
	public $data;
	public $status;
	public $headers = array();
	public function __construct( $data, $status = 200 ) { $this->data = $data; $this->status = $status; }
	public function header( $name, $value ) { $this->headers[ $name ] = $value; }
}

final class Nakama_Affiliates_Codes {
	public static function public_validation( $code ) {
		if ( 'VALIDO' !== strtoupper( trim( (string) $code ) ) ) {
			return array( 'valid' => false, 'message' => 'Código de afiliado no válido.' );
		}
		return array(
			'valid'            => true,
			'code'             => 'VALIDO',
			'message'          => 'Código de afiliado aplicado.',
			'attribution_days' => 30,
			'affiliate_id'     => 88,
			'user_id'          => 99,
			'discount_rate'    => 0.10,
			'discount_percentage' => 10.0,
		);
	}
}

final class Nakama_Affiliates_Permissions {
	const VIP_CAP = 'nakama_affiliate_vip';
	public static function current_user_can_access() { return true; }
	public static function current_user_is_vip() { return false; }
}

final class Nakama_Affiliates_Repository {
	public static function profile_by_user( $user_id ) {
		return array( 'id' => 4, 'user_id' => 7, 'status' => 'active', 'code' => 'VALIDO', 'discount_rate' => 0.10, 'commission_rate' => 0.10 );
	}
	public static function profile_by_id( $affiliate_id ) { return 4 === (int) $affiliate_id ? self::profile_by_user( 7 ) : null; }
	public static function ledger_summary( $affiliate_id, $period ) {
		global $affiliate_rest_ledger_filter;
		$affiliate_rest_ledger_filter = (int) $affiliate_id;
		return array( 'sales_count' => 3, 'refund_count' => 1, 'sales_mxn' => 12500.0, 'commission_mxn' => 1250.0 );
	}
	public static function ledger_for_affiliate( $affiliate_id, $page, $per_page ) {
		global $affiliate_rest_ledger_filter;
		$affiliate_rest_ledger_filter = (int) $affiliate_id;
		return array(
			'items' => array( array(
				'id' => 9,
				'event_type' => 'sale',
				'order_id' => 501,
				'period_key' => '2026-09',
				'source_currency' => 'MXN',
				'source_base' => 1000,
				'rate_to_mxn' => 1,
				'base_mxn' => 1000,
				'commission_mxn' => 100,
				'status' => 'posted',
				'occurred_at_gmt' => '2026-09-20 12:00:00',
			) ),
			'has_more' => false,
		);
	}
	public static function closures_for_affiliate( $affiliate_id, $page, $per_page ) {
		global $affiliate_rest_ledger_filter;
		$affiliate_rest_ledger_filter = (int) $affiliate_id;
		return array( 'has_more' => false, 'items' => array( array(
			'id' => 12,
			'period_key' => '2026-08',
			'status' => 'paid',
			'sales_mxn' => 11000,
			'refunds_mxn' => -1000,
			'adjustments_mxn' => 0,
			'commission_gross_mxn' => 1000,
			'isr_withheld_mxn' => 90,
			'iva_withheld_mxn' => 40,
			'other_adjustments_mxn' => -10,
			'net_mxn' => 860,
			'paid_net_mxn' => 860,
			'paid_at_gmt' => '2026-09-05 12:00:00',
			'payment_document_id' => 22,
			'payment_reversed_at_gmt' => null,
			'payment_reversal_reason' => null,
		) ) );
	}
}

final class Nakama_Affiliates_Documents {
	public static function current_for_user() {
		global $affiliate_rest_document_status;
		return array( 'id' => 2, 'status' => $affiliate_rest_document_status, 'fileName' => 'constancia.pdf', 'fileSize' => 100, 'uploadedAt' => '2026-09-20 12:00:00', 'reviewedAt' => null, 'reason' => null );
	}
}

final class Nakama_Affiliates_Payments {
	public static function downloadable( $document_id ) { return array( 'success' => false, 'reason' => 'not_found' ); }
}

function affiliates_rest_assert( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$rest_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-rest.php';
affiliates_rest_assert( file_exists( $rest_file ), 'The affiliate REST controller exists.' );
require $rest_file;

Nakama_Affiliates_REST::init();
affiliates_rest_assert( ! empty( $affiliate_rest_actions['rest_api_init'] ), 'REST routes are registered during rest_api_init.' );
Nakama_Affiliates_REST::register_routes();
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/code'] ), 'The public code validation route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/access'] ), 'The authenticated access probe exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/fiscal-document'] ), 'The private fiscal document upload and status route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/fiscal-document/download'] ), 'The owner-only fiscal download route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/admin/documents/(?P<id>\\d+)/review'] ), 'The administrative document review route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me'] ), 'The private affiliate identity route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/dashboard'] ), 'The private affiliate dashboard route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/sales'] ), 'The private affiliate sales route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/payments'] ), 'The private payment history route exists.' );
affiliates_rest_assert( isset( $affiliate_rest_routes['nakama/v1/affiliates/me/payments/(?P<id>\d+)/download'] ), 'The owner-authorized receipt download route exists.' );

$response = Nakama_Affiliates_REST::validate_code( new WP_REST_Request( array( 'code' => 'valido' ) ) );
affiliates_rest_assert( true === $response->data['valid'], 'A valid public code receives a positive response.' );
affiliates_rest_assert( 'VALIDO' === $response->data['code'], 'The public response returns the normalized code.' );
affiliates_rest_assert( isset( $response->data['expiresAt'] ), 'The public response includes the attribution expiration.' );
affiliates_rest_assert( 10.0 === $response->data['discountPercentage'], 'The public response exposes only the display percentage returned by the server.' );
foreach ( array( 'affiliate_id', 'user_id', 'discount_rate', 'profile' ) as $private_key ) {
	affiliates_rest_assert( ! array_key_exists( $private_key, $response->data ), "The public response hides {$private_key}." );
}
affiliates_rest_assert( 'no-store, no-cache, must-revalidate, max-age=0' === $response->headers['Cache-Control'], 'Code validation cannot be served from a stale cache.' );

$invalid = Nakama_Affiliates_REST::validate_code( new WP_REST_Request( array( 'code' => 'missing' ) ) );
affiliates_rest_assert( false === $invalid->data['valid'], 'Invalid and unavailable codes fail closed.' );
affiliates_rest_assert( ! isset( $invalid->data['code'] ), 'An invalid response does not echo a candidate code.' );

$access = Nakama_Affiliates_REST::access();
affiliates_rest_assert( true === $access->data['can'], 'The access probe reflects the server capability.' );
affiliates_rest_assert( false === $access->data['vip'], 'VIP remains a separate permission.' );
affiliates_rest_assert( 'active' === $access->data['status'], 'The operational profile status is exposed only to its owner.' );

$me = Nakama_Affiliates_REST::me( new WP_REST_Request( array() ) );
affiliates_rest_assert( false === $me->data['financialAccess'], 'A pending fiscal document blocks financial information.' );
affiliates_rest_assert( 'pending' === $me->data['fiscal']['status'], 'The owner receives only the current fiscal status before approval.' );
$blocked_dashboard = Nakama_Affiliates_REST::dashboard( new WP_REST_Request( array() ) );
affiliates_rest_assert( 'fiscal_required' === $blocked_dashboard->data['code'], 'Dashboard data stays gated before fiscal approval.' );

$affiliate_rest_document_status = 'approved';
$dashboard = Nakama_Affiliates_REST::dashboard( new WP_REST_Request( array() ) );
affiliates_rest_assert( true === $dashboard->data['success'], 'An approved affiliate can read their dashboard.' );
affiliates_rest_assert( 1250.0 === $dashboard->data['summary']['commissionMxn'], 'Dashboard commission comes from the server ledger.' );
affiliates_rest_assert( 4 === $affiliate_rest_ledger_filter, 'Financial queries are always filtered by the authenticated affiliate.' );
$sales = Nakama_Affiliates_REST::sales( new WP_REST_Request( array( 'page' => 1 ) ) );
affiliates_rest_assert( 501 === $sales->data['items'][0]['orderId'], 'Sales expose the affiliate event without buyer identity.' );
foreach ( array( 'buyer', 'customer', 'email', 'name', 'address' ) as $pii_key ) {
	affiliates_rest_assert( ! array_key_exists( $pii_key, $sales->data['items'][0] ), "Affiliate sales never expose {$pii_key}." );
}
$payments = Nakama_Affiliates_REST::payments( new WP_REST_Request( array( 'page' => 1 ) ) );
affiliates_rest_assert( 22 === $payments->data['items'][0]['receiptId'], 'Payment history exposes only the owner receipt identifier.' );
affiliates_rest_assert( 860.0 === $payments->data['items'][0]['paidNetMxn'], 'Payment history keeps the frozen paid net.' );
affiliates_rest_assert( -1000.0 === $payments->data['items'][0]['refundsMxn'], 'Payment history keeps signed refunds without rewriting the close.' );
affiliates_rest_assert( 4 === $affiliate_rest_ledger_filter, 'Payment history is filtered by the authenticated affiliate.' );

echo "PHP Nakama Affiliates REST tests passed.\n";
