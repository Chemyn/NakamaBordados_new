<?php
/**
 * Plugin Name: Nakama Drops
 * Description: Preventas con lanzamiento programado, cupo opcional y precios por variación para WooCommerce.
 * Version: 1.0.0
 * Author: Nakama Bordados
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Text Domain: nakama-drops
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NAKAMA_DROPS_VERSION', '1.0.0' );
define( 'NAKAMA_DROPS_DB_VERSION', '1' );
define( 'NAKAMA_DROPS_FILE', __FILE__ );
define( 'NAKAMA_DROPS_PATH', plugin_dir_path( __FILE__ ) );
define( 'NAKAMA_DROPS_URL', plugin_dir_url( __FILE__ ) );

$nakama_drops_includes = array(
	'includes/class-drops-domain.php',
	'includes/class-drops-installer.php',
	'includes/class-drops-repository.php',
	'includes/class-drops-pricing.php',
	'includes/class-drops-lifecycle.php',
	'includes/class-drops-quota.php',
	'includes/class-drops-orders.php',
	'includes/class-drops-rest.php',
	'includes/class-drops-admin.php',
);

foreach ( $nakama_drops_includes as $nakama_drops_include ) {
	require_once NAKAMA_DROPS_PATH . $nakama_drops_include;
}

register_activation_hook( __FILE__, array( 'Nakama_Drops_Installer', 'activate' ) );

add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', array( 'Nakama_Drops_Installer', 'woocommerce_notice' ) );
		return;
	}

	Nakama_Drops_Pricing::init();
	Nakama_Drops_Lifecycle::init();
	Nakama_Drops_Quota::init();
	Nakama_Drops_Orders::init();
	Nakama_Drops_REST::init();
	Nakama_Drops_Admin::init();
} );

