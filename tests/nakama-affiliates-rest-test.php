<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'DAY_IN_SECONDS', 86400 );

$affiliate_rest_actions = array();
$affiliate_rest_routes = array();

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
		return array( 'id' => 4, 'status' => 'active', 'code' => 'VALIDO' );
	}
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

echo "PHP Nakama Affiliates REST tests passed.\n";
