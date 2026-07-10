<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Envío gratis desde el umbral (total DESPUÉS de descuentos), topado.
 * - Método <= tope  -> gratis para el cliente.
 * - Método >  tope  -> el cliente paga solo la diferencia (costo - tope).
 *
 * FIX de caché: WooCommerce cachea las tarifas de envío con un hash del
 * "paquete". Si el tope depende de algo externo (nuestro plan, la moneda),
 * al cambiar de paquetería servía tarifas cacheadas SIN el tope. Para evitarlo
 * inyectamos el estado (free_ship, tope, moneda) dentro del paquete: así el
 * hash cambia cuando cambia el estado y WooCommerce recalcula correctamente.
 */
class Nakama_Shipping {

	public static function init() {
		// Inyecta estado en el paquete -> invalida el caché cuando corresponde.
		add_filter( 'woocommerce_cart_shipping_packages', array( __CLASS__, 'tag_packages' ), 20 );
		// Aplica el tope leyendo el estado desde el paquete (no del caché de plan).
		add_filter( 'woocommerce_package_rates', array( __CLASS__, 'apply_cap' ), 100, 2 );
	}

	public static function tag_packages( $packages ) {
		$plan = Nakama_Cart::get_plan();
		$free = ( $plan && ! empty( $plan['free_ship'] ) ) ? 1 : 0;
		$cap  = Nakama_Settings::amount( 'free_ship_cap' );
		$cur  = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : '';

		foreach ( $packages as $i => $pkg ) {
			$packages[ $i ]['nakama_free_ship'] = $free;
			$packages[ $i ]['nakama_cap']       = $cap;
			$packages[ $i ]['nakama_currency']  = $cur; // fuerza recálculo al cambiar de moneda
		}
		return $packages;
	}

	public static function apply_cap( $rates, $package ) {
		// Si el paquete llegó SIN etiquetar (algún flujo de WooCommerce
		// construye paquetes sin pasar por nuestro filtro), evaluar el plan en
		// vivo en lugar de asumir "sin envío gratis" — antes eso hacía que el
		// descuento se perdiera en algunos recálculos del checkout.
		if ( array_key_exists( 'nakama_free_ship', $package ) ) {
			$free = ! empty( $package['nakama_free_ship'] );
		} else {
			$plan = class_exists( 'Nakama_Cart' ) ? Nakama_Cart::get_plan() : null;
			$free = $plan && ! empty( $plan['free_ship'] );
		}
		if ( ! $free ) {
			return $rates;
		}

		$cap = isset( $package['nakama_cap'] )
			? (float) $package['nakama_cap']
			: Nakama_Settings::amount( 'free_ship_cap' );

		foreach ( $rates as $rate ) {
			$cost = (float) $rate->get_cost();

			if ( $cost <= $cap ) {
				// La tienda absorbe todo: gratis.
				$rate->set_cost( 0 );
				$rate->set_taxes( array() );
				$rate->set_label( $rate->get_label() . ' — ' . __( 'Envío gratis', 'nakama-discounts' ) );
				// Monto cubierto por la tienda: WooCommerce copia la meta del
				// rate al shipping line item del pedido, y el desglose de
				// totales lo muestra como fila "Descuento del envío".
				$rate->add_meta_data( '_nakama_ship_covered', (string) round( $cost, 2 ) );
			} else {
				// El cliente paga solo la diferencia.
				$diff = round( $cost - $cap, 2 );
				// Recalcular impuestos proporcionalmente a lo que sí se cobra.
				$new_taxes = array();
				foreach ( $rate->get_taxes() as $k => $t ) {
					$new_taxes[ $k ] = ( $cost > 0 ) ? round( $t * ( $diff / $cost ), 2 ) : 0;
				}
				$rate->set_cost( $diff );
				$rate->set_taxes( $new_taxes );
				$rate->set_label(
					$rate->get_label() . ' — ' . sprintf(
						/* translators: %s: monto tope absorbido por la tienda */
						__( 'la tienda cubre %s', 'nakama-discounts' ),
						wp_strip_all_tags( wc_price( $cap ) )
					)
				);
				$rate->add_meta_data( '_nakama_ship_covered', (string) round( $cap, 2 ) );
			}
		}

		return $rates;
	}
}
