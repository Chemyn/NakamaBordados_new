<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_DISC_OPTION', 'nakama_discounts_settings' );
define( 'NAKAMA_DISC_CODES_OPTION', 'nakama_discount_codes' );

$registered_settings = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {}
function register_setting( $group, $option, $args = array() ) {
	global $registered_settings;
	$registered_settings[ $option ] = array( 'group' => $group, 'args' => $args );
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

require dirname( __DIR__ ) . '/nakama-discounts/includes/class-admin.php';

Nakama_Admin::register();
assert_same(
	'nakama_discounts_group',
	$registered_settings[ NAKAMA_DISC_CODES_OPTION ]['group'] ?? null,
	'The public-code collection is saved from the Nakama Discounts form.'
);
assert_same(
	array( 'Nakama_Discount_Codes', 'sanitize' ),
	$registered_settings[ NAKAMA_DISC_CODES_OPTION ]['args']['sanitize_callback'] ?? null,
	'Every admin save passes through the public-code validator.'
);

echo "PHP Nakama Discounts admin registration tests passed.\n";
