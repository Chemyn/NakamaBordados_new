<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_DISC_USAGE_OPTION', 'nakama_discount_code_usage' );

$test_usage_options = array();
$test_usage_uuid = 0;
$test_usage_actions = array();
$test_usage_orders = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $test_usage_actions;
	$test_usage_actions[ $hook ][] = array( 'callback' => $callback, 'priority' => $priority, 'accepted_args' => $accepted_args );
}

function get_option( $key, $default = false ) {
	global $test_usage_options;
	return array_key_exists( $key, $test_usage_options ) ? $test_usage_options[ $key ] : $default;
}
function update_option( $key, $value, $autoload = null ) {
	global $test_usage_options;
	$test_usage_options[ $key ] = $value;
	return true;
}
function add_option( $key, $value, $deprecated = '', $autoload = 'yes' ) {
	global $test_usage_options;
	if ( array_key_exists( $key, $test_usage_options ) ) {
		return false;
	}
	$test_usage_options[ $key ] = $value;
	return true;
}
function delete_option( $key ) {
	global $test_usage_options;
	unset( $test_usage_options[ $key ] );
	return true;
}
function wp_generate_uuid4() {
	global $test_usage_uuid;
	$test_usage_uuid++;
	return 'usage-token-' . $test_usage_uuid;
}
function current_datetime() { return new DateTimeImmutable( '2026-11-12 12:00:00', new DateTimeZone( 'UTC' ) ); }
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function sanitize_email( $value ) { return strtolower( trim( (string) $value ) ); }
function __( $text, $domain = null ) { return $text; }
function wc_get_order( $order_id ) {
	global $test_usage_orders;
	return $test_usage_orders[ (int) $order_id ] ?? null;
}

final class FakeUsageOrder {
	private $id;
	private $customer_id;
	private $email;
	public $meta = array();
	public $save_calls = 0;
	public function __construct( $id, $customer_id, $email ) {
		$this->id = (int) $id;
		$this->customer_id = (int) $customer_id;
		$this->email = (string) $email;
	}
	public function get_id() { return $this->id; }
	public function get_customer_id() { return $this->customer_id; }
	public function get_billing_email() { return $this->email; }
	public function get_meta( $key ) { return $this->meta[ $key ] ?? ''; }
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
	public function save() { $this->save_calls++; }
}

class Nakama_Discount_Codes {
	public static $codes = array();
	public static function find_by_id( $id ) { return self::$codes[ $id ] ?? null; }
}

function assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

require dirname( __DIR__ ) . '/nakama-discounts/includes/class-discount-code-usage.php';

$limited_code = array(
	'id'                  => 'limited',
	'usage_limit_enabled' => 'yes',
	'usage_limit'         => 2,
	'limit_per_customer'  => 'no',
);

$first = Nakama_Discount_Code_Usage::reserve( $limited_code, 'token-1', 'user:1' );
$second = Nakama_Discount_Code_Usage::reserve( $limited_code, 'token-2', 'user:2' );
$third = Nakama_Discount_Code_Usage::reserve( $limited_code, 'token-3', 'user:3' );

assert_same( true, $first['success'] ?? false, 'The first available use can be reserved.' );
assert_same( true, $second['success'] ?? false, 'The final available use can be reserved.' );
assert_same( false, $third['success'] ?? true, 'A reservation cannot exceed the global usage limit.' );
assert_same(
	array( 'used' => 0, 'reserved' => 2, 'committed' => 2, 'remaining' => 0 ),
	Nakama_Discount_Code_Usage::stats( $limited_code ),
	'Administrators can see the strict reservation count and remaining uses.'
);

$one_per_customer = array(
	'id'                  => 'one-per-customer',
	'usage_limit_enabled' => 'no',
	'usage_limit'         => 0,
	'limit_per_customer'  => 'yes',
);
$customer_first = Nakama_Discount_Code_Usage::reserve( $one_per_customer, 'customer-token-1', 'email:customer' );
$customer_repeat = Nakama_Discount_Code_Usage::reserve( $one_per_customer, 'customer-token-2', 'email:customer' );
$other_customer = Nakama_Discount_Code_Usage::reserve( $one_per_customer, 'customer-token-3', 'email:other' );
assert_same( true, $customer_first['success'] ?? false, 'A customer can reserve their first use.' );
assert_same( false, $customer_repeat['success'] ?? true, 'The same customer cannot reserve the code twice.' );
assert_same( true, $other_customer['success'] ?? false, 'A different customer can use a globally unlimited code.' );

assert_same( true, Nakama_Discount_Code_Usage::attach_order_usage( 'limited', 'token-1', 101 )['success'] ?? false, 'A saved order claims its reservation.' );
assert_same( true, Nakama_Discount_Code_Usage::consume( 'limited', 'token-1', 101, 'user:1' )['success'] ?? false, 'Payment consumes the reserved use.' );
assert_same( true, Nakama_Discount_Code_Usage::consume( 'limited', 'token-1', 101, 'user:1' )['success'] ?? false, 'Repeated payment events are idempotent.' );
assert_same(
	array( 'used' => 1, 'reserved' => 1, 'committed' => 2, 'remaining' => 0 ),
	Nakama_Discount_Code_Usage::stats( $limited_code ),
	'Consumption moves one reservation to the paid counter without changing committed capacity.'
);
assert_same( true, Nakama_Discount_Code_Usage::release( 'limited', 'token-1', 101 )['success'] ?? false, 'A cancellation or full refund returns the use.' );
assert_same( true, Nakama_Discount_Code_Usage::release( 'limited', 'token-1', 101 )['success'] ?? false, 'Repeated reversals are idempotent.' );
assert_same(
	array( 'used' => 0, 'reserved' => 1, 'committed' => 1, 'remaining' => 1 ),
	Nakama_Discount_Code_Usage::stats( $limited_code ),
	'Reversing a paid order restores one available use.'
);

$account_key = Nakama_Discount_Code_Usage::customer_key( 25, 'ignored@example.com' );
$guest_key = Nakama_Discount_Code_Usage::customer_key( 0, ' Customer@Example.com ' );
assert_same( 'user:25', $account_key, 'Logged-in customers are identified by their WordPress user.' );
assert_same( true, 0 === strpos( $guest_key, 'email:' ) && false === strpos( $guest_key, 'customer@example.com' ), 'Guest email identity is normalized and stored only as a hash.' );
assert_same( false, Nakama_Discount_Code_Usage::availability( $one_per_customer, 'email:customer' )['available'] ?? true, 'Checkout rejects a code already committed by the same customer.' );
assert_same( true, Nakama_Discount_Code_Usage::availability( $one_per_customer, 'email:new' )['available'] ?? false, 'Checkout keeps a per-customer code available to a new customer.' );

Nakama_Discount_Code_Usage::reserve( $limited_code, 'token-4', 'user:4' );
assert_same( false, Nakama_Discount_Code_Usage::availability( $limited_code, 'user:5' )['available'] ?? true, 'Checkout rejects a code after all global uses are committed.' );

$lifecycle_code = array(
	'id'                  => 'lifecycle',
	'usage_limit_enabled' => 'yes',
	'usage_limit'         => 1,
	'limit_per_customer'  => 'yes',
);
Nakama_Discount_Codes::$codes['lifecycle'] = $lifecycle_code;
$order = new FakeUsageOrder( 501, 77, 'buyer@example.com' );
$order->meta['_nakama_primary_type'] = 'public_code';
$order->meta['_nakama_public_code_id'] = 'lifecycle';
$test_usage_orders[501] = $order;

Nakama_Discount_Code_Usage::init();
assert_same( 20, $test_usage_actions['woocommerce_checkout_create_order'][0]['priority'] ?? null, 'Usage reservation runs after the discount snapshot is added to the order.' );
assert_same( 'release_order', $test_usage_actions['woocommerce_order_status_refunded'][0]['callback'][1] ?? null, 'Orders marked as refunded restore the available use.' );
assert_same( 2, $test_usage_actions['woocommerce_order_fully_refunded'][0]['accepted_args'] ?? null, 'Full refunds are observed with the WooCommerce hook contract.' );

Nakama_Discount_Code_Usage::reserve_order( $order, array() );
assert_same( 'reserved', $order->meta['_nakama_public_code_usage_state'] ?? null, 'Creating the order reserves capacity without consuming it.' );
assert_same( true, '' !== ( $order->meta['_nakama_public_code_usage_token'] ?? '' ), 'The order snapshots its idempotent reservation token.' );
Nakama_Discount_Code_Usage::attach_order( $order );
Nakama_Discount_Code_Usage::consume_order( 501 );
assert_same( 'used', $order->meta['_nakama_public_code_usage_state'] ?? null, 'Payment marks the reservation as consumed.' );
assert_same( 1, Nakama_Discount_Code_Usage::stats( $lifecycle_code )['used'], 'Payment increments the administrative used counter.' );
Nakama_Discount_Code_Usage::release_order( 501 );
assert_same( 'released', $order->meta['_nakama_public_code_usage_state'] ?? null, 'Cancellation or a full refund marks the use as returned.' );
assert_same( 0, Nakama_Discount_Code_Usage::stats( $lifecycle_code )['used'], 'Returning the order restores the available quantity.' );

echo "PHP Nakama discount-code usage tests passed.\n";
