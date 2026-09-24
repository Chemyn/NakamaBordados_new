<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_DISC_CODES_OPTION', 'nakama_discount_codes' );

$registered_actions = array();
$fired_actions = array();
$test_discount_options = array(
	NAKAMA_DISC_CODES_OPTION => array(
		'version' => 2,
		'items' => array(
			'manual-combo' => array(
				'id' => 'manual-combo', 'code' => 'MANUAL15', 'rate' => 0.15,
				'enabled' => 'yes', 'start' => '', 'end' => '',
				'allow_modifiers' => 'yes', 'entry_mode' => 'manual',
			),
		),
	),
);

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $registered_actions;
	$registered_actions[ $hook ][] = $callback;
}

function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {}
function do_action( $hook ) {
	global $fired_actions;
	$args = func_get_args();
	array_shift( $args );
	$fired_actions[ $hook ][] = $args;
}
function get_current_user_id() { return 0; }
function has_term( $term, $taxonomy, $product_id ) { return false; }
function sanitize_text_field( $value ) { return trim( (string) $value ); }
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function wp_unslash( $value ) { return $value; }
function __( $text, $domain = null ) { return $text; }
function esc_attr( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function esc_html__( $text, $domain = null ) { return esc_html( $text ); }
function wp_kses_post( $value ) { return (string) $value; }
function wc_price( $amount ) { return '$' . number_format( (float) $amount, 2 ); }
function get_option( $key, $fallback = false ) {
	global $test_discount_options;
	return array_key_exists( $key, $test_discount_options ) ? $test_discount_options[ $key ] : $fallback;
}
function update_option( $key, $value ) {
	global $test_discount_options;
	$test_discount_options[ $key ] = $value;
	return true;
}
function current_datetime() { return new DateTimeImmutable( '2026-09-23 12:00:00', new DateTimeZone( 'UTC' ) ); }
function wp_timezone() { return new DateTimeZone( 'UTC' ); }
function apply_filters( $hook, $value ) { return $value; }

class Nakama_Settings {
	public static $values = array(
		'transfer_enabled' => 'yes',
		'transfer_rate'    => 0.05,
	);
	public static function get( $key, $fallback = null ) {
		if ( 'special_3x2_categories' === $key ) {
			return array();
		}
		if ( 'special_auto_if_better' === $key ) {
			return 'no';
		}
		return array_key_exists( $key, self::$values ) ? self::$values[ $key ] : $fallback;
	}
	public static function amount( $key ) { return 0.0; }
	public static function pct( $rate ) { return (string) ( (float) $rate * 100 ) . '%'; }
}

class Nakama_Campaigns {
	public static function special_10_active() { return false; }
	public static function special_3x2_active() { return false; }
}

class Nakama_Customer_History {
	public static function get_welcome_tier( $customer_id, $email ) { return null; }
}

final class FakeDiscountSession {
	public $values = array();
	public function get( $key, $fallback = '' ) {
		return array_key_exists( $key, $this->values ) ? $this->values[ $key ] : $fallback;
	}
	public function set( $key, $value ) { $this->values[ $key ] = $value; }
}

final class FakeDiscountCart {
	public $coupons = array( 'RECUPERA20' );
	public $remove_calls = 0;
	public function get_subtotal() { return 1000.0; }
	public function get_cart() {
		return array( array( 'product_id' => 10, 'line_subtotal' => 1000.0, 'quantity' => 1 ) );
	}
	public function get_applied_coupons() { return $this->coupons; }
	public function get_discount_total() { return 200.0; }
	public function remove_coupons() {
		$this->coupons = array();
		$this->remove_calls++;
	}
	public function calculate_totals() {}
}

final class FakeDiscountWooCommerce {
	public $session;
	public $cart;
	public $customer = null;
	public function __construct() {
		$this->session = new FakeDiscountSession();
		$this->cart = new FakeDiscountCart();
	}
}

final class FakeDiscountOrder {
	public $meta = array();
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
}

$fake_discount_wc = new FakeDiscountWooCommerce();
function WC() {
	global $fake_discount_wc;
	return $fake_discount_wc;
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

require dirname( __DIR__ ) . '/nakama-discounts/includes/class-discount-codes.php';
require dirname( __DIR__ ) . '/nakama-discounts/includes/class-context.php';
require dirname( __DIR__ ) . '/nakama-discounts/includes/class-engine.php';
require dirname( __DIR__ ) . '/nakama-discounts/includes/class-cart.php';

$context = Nakama_Context::build( WC()->cart );
assert_same( array( 'RECUPERA20' ), $context->native_coupon_codes, 'The engine context sees native abandoned-cart coupons.' );
assert_same( 200.0, $context->native_coupon_amount, 'The engine context sees the native coupon discount.' );

$resolved_manual = Nakama_Discount_Codes::resolve_manual_code( array( 'handled' => false ), ' manual15 ' );
assert_same( true, $resolved_manual['valid'] ?? false, 'An active manual code resolves on the server.' );
assert_same( 'public_code:manual-combo', $resolved_manual['selection_key'] ?? null, 'Manual resolution exposes only the stable selection key.' );

$bridge_result = Nakama_Discount_Codes::apply_checkout_bridge( array( 'handled' => false ), 'MANUAL15' );
assert_same( true, $bridge_result['success'] ?? false, 'The bridge revalidates and applies a manual code.' );
assert_same( 'manual-combo', WC()->session->get( 'nakama_unlocked_public_code_id' ), 'The validated manual ID is unlocked in the WooCommerce session.' );
assert_same( 'public_code:manual-combo', WC()->session->get( 'nakama_selected_promo' ), 'The validated manual code is selected immediately.' );
assert_same( array(), WC()->cart->coupons, 'Applying the manual code removes native coupons.' );

Nakama_Discount_Codes::on_promotion_selected( 'affiliate_code:7' );
assert_same( '', WC()->session->get( 'nakama_unlocked_public_code_id' ), 'Selecting an affiliate clears the manual Nakama unlock.' );

WC()->cart->coupons = array( 'RECUPERA20' );
WC()->cart->remove_calls = 0;
$fired_actions = array();

$options = array(
	'public_code:combo' => array( 'type' => 'public_code', 'code' => 'PUBLICO15' ),
);
assert_same(
	true,
	Nakama_Cart::apply_selection( 'public_code:combo', $options ),
	'A valid Nakama selection is accepted.'
);
assert_same( array(), WC()->cart->coupons, 'Selecting Nakama removes the abandoned-cart coupon.' );
assert_same( 1, WC()->cart->remove_calls, 'Native coupons are removed exactly once.' );
assert_same( 'public_code:combo', WC()->session->get( 'nakama_selected_promo' ), 'The confirmed Nakama selection is stored in session.' );
assert_same( 1, count( $fired_actions['nakama_discount_selection_applied'] ?? array() ), 'Independent integrations are notified after a primary selection changes.' );

Nakama_Cart::clear_selected_promo( 'RECUPERA20' );
assert_same( '', WC()->session->get( 'nakama_selected_promo' ), 'Applying a native coupon clears the Nakama selection.' );

WC()->cart->coupons = array( 'RECUPERA20' );
assert_same(
	false,
	Nakama_Cart::apply_selection( 'public_code:missing', $options ),
	'An unavailable promotion cannot be selected by forging its key.'
);
assert_same( array( 'RECUPERA20' ), WC()->cart->coupons, 'A rejected selection does not remove the current coupon.' );

$render_plan = array(
	'primary' => array(
		'type'            => 'public_code',
		'selection_key'   => 'public_code:combo',
		'id'              => 'combo',
		'code'            => 'PUBLICO15',
		'rate'            => 0.15,
		'amount'          => 150.0,
		'allow_modifiers' => true,
		'entry_mode'      => 'manual',
	),
	'options' => array(
		'public_code:combo' => array(
			'type'            => 'public_code',
			'selection_key'   => 'public_code:combo',
			'code'            => 'PUBLICO15',
			'label'           => 'Código PUBLICO15 (15%)',
			'amount'          => 150.0,
			'allow_modifiers' => true,
			'entry_mode'      => 'manual',
			'auto'            => false,
		),
		'affiliate_code:7' => array(
			'type'            => 'affiliate_code',
			'selection_key'   => 'affiliate_code:7',
			'code'            => 'NICO',
			'label'           => 'Código de afiliado NICO',
			'amount'          => 100.0,
			'allow_modifiers' => false,
			'auto'            => false,
			'visible'         => false,
		),
	),
	'free_ship' => false,
	'msi' => array( 'months' => 0 ),
	'transfer' => array( 'applies' => false, 'amount' => 0.0 ),
	'allows_modifiers' => true,
	'totals' => array( 'eligible_subtotal' => 1000.0 ),
);
$plan_property = new ReflectionProperty( Nakama_Cart::class, 'plan' );
$plan_property->setValue( null, $render_plan );
ob_start();
Nakama_Cart::render_promo_ui();
$promo_html = ob_get_clean();
assert_same( true, false !== strpos( $promo_html, 'PUBLICO15' ), 'The checkout renders every eligible public code.' );
assert_same( true, false !== strpos( $promo_html, 'aria-pressed="true"' ), 'The selected public code exposes its accessible state.' );
assert_same( true, false !== strpos( $promo_html, 'Conserva transferencia, envío gratis y MSI' ), 'The customer can see what a combinable code preserves.' );
assert_same( false, false !== strpos( $promo_html, 'NICO' ), 'A hidden affiliate candidate never becomes a public promotion button.' );

$render_plan['primary']['allow_modifiers'] = false;
$render_plan['options']['public_code:combo']['allow_modifiers'] = false;
$render_plan['allows_modifiers'] = false;
$plan_property->setValue( null, $render_plan );
ob_start();
Nakama_Cart::render_promo_ui();
$exclusive_html = ob_get_clean();
assert_same( false, false !== strpos( $exclusive_html, 'Paga por transferencia' ), 'A non-combinable code never advertises an unavailable transfer benefit.' );

$render_plan['primary']['allow_modifiers'] = true;
$render_plan['options']['public_code:combo']['allow_modifiers'] = true;
$render_plan['allows_modifiers'] = true;
$plan_property->setValue( null, $render_plan );
$order = new FakeDiscountOrder();
Nakama_Cart::save_order_meta( $order, array() );
assert_same( 'PUBLICO15', $order->meta['_nakama_public_code'] ?? null, 'The order snapshots the selected public code.' );
assert_same( 0.15, $order->meta['_nakama_primary_rate'] ?? null, 'The order snapshots the selected percentage.' );
assert_same( 'yes', $order->meta['_nakama_primary_combinable'] ?? null, 'The order snapshots whether complementary benefits were allowed.' );
assert_same( 'manual', $order->meta['_nakama_public_code_entry_mode'] ?? null, 'The order snapshots how the public code was entered.' );
assert_same( 1, count( $fired_actions['nakama_discounts_order_plan_saved'] ?? array() ), 'The final discount plan is exposed once for independent integrations.' );
assert_same( $order, $fired_actions['nakama_discounts_order_plan_saved'][0][0] ?? null, 'The order-plan hook receives the order being created.' );

echo "PHP Nakama Discounts cart integration tests passed.\n";
