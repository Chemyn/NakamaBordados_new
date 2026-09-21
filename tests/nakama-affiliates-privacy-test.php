<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'DAY_IN_SECONDS', 86400 );

$affiliate_privacy_routes = array();
$affiliate_privacy_profile_lookup = '';

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {}
function register_rest_route( $namespace, $route, $args ) {
	global $affiliate_privacy_routes;
	$affiliate_privacy_routes[ $namespace . $route ] = $args;
}
function rest_ensure_response( $data ) { return new WP_REST_Response( $data ); }
function get_current_user_id() { return 7; }
function current_user_can( $capability ) { return 'access_affiliate_dashboard' === $capability; }
function wp_timezone() { return new DateTimeZone( 'America/Hermosillo' ); }
function home_url( $path = '' ) { return 'https://nakamabordados.com' . $path; }

final class WP_REST_Server { const READABLE = 'GET'; }
final class WP_REST_Request {
	private $params;
	private $method;
	public function __construct( array $params = array(), $method = 'GET' ) { $this->params = $params; $this->method = $method; }
	public function get_param( $key ) { return $this->params[ $key ] ?? null; }
	public function get_method() { return $this->method; }
	public function get_json_params() { return $this->params; }
}
final class WP_REST_Response {
	public $data;
	public $headers = array();
	public function __construct( $data ) { $this->data = $data; }
	public function header( $name, $value ) { $this->headers[ $name ] = $value; }
}

final class Nakama_Affiliates_Codes {
	public static function public_validation( $code ) {
		return array(
			'valid' => true, 'code' => 'SAFE10', 'attribution_days' => 30,
			'discount_percentage' => 10, 'affiliate_id' => 4, 'user_id' => 7,
			'buyer_email' => 'comprador@example.test',
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
		global $affiliate_privacy_profile_lookup;
		$affiliate_privacy_profile_lookup = 'user:' . (int) $user_id;
		return array( 'id' => 4, 'user_id' => 7, 'status' => 'active', 'code' => 'SAFE10', 'discount_rate' => .1, 'commission_rate' => .1, 'internal_note' => 'nota-interna' );
	}
	public static function profile_by_id( $affiliate_id ) {
		global $affiliate_privacy_profile_lookup;
		$affiliate_privacy_profile_lookup = 'id:' . (int) $affiliate_id;
		return array( 'id' => (int) $affiliate_id, 'user_id' => 999, 'status' => 'active', 'code' => 'OTHER', 'discount_rate' => .1, 'commission_rate' => .1 );
	}
	public static function ledger_summary( $affiliate_id, $period ) { return array( 'sales_count' => 1, 'refund_count' => 0, 'sales_mxn' => 1000, 'commission_mxn' => 100 ); }
	public static function ledger_for_affiliate( $affiliate_id, $page, $per_page ) {
		return array( 'has_more' => false, 'items' => array( array(
			'id' => 1, 'event_type' => 'sale', 'order_id' => 10, 'period_key' => '2026-09',
			'source_currency' => 'MXN', 'source_base' => 1000, 'rate_to_mxn' => 1,
			'base_mxn' => 1000, 'commission_mxn' => 100, 'status' => 'posted',
			'occurred_at_gmt' => '2026-09-20 12:00:00', 'affiliate_id' => $affiliate_id,
			'billing_email' => 'comprador@example.test', 'shipping_address' => 'domicilio-comprador',
			'review_reason' => 'nota-interna', 'storage_key' => 'fiscal/private.pdf',
		) ) );
	}
	public static function closures_for_affiliate( $affiliate_id, $page, $per_page ) {
		return array( 'has_more' => false, 'items' => array( array(
			'id' => 2, 'affiliate_id' => $affiliate_id, 'period_key' => '2026-08', 'status' => 'paid',
			'sales_mxn' => 1000, 'refunds_mxn' => 0, 'adjustments_mxn' => 0,
			'commission_gross_mxn' => 100, 'isr_withheld_mxn' => 0, 'iva_withheld_mxn' => 0,
			'other_adjustments_mxn' => 0, 'net_mxn' => 100, 'paid_net_mxn' => 100,
			'paid_at_gmt' => '2026-09-05 12:00:00', 'payment_reference' => 'TRANSFER-1',
			'payment_document_id' => 5, 'payment_reversed_at_gmt' => null,
			'payment_reversal_reason' => null, 'storage_key' => 'payments/private.pdf',
			'sha256' => str_repeat( 'a', 64 ), 'internal_note' => 'nota-interna',
		) ) );
	}
}
final class Nakama_Affiliates_Documents {
	public static function current_for_user() { return array( 'id' => 3, 'status' => 'approved', 'fileName' => 'constancia.pdf', 'fileSize' => 200, 'uploadedAt' => '2026-09-01', 'reviewedAt' => '2026-09-02', 'reason' => null ); }
}
final class Nakama_Affiliates_Benefits {
	public static function progress( $sales ) { return array( 'sales_mxn' => $sales, 'tier' => 1, 'quota' => 1, 'next' => null, 'milestones' => array( 'second' => array( 'threshold_mxn' => 10000, 'remaining_mxn' => 9000, 'reached' => false, 'progress_percent' => 10 ), 'third' => array( 'threshold_mxn' => 30000, 'remaining_mxn' => 29000, 'reached' => false, 'progress_percent' => 3.33 ) ) ); }
	public static function for_period( $affiliate_id, $period ) { return array( 'id' => 6, 'period_key' => $period, 'source_period_key' => '2026-08', 'source_closure_id' => 2, 'valid_sales_mxn' => 1000, 'tier' => 1, 'quota' => 1, 'manual_reason' => 'nota-interna', 'is_default' => 0 ); }
}
final class Nakama_Affiliates_Requests {
	public static function for_period( $affiliate_id, $period ) {
		return array(
			'id' => 8, 'affiliate_id' => $affiliate_id, 'period_key' => $period, 'status' => 'submitted',
			'shipping_covered' => 1, 'carrier' => '', 'tracking_code' => '', 'rejection_reason' => '',
			'submitted_at_gmt' => '2026-09-20', 'completed_at_gmt' => null,
			'address_json' => '{"private":true}', 'address' => array( 'name' => 'Afiliado actual', 'address1' => 'Su propia dirección' ),
			'internal_note' => 'nota-interna', 'items' => array(),
		);
	}
	public static function submit( $affiliate_id, $period, $items, $address, $is_vip, $actor_user_id ) {
		return array(
			'success' => false,
			'reason' => 'evidence_required',
			'internal_note' => 'nota-interna',
			'request' => self::for_period( $affiliate_id, $period ),
		);
	}
}
final class Nakama_Affiliates_Products {
	public static function catalog( $vip, $page, $per_page ) { return array( 'page' => 1, 'hasMore' => false, 'items' => array() ); }
	public static function official_accounts() { return array( '@nakamabordados' ); }
}
final class Nakama_Affiliates_Evidence {
	public static function for_request( $request_id, $affiliate_id ) {
		return array( 'success' => true, 'request_id' => $request_id, 'affiliate_id' => $affiliate_id, 'internal_note' => 'nota-interna', 'items' => array( array(
			'id' => 9, 'slot_key' => 'reel_1', 'content_type' => 'reel', 'position' => 1,
			'url' => 'https://instagram.com/reel/safe', 'status' => 'pending', 'review_reason' => '',
			'submitted_at_gmt' => '2026-09-20', 'reviewed_at_gmt' => null, 'reviewed_by' => 91,
			'internal_note' => 'nota-interna',
		) ) );
	}
}
final class Nakama_Affiliates_Payments {}

function affiliates_privacy_assert( $condition, string $message ): void {
	if ( ! $condition ) throw new RuntimeException( $message );
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-rest.php';
Nakama_Affiliates_REST::register_routes();

foreach ( $affiliate_privacy_routes as $route => $definitions ) {
	if ( false === strpos( $route, '/affiliates/me' ) ) continue;
	$definitions = isset( $definitions['callback'] ) ? array( $definitions ) : $definitions;
	foreach ( $definitions as $definition ) {
		affiliates_privacy_assert( array( 'Nakama_Affiliates_REST', 'affiliate_permission' ) === $definition['permission_callback'], "Private route {$route} must use the affiliate permission gate." );
	}
}

$code = Nakama_Affiliates_REST::validate_code( new WP_REST_Request( array( 'code' => 'SAFE10' ) ) );
$me = Nakama_Affiliates_REST::me( new WP_REST_Request() );
$dashboard = Nakama_Affiliates_REST::dashboard( new WP_REST_Request() );
$sales = Nakama_Affiliates_REST::sales( new WP_REST_Request( array( 'affiliate_id' => 999, 'page' => 1 ) ) );
affiliates_privacy_assert( 'user:7' === $affiliate_privacy_profile_lookup, 'A non-admin cannot select another affiliate through a query parameter.' );
$payments = Nakama_Affiliates_REST::payments( new WP_REST_Request( array( 'affiliate_id' => 999, 'page' => 1 ) ) );
$request = Nakama_Affiliates_REST::product_request( new WP_REST_Request() );
$request_failure = Nakama_Affiliates_REST::product_request( new WP_REST_Request( array( 'items' => array(), 'address' => array() ), 'POST' ) );
$evidence = Nakama_Affiliates_REST::evidence( new WP_REST_Request( array( 'request_id' => 8 ) ) );

$payload = json_encode( array( $code->data, $me->data, $dashboard->data, $sales->data, $payments->data, $request->data, $request_failure->data, $evidence->data ) );
foreach ( array( 'comprador@example.test', 'domicilio-comprador', 'fiscal/private.pdf', 'payments/private.pdf', 'nota-interna', str_repeat( 'a', 64 ) ) as $private_value ) {
	affiliates_privacy_assert( false === strpos( $payload, $private_value ), "REST payload leaked private value {$private_value}." );
}
foreach ( array( 'affiliate_id', 'user_id', 'billing_email', 'shipping_address', 'storage_key', 'sha256', 'reviewed_by', 'address_json', 'internal_note' ) as $private_key ) {
	affiliates_privacy_assert( false === strpos( $payload, '"' . $private_key . '"' ), "REST payload leaked private key {$private_key}." );
}
affiliates_privacy_assert( isset( $request->data['request']['address']['address1'] ), 'The affiliate may still see the delivery address they submitted.' );
affiliates_privacy_assert( 'no-store, no-cache, must-revalidate, max-age=0' === $sales->headers['Cache-Control'], 'Private responses are never cacheable.' );

$uninstall = file_get_contents( dirname( __DIR__ ) . '/nakama-affiliates/uninstall.php' );
$guard = strpos( $uninstall, "true !== NAKAMA_AFFILIATES_PURGE_DATA" );
$drop = strpos( $uninstall, 'DROP TABLE IF EXISTS' );
affiliates_privacy_assert( false !== $guard && false !== $drop && $guard < $drop, 'Uninstall must return before destructive SQL unless the explicit purge constant is true.' );

$package = file_get_contents( dirname( __DIR__ ) . '/scripts/package-nakama-affiliates.ps1' );
foreach ( array( 'nakama-affiliates/', 'tests', 'docs', 'node_modules', '.git' ) as $contract ) {
	affiliates_privacy_assert( false !== strpos( $package, $contract ), "Packaging contract must mention {$contract}." );
}

echo "PHP Nakama Affiliates privacy tests passed.\n";
