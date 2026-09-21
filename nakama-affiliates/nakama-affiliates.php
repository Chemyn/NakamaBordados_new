<?php
/**
 * Plugin Name: Nakama Afiliados
 * Description: Códigos, atribución, comisiones y beneficios mensuales para el programa de afiliados de Nakama Bordados.
 * Version: 0.1.0
 * Author: Nakama Bordados
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Text Domain: nakama-affiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NAKAMA_AFFILIATES_VERSION', '0.1.0' );
define( 'NAKAMA_AFFILIATES_DB_VERSION', '1' );
define( 'NAKAMA_AFFILIATES_FILE', __FILE__ );
define( 'NAKAMA_AFFILIATES_PATH', plugin_dir_path( __FILE__ ) );
define( 'NAKAMA_AFFILIATES_URL', plugin_dir_url( __FILE__ ) );

$nakama_affiliates_includes = array(
	'includes/class-affiliates-domain.php',
	'includes/class-affiliates-installer.php',
	'includes/class-affiliates-repository.php',
	'includes/class-affiliates-codes.php',
	'includes/class-affiliates-profiles.php',
	'includes/class-affiliates-permissions.php',
	'includes/class-affiliates-rest.php',
	'includes/class-affiliates-discounts.php',
	'includes/class-affiliates-currency.php',
	'includes/class-affiliates-orders.php',
	'includes/class-affiliates-commissions.php',
	'includes/class-affiliates-refunds.php',
	'includes/class-affiliates-closures.php',
	'includes/class-affiliates-private-files.php',
	'includes/class-affiliates-documents.php',
);

foreach ( $nakama_affiliates_includes as $nakama_affiliates_include ) {
	require_once NAKAMA_AFFILIATES_PATH . $nakama_affiliates_include;
}

register_activation_hook( __FILE__, array( 'Nakama_Affiliates_Installer', 'activate' ) );
add_action( 'init', array( 'Nakama_Affiliates_Installer', 'maybe_upgrade' ), 1 );
Nakama_Affiliates_Permissions::init();
Nakama_Affiliates_REST::init();
Nakama_Affiliates_Discounts::init();
Nakama_Affiliates_Orders::init();
Nakama_Affiliates_Commissions::init();
Nakama_Affiliates_Refunds::init();

add_action( 'before_woocommerce_init', function () {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	}
} );

add_action( 'plugins_loaded', function () {
	if ( class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_action( 'admin_notices', function () {
		echo '<div class="notice notice-error"><p>' . esc_html__( 'Nakama Afiliados requiere WooCommerce activo.', 'nakama-affiliates' ) . '</p></div>';
	} );
} );
