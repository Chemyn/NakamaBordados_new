<?php
/**
 * Plugin Name: Nakama Discounts Engine
 * Description: Motor de descuentos automáticos para WooCommerce (bienvenida/fidelidad, especiales por campaña, 3x2, envío gratis topado, descuento por transferencia y MSI).
 * Version:     1.0.3
 * Author:      Nakama Bordados
 * Requires PHP: 7.4
 * Text Domain: nakama-discounts
 *
 * -------------------------------------------------------------------------
 * IDEA CENTRAL
 * -------------------------------------------------------------------------
 * Los descuentos se aplican como "fees" negativos al carrito (no como cupones
 * de WooCommerce), lo que da control total sobre la lógica condicional.
 *
 * Un solo "motor" (Nakama_Engine) recibe un contexto (Nakama_Context) y
 * devuelve un "plan de descuento". El resto de las clases solo pintan ese
 * plan (fees, envío, badges, MSI).
 *
 * Grupos de promoción:
 *   PRIMARIAS (mutuamente excluyentes -> solo UNA aplica):
 *      A) Bienvenida/Fidelidad (5% / 10% / 20%)
 *      B) Especial 10% (campaña)
 *      C) 3x2 por categoría (campaña)
 *   MODIFICADORES (se apilan sobre la primaria):
 *      D) Envío gratis desde $1500 (topado $140)
 *      E) Transferencia 5% adicional
 *      F) MSI (3 desde $2000, 6 desde $3000 en campaña especial)
 * -------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NAKAMA_DISC_VERSION', '1.0.3' );
define( 'NAKAMA_DISC_FILE', __FILE__ );
define( 'NAKAMA_DISC_PATH', plugin_dir_path( __FILE__ ) );
define( 'NAKAMA_DISC_URL', plugin_dir_url( __FILE__ ) );
define( 'NAKAMA_DISC_OPTION', 'nakama_discounts_settings' );

// Carga de clases (loader simple, sin PSR-4 para máxima portabilidad).
$nakama_disc_includes = array(
	'includes/class-settings.php',
	'includes/class-campaigns.php',
	'includes/class-customer-history.php',
	'includes/class-context.php',
	'includes/class-engine.php',
	'includes/class-cart.php',
	'includes/class-shipping.php',
	'includes/class-msi.php',
	'includes/class-account.php',
	'includes/class-admin.php',
);

foreach ( $nakama_disc_includes as $file ) {
	require_once NAKAMA_DISC_PATH . $file;
}

/**
 * Arranque: solo si WooCommerce está activo.
 */
add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p>Nakama Discounts requiere WooCommerce activo.</p></div>';
		} );
		return;
	}

	Nakama_Cart::init();      // aplica fees, botones de promo, badges
	Nakama_Shipping::init();  // envío gratis topado
	Nakama_MSI::init();       // flags de meses sin intereses
	Nakama_Account::init();   // aviso de escalera en Mi Cuenta
	Nakama_Admin::init();     // pantalla de ajustes con toggles
} );

// Ajustes por defecto al activar.
register_activation_hook( __FILE__, array( 'Nakama_Settings', 'set_defaults' ) );
