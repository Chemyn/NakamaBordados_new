<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Configuración central del plugin.
 * Todo es editable desde la pantalla de ajustes (Nakama_Admin).
 */
class Nakama_Settings {

	public static function defaults() {
		return array(
			// --- Bienvenida / Fidelidad ---
			'welcome_enabled'        => 'yes',
			'welcome_rate_1'         => 0.05, // 1a compra (siempre)
			'welcome_rate_2'         => 0.10, // 2a compra
			'welcome_rate_3'         => 0.20, // 3a compra
			'welcome_days_2'         => 15,   // vence 15 días tras "completado"
			'welcome_days_3'         => 20,   // vence 20 días tras "completado"
			// Estados de pedido que "cuentan" como compra válida.
			'welcome_valid_statuses' => array( 'processing', 'completed' ),
			// Fidelidad SOLO para usuarios con cuenta (invitados no califican).
			'welcome_account_only'   => 'yes',

			// --- Especial 10% (campaña) ---
			'special_10_enabled'     => 'no',
			'special_10_rate'        => 0.10,
			'special_10_start'       => '', // opcional YYYY-MM-DD (agenda)
			'special_10_end'         => '',

			// --- 3x2 por categoría (campaña) ---
			'special_3x2_enabled'    => 'no',
			'special_3x2_categories' => array( 'bordados', 'gorras' ), // slugs
			'special_3x2_start'      => '',
			'special_3x2_end'        => '',

			// Si es true, cuando una promo especial da MÁS valor que bienvenida
			// se aplica sola (sin que el cliente presione el botón). Default: false
			// (se respeta el opt-in por botón).
			'special_auto_if_better' => 'no',

			// --- Envío gratis ---
			'free_ship_enabled'      => 'yes',
			'free_ship_threshold'    => 1500, // total DESPUÉS de descuentos (moneda base)
			'free_ship_cap'          => 140,  // tope que absorbe la tienda (moneda base)
			// Overrides por moneda, ej. ['USD'=>80]. Si está vacío se usa el valor base.
			'free_ship_threshold_map' => array(),
			'free_ship_cap_map'       => array(),

			// --- Transferencia ---
			'transfer_enabled'       => 'yes',
			'transfer_rate'          => 0.05, // 5% (promo vigente en banners)
			'transfer_gateway_id'    => 'bacs', // ID del método "transferencia"

			// --- MSI ---
			'msi_enabled'            => 'yes',
			'msi_3_threshold'        => 2000, // 3 MSI (moneda base)
			'msi_6_threshold'        => 3000, // 6 MSI (moneda base, solo en campaña especial)
			'msi_3_threshold_map'    => array(),
			'msi_6_threshold_map'    => array(),

			// --- Aviso en Mi Cuenta ---
			'account_notice_enabled'  => 'yes',
			'account_notice_complete' => 'no', // mostrar mensaje al terminar la escalera
		);
	}

	public static function set_defaults() {
		if ( false === get_option( NAKAMA_DISC_OPTION ) ) {
			update_option( NAKAMA_DISC_OPTION, self::defaults() );
		}
	}

	public static function all() {
		return wp_parse_args( get_option( NAKAMA_DISC_OPTION, array() ), self::defaults() );
	}

	public static function get( $key, $fallback = null ) {
		$all = self::all();
		return isset( $all[ $key ] ) ? $all[ $key ] : $fallback;
	}

	/**
	 * Devuelve un monto fijo (umbral/tope) ajustado a la moneda ACTIVA.
	 * Orden de prioridad:
	 *   1) override estático por moneda ($key.'_map', ej. ['USD'=>80])
	 *   2) conversión en vivo con el tipo de cambio del snippet de moneda del
	 *      sitio. Sin esto, los montos en MXN (tope 140, umbral 1500) se
	 *      comparaban contra totales/tarifas en USD: el tope dejaba TODO el
	 *      envío gratis y el umbral apagaba free_ship en el recálculo (el
	 *      descuento "desaparecía" al cambiar de paquetería).
	 *   3) filtro 'nakama_amount' (ajustes externos)
	 *   4) valor base configurado
	 */
	public static function amount( $key ) {
		$base     = (float) self::get( $key );
		$currency = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : '';

		$map = (array) self::get( $key . '_map', array() );
		if ( $currency && isset( $map[ $currency ] ) ) {
			$base = (float) $map[ $currency ];
		} elseif ( $currency && $currency !== self::base_currency() ) {
			$base = self::convert_from_base( $base, $currency );
		}

		/**
		 * Filtro para convertir el monto según la moneda activa.
		 * @param float  $base     monto ya resuelto (base, override o convertido)
		 * @param string $key      clave del ajuste (free_ship_threshold, msi_3_threshold, ...)
		 * @param string $currency moneda activa (get_woocommerce_currency)
		 */
		return (float) apply_filters( 'nakama_amount', $base, $key, $currency );
	}

	/** Moneda base de la tienda (en la que están configurados los montos). */
	public static function base_currency() {
		return get_option( 'woocommerce_currency', 'MXN' );
	}

	/**
	 * Convierte un monto en moneda base (MXN) a la moneda activa usando el
	 * tipo de cambio REAL. El transient del snippet guarda el rate con margen
	 * (-2 pesos, que encarece los precios de productos en USD); los montos
	 * operativos (tope de envío, umbrales) deben convertirse al valor real:
	 * pesos_reales = 1/rate + 2. Ej.: tope 140 MXN -> 140 / 17.47 = 8.01 USD.
	 * Sin tipo de cambio disponible devuelve el monto sin convertir.
	 */
	public static function convert_from_base( $amount, $currency ) {
		if ( 'USD' !== $currency ) {
			return (float) $amount;
		}
		$rate = get_transient( 'id_rate_v15_7_USD' );
		if ( false === $rate ) {
			$rate = get_transient( 'id_rate_v15_6_USD' );
		}
		if ( $rate && (float) $rate > 0 ) {
			$pesos_reales = ( 1 / (float) $rate ) + 2;
			return round( (float) $amount / $pesos_reales, 2 );
		}
		return (float) $amount;
	}

	/** Formatea una tasa (0.05) como porcentaje legible ("5%"). */
	public static function pct( $rate ) {
		return rtrim( rtrim( number_format( (float) $rate * 100, 2 ), '0' ), '.' ) . '%';
	}

	/** Convierte "USD:80, EUR:75" en ['USD'=>80.0,'EUR'=>75.0]. */
	public static function parse_currency_map( $string ) {
		$map = array();
		foreach ( preg_split( '/[,\n]+/', (string) $string ) as $pair ) {
			$pair = trim( $pair );
			if ( '' === $pair || false === strpos( $pair, ':' ) ) {
				continue;
			}
			list( $cur, $val ) = array_map( 'trim', explode( ':', $pair, 2 ) );
			$cur = strtoupper( $cur );
			if ( $cur && is_numeric( $val ) ) {
				$map[ $cur ] = (float) $val;
			}
		}
		return $map;
	}

	/** Convierte ['USD'=>80] de vuelta a texto "USD:80" para el admin. */
	public static function currency_map_to_string( $map ) {
		$parts = array();
		foreach ( (array) $map as $cur => $val ) {
			$parts[] = $cur . ':' . $val;
		}
		return implode( ', ', $parts );
	}
}
