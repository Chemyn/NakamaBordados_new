<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Meses sin intereses.
 *
 * IMPORTANTE: los MSI reales los ofrece la PASARELA (Mercado Pago, Openpay,
 * Conekta, Stripe MX, etc.) según tu contrato y el banco emisor. WooCommerce
 * por sí solo no "otorga" MSI. Este módulo:
 *   1) calcula la elegibilidad (monto mínimo),
 *   2) muestra el mensaje al cliente,
 *   3) expone un filtro para que integres la config de tu pasarela
 *      (limitar cuotas disponibles según el plan).
 */
class Nakama_MSI {

	public static function init() {
		// Mensaje bajo el precio en producto/tienda.
		add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'product_hint' ), 25 );

		// Gancho reutilizable para tu integración de pasarela:
		// $months = apply_filters('nakama_msi_available_months', 0);
		add_filter( 'nakama_msi_available_months', array( __CLASS__, 'available_months' ) );
	}

	/** Meses disponibles según el plan del carrito (0/3/6). */
	public static function available_months() {
		$plan = Nakama_Cart::get_plan();
		return $plan ? (int) $plan['msi']['months'] : 0;
	}

	public static function product_hint() {
		if ( 'yes' !== Nakama_Settings::get( 'msi_enabled' ) ) {
			return;
		}
		$t3 = wc_price( Nakama_Settings::amount( 'msi_3_threshold' ) );
		echo '<p class="nakama-msi-hint">💳 ' . sprintf(
			/* translators: %s monto */
			esc_html__( '3 meses sin intereses en compras desde %s', 'nakama-discounts' ),
			wp_kses_post( $t3 )
		) . '</p>';
	}
}
