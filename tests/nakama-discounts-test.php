<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_DISC_CODES_OPTION', 'nakama_discount_codes' );

$test_options = array();
$test_settings_errors = array();
$test_now = new DateTimeImmutable( '2026-09-18 12:00:00', new DateTimeZone( 'UTC' ) );
$test_uuid = 0;

function get_option( $key, $default = false ) {
	global $test_options;
	return array_key_exists( $key, $test_options ) ? $test_options[ $key ] : $default;
}

function update_option( $key, $value ) {
	global $test_options;
	$test_options[ $key ] = $value;
	return true;
}

function sanitize_text_field( $value ) {
	return trim( strip_tags( (string) $value ) );
}

function sanitize_key( $value ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) );
}

function __( $text, $domain = null ) {
	return $text;
}

function wp_generate_uuid4() {
	global $test_uuid;
	$test_uuid++;
	return '00000000-0000-4000-8000-' . str_pad( (string) $test_uuid, 12, '0', STR_PAD_LEFT );
}

function add_settings_error( $setting, $code, $message, $type = 'error' ) {
	global $test_settings_errors;
	$test_settings_errors[] = compact( 'setting', 'code', 'message', 'type' );
}

function wp_timezone() {
	return new DateTimeZone( 'UTC' );
}

function current_datetime() {
	global $test_now;
	return $test_now;
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

$codes_file = dirname( __DIR__ ) . '/nakama-discounts/includes/class-discount-codes.php';
assert_same( true, file_exists( $codes_file ), 'The public discount-code repository exists.' );
require $codes_file;

$sanitized = Nakama_Discount_Codes::sanitize( array(
	'items' => array(
		'new' => array(
			'code'            => ' verano-15 ',
			'percentage'      => '15',
			'enabled'         => 'yes',
			'start'           => '2026-09-01',
			'end'             => '2026-09-30',
			'allow_modifiers' => 'yes',
		),
	),
) );

$created = array_values( $sanitized['items'] ?? array() )[0] ?? array();
assert_same( 1, $sanitized['version'] ?? null, 'The stored collection carries its schema version.' );
assert_same( 'VERANO-15', $created['code'] ?? null, 'Codes are normalized for display and comparison.' );
assert_same( 0.15, $created['rate'] ?? null, 'Admin percentages are stored as decimal rates.' );
assert_same( 'yes', $created['allow_modifiers'] ?? null, 'Combination preference survives sanitization.' );

$test_options[ NAKAMA_DISC_CODES_OPTION ] = $sanitized;
$test_settings_errors = array();
$rejected = Nakama_Discount_Codes::sanitize( array(
	'items' => array(
		'new-a' => array( 'code' => 'REPETIDO', 'percentage' => '10' ),
		'new-b' => array( 'code' => 'repetido', 'percentage' => '0' ),
	),
) );
assert_same( $sanitized, $rejected, 'An invalid form preserves the previously published collection.' );
assert_same( true, count( $test_settings_errors ) >= 2, 'Invalid percentages and duplicate codes produce visible admin errors.' );

$test_settings_errors = array();
$missing_required = Nakama_Discount_Codes::sanitize( array(
	'items' => array(
		'new' => array(
			'create'     => 'yes',
			'code'       => '',
			'percentage' => '',
		),
	),
) );
$required_messages = array_column( $test_settings_errors, 'message' );
assert_same( $sanitized, $missing_required, 'Submitting the create action without required fields preserves published codes.' );
assert_same( true, in_array( 'Escribe un código.', $required_messages, true ), 'An explicit create action reports the missing code.' );
assert_same( true, in_array( 'Indica un porcentaje de descuento.', $required_messages, true ), 'An explicit create action reports the missing percentage.' );

$published_id = array_key_first( $sanitized['items'] );
$test_settings_errors = array();
$deleted_with_draft = Nakama_Discount_Codes::sanitize( array(
	'items' => array(
		$published_id => array(
			'id'         => $published_id,
			'code'       => 'VERANO-15',
			'percentage' => '15',
			'remove'     => 'yes',
		),
		'new' => array(
			'code'       => 'BORRADOR',
			'percentage' => '',
		),
	),
) );
assert_same( array(), $deleted_with_draft['items'], 'Deleting a saved code is not blocked by an unfinished creation draft.' );
assert_same( array(), $test_settings_errors, 'The ignored creation draft does not add validation errors during deletion.' );

$active_record = array(
	'id'              => 'summer',
	'code'            => 'VERANO-15',
	'rate'            => 0.15,
	'enabled'         => 'yes',
	'start'           => '2026-09-18',
	'end'             => '2026-09-18',
	'allow_modifiers' => 'yes',
);
assert_same( 'active', Nakama_Discount_Codes::status( $active_record, $test_now ), 'Both date limits include the full configured day.' );
assert_same( 'scheduled', Nakama_Discount_Codes::status( $active_record, new DateTimeImmutable( '2026-09-17 23:59:59', wp_timezone() ) ), 'A future code is scheduled.' );
assert_same( 'expired', Nakama_Discount_Codes::status( $active_record, new DateTimeImmutable( '2026-09-19 00:00:00', wp_timezone() ) ), 'A code expires after the final configured day.' );

$test_options[ NAKAMA_DISC_CODES_OPTION ] = array(
	'version' => 1,
	'items'   => array(
		'combo' => array(
			'id'              => 'combo',
			'code'            => 'PUBLICO15',
			'rate'            => 0.15,
			'enabled'         => 'yes',
			'start'           => '',
			'end'             => '',
			'allow_modifiers' => 'yes',
		),
		'solo' => array(
			'id'              => 'solo',
			'code'            => 'SOLO20',
			'rate'            => 0.20,
			'enabled'         => 'yes',
			'start'           => '',
			'end'             => '',
			'allow_modifiers' => 'no',
		),
	),
);

class Nakama_Settings {
	public static $values = array(
		'transfer_enabled'    => 'yes',
		'transfer_gateway_id' => 'bacs',
		'transfer_rate'       => 0.05,
		'free_ship_enabled'   => 'yes',
		'free_ship_threshold' => 800,
		'msi_enabled'         => 'yes',
		'msi_3_threshold'     => 800,
		'msi_6_threshold'     => 3000,
		'special_auto_if_better' => 'no',
	);

	public static function get( $key, $fallback = null ) {
		return array_key_exists( $key, self::$values ) ? self::$values[ $key ] : $fallback;
	}

	public static function amount( $key ) {
		return (float) self::get( $key, 0 );
	}

	public static function pct( $rate ) {
		return (string) ( (float) $rate * 100 ) . '%';
	}
}

class Nakama_Campaigns {
	public static function special_10_active() { return false; }
	public static function special_3x2_active() { return false; }
	public static function any_special_active() { return false; }
}

class Nakama_Customer_History {
	public static function get_welcome_tier( $customer_id, $email ) { return null; }
}

class Nakama_Context {
	public $customer_id = 0;
	public $email = '';
	public $subtotal = 1000.0;
	public $eligible_subtotal = 1000.0;
	public $payment_method = 'bacs';
	public $selected_promo = '';
	public $threexthree_prices = array();
	public $native_coupon_amount = 0.0;
	public $native_coupon_codes = array();
}

require dirname( __DIR__ ) . '/nakama-discounts/includes/class-engine.php';

$combinable_context = new Nakama_Context();
$combinable_context->selected_promo = Nakama_Discount_Codes::selection_key( 'combo' );
$combinable_plan = Nakama_Engine::resolve( $combinable_context );
assert_same( 'PUBLICO15', $combinable_plan['primary']['code'] ?? null, 'A selected active public code becomes the primary promotion.' );
assert_same( 150.0, $combinable_plan['primary']['amount'] ?? null, 'The public percentage is calculated from the eligible subtotal.' );
assert_same( 42.5, $combinable_plan['transfer']['amount'] ?? null, 'A combinable code keeps the transfer benefit on the discounted subtotal.' );
assert_same( true, $combinable_plan['free_ship'] ?? null, 'A combinable code keeps the shipping benefit.' );
assert_same( 3, $combinable_plan['msi']['months'] ?? null, 'A combinable code keeps MSI when the discounted total qualifies.' );

$exclusive_context = new Nakama_Context();
$exclusive_context->selected_promo = Nakama_Discount_Codes::selection_key( 'solo' );
$exclusive_plan = Nakama_Engine::resolve( $exclusive_context );
assert_same( 200.0, $exclusive_plan['primary']['amount'] ?? null, 'A non-combinable public code still applies its primary discount.' );
assert_same( false, $exclusive_plan['transfer']['applies'] ?? null, 'A non-combinable code disables transfer.' );
assert_same( false, $exclusive_plan['free_ship'] ?? null, 'A non-combinable code disables free shipping.' );
assert_same( 0, $exclusive_plan['msi']['months'] ?? null, 'A non-combinable code disables MSI.' );

$coupon_context = new Nakama_Context();
$coupon_context->selected_promo = Nakama_Discount_Codes::selection_key( 'combo' );
$coupon_context->native_coupon_codes = array( 'RECUPERA20' );
$coupon_context->native_coupon_amount = 250.0;
$coupon_plan = Nakama_Engine::resolve( $coupon_context );
assert_same( null, $coupon_plan['primary'], 'A native abandoned-cart coupon suppresses every Nakama primary discount.' );
assert_same( 750.0, $coupon_plan['totals']['after_primary'] ?? null, 'Downstream benefits use the subtotal after the native coupon.' );
assert_same( true, isset( $coupon_plan['options'][ Nakama_Discount_Codes::selection_key( 'combo' ) ] ), 'Nakama options remain visible while a native coupon is active.' );

$stale_context = new Nakama_Context();
$stale_context->selected_promo = Nakama_Discount_Codes::selection_key( 'missing' );
$stale_plan = Nakama_Engine::resolve( $stale_context );
assert_same( false, $stale_plan['selection_valid'] ?? true, 'An expired or deleted selection is reported as stale.' );

Nakama_Settings::$values['special_auto_if_better'] = 'yes';
$unselected_context = new Nakama_Context();
$unselected_plan = Nakama_Engine::resolve( $unselected_context );
assert_same( null, $unselected_plan['primary'], 'Public codes always require an explicit customer choice.' );

echo "PHP Nakama Discounts test suite passed.\n";
