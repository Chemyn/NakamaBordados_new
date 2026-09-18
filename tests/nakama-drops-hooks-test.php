<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$registered_actions = array();
$registered_filters = array();
$activation_hooks = array();

function plugin_dir_path( $file ) { return dirname( $file ) . '/'; }
function plugin_dir_url( $file ) { return 'https://example.test/plugins/nakama-drops/'; }
function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $registered_actions;
	$registered_actions[ $hook ][] = compact( 'callback', 'priority', 'accepted_args' );
}
function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $registered_filters;
	$registered_filters[ $hook ][] = compact( 'callback', 'priority', 'accepted_args' );
}
function register_activation_hook( $file, $callback ) {
	global $activation_hooks;
	$activation_hooks[] = $callback;
}

function assert_true( $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$plugin_file = dirname( __DIR__ ) . '/nakama-drops/nakama-drops.php';
assert_true( file_exists( $plugin_file ), 'The installable Nakama Drops bootstrap exists.' );
require $plugin_file;

assert_true( defined( 'NAKAMA_DROPS_VERSION' ), 'The plugin exposes a schema-aware version.' );
assert_true( in_array( array( 'Nakama_Drops_Installer', 'activate' ), $activation_hooks, true ), 'Activation installs storage and categories.' );
assert_true( isset( $registered_actions['plugins_loaded'] ), 'The plugin waits for WooCommerce before booting.' );

class WooCommerce {}
$bootstrap = $registered_actions['plugins_loaded'][0]['callback'];
$bootstrap();

foreach ( array( 'rest_api_init', 'admin_menu', 'nakama_drops_launch_campaign', 'woocommerce_checkout_create_order_line_item', 'woocommerce_order_status_cancelled' ) as $hook ) {
	assert_true( isset( $registered_actions[ $hook ] ), 'Required integration hook registered: ' . $hook );
}

foreach ( array( 'woocommerce_add_to_cart_validation', 'woocommerce_product_get_price', 'woocommerce_product_variation_get_price', 'woocommerce_variation_is_purchasable' ) as $hook ) {
	assert_true( isset( $registered_filters[ $hook ] ), 'Required validation/pricing filter registered: ' . $hook );
}

echo "PHP Nakama Drops hook tests passed.\n";
