<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Conecta el plan del motor con el carrito de WooCommerce:
 *  - Aplica fees negativos (primaria + transferencia).
 *  - Pinta botones de promos especiales (opt-in) y badges informativos.
 *  - Guarda la selección del cliente vía AJAX.
 *  - Expone el plan al resto de clases (shipping/msi) por caché de request.
 */
class Nakama_Cart {

	/** Caché del plan por request para no recalcular en cada hook. */
	protected static $plan = null;

	public static function init() {
		// Aplicar descuentos.
		add_action( 'woocommerce_cart_calculate_fees', array( __CLASS__, 'apply_fees' ), 20 );

		// Recalcular cuando cambia el método de pago (para transferencia).
		add_action( 'woocommerce_checkout_update_order_review', array( __CLASS__, 'flush_plan' ) );

		// UI: botones + badges en carrito y checkout.
		add_action( 'woocommerce_cart_totals_before_order_total', array( __CLASS__, 'render_promo_ui' ) );
		add_action( 'woocommerce_review_order_before_order_total', array( __CLASS__, 'render_promo_ui' ) );

		// Assets.
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );

		// AJAX: guardar promo elegida.
		add_action( 'wp_ajax_nakama_select_promo', array( __CLASS__, 'ajax_select_promo' ) );
		add_action( 'wp_ajax_nopriv_nakama_select_promo', array( __CLASS__, 'ajax_select_promo' ) );

		// Persistir metadatos del descuento en el pedido (útil para CFDI/reportes).
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'save_order_meta' ), 10, 2 );

		// Desglose de totales del pedido (confirmación, correos, order-pay) en
		// orden estricto: Subtotal, Envío, Descuentos, Descuento del envío, Total.
		add_filter( 'woocommerce_get_order_item_totals', array( __CLASS__, 'reorder_order_totals' ), 50, 2 );
	}

	/** Obtiene (y cachea) el plan para el request actual. */
	public static function get_plan() {
		if ( null === self::$plan && WC()->cart ) {
			$ctx        = Nakama_Context::build( WC()->cart );
			self::$plan = Nakama_Engine::resolve( $ctx );
		}
		return self::$plan;
	}

	public static function flush_plan() {
		self::$plan = null;
	}

	/** Aplica los fees negativos al carrito. */
	public static function apply_fees( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}
		self::$plan = null; // recalcular con el estado más fresco
		$plan = self::get_plan();
		if ( ! $plan ) {
			return;
		}

		// Primaria (bienvenida / 10% / 3x2).
		if ( ! empty( $plan['primary'] ) && $plan['primary']['amount'] > 0 ) {
			$cart->add_fee(
				$plan['primary']['label'],
				- $plan['primary']['amount'],
				false // sin impuestos: ajustar si manejas IVA sobre el descuento
			);
		}

		// Transferencia.
		if ( ! empty( $plan['transfer']['applies'] ) && $plan['transfer']['amount'] > 0 ) {
			$cart->add_fee(
				sprintf(
					/* translators: %s: porcentaje de descuento por transferencia */
					__( 'Descuento por transferencia (%s)', 'nakama-discounts' ),
					Nakama_Settings::pct( Nakama_Settings::get( 'transfer_rate' ) )
				),
				- $plan['transfer']['amount'],
				false
			);
		}
	}

	/** Botones de promos especiales + badges de envío/MSI/transferencia. */
	public static function render_promo_ui() {
		$plan = self::get_plan();
		if ( ! $plan ) {
			return;
		}

		$options = $plan['options'];
		// Promo que el motor aplica ahora (para resaltar el botón correcto).
		$applied = ! empty( $plan['primary'] ) ? $plan['primary']['type'] : '';

		echo '<tr class="nakama-promo-ui"><td colspan="2">';

		// ¿Hay al menos una promo especial elegible? Si no, la fidelidad se
		// aplica sola y no hace falta mostrar selector.
		$has_specials = false;
		foreach ( $options as $opt ) {
			if ( empty( $opt['auto'] ) ) {
				$has_specials = true;
				break;
			}
		}

		if ( $has_specials ) {
			// Orden fijo de presentación: fidelidad, 10%, 3x2.
			$order  = array( 'welcome', 'special_10', 'special_3x2' );
			$labels = array(
				'welcome'     => 'Descuento de fidelidad',
				'special_10'  => 'Descuento especial 10%',
				'special_3x2' => '3x2 por categoría',
			);

			echo '<div class="nakama-promos"><strong>Elige tu promoción</strong>';
			echo '<p class="nakama-note">Solo puedes usar una a la vez. Selecciona la que prefieras.</p>';
			echo '<div class="nakama-promo-group">';

			foreach ( $order as $key ) {
				if ( ! isset( $options[ $key ] ) ) {
					continue; // el cliente no califica para esta opción
				}
				$opt     = $options[ $key ];
				$name    = isset( $labels[ $key ] ) ? $labels[ $key ] : $opt['label'];
				$is_on   = ( $applied === $key );
				$active  = $is_on ? ' is-active' : '';
				printf(
					'<button type="button" class="nakama-promo-btn%s" data-promo="%s" aria-pressed="%s">
						<span class="nakama-promo-name">%s</span>
						<span class="nakama-promo-amount">−%s</span>
					</button>',
					esc_attr( $active ),
					esc_attr( $key ),
					$is_on ? 'true' : 'false',
					esc_html( $name ),
					wp_kses_post( wc_price( $opt['amount'] ) )
				);
			}

			echo '</div></div>';
		}

		// Badges informativos.
		echo '<div class="nakama-badges">';
		if ( $plan['free_ship'] ) {
			echo '<span class="nakama-badge">🚚 ' . esc_html__( 'Envío gratis aplicado (tope', 'nakama-discounts' ) . ' ' . wp_kses_post( wc_price( Nakama_Settings::amount( 'free_ship_cap' ) ) ) . ')</span>';
		}
		if ( $plan['msi']['months'] > 0 ) {
			echo '<span class="nakama-badge">💳 ' . esc_html( $plan['msi']['months'] ) . ' meses sin intereses disponibles</span>';
		}
		if ( 'yes' === Nakama_Settings::get( 'transfer_enabled' ) && ! $plan['transfer']['applies'] ) {
			echo '<span class="nakama-badge nakama-badge--hint">' . sprintf(
				/* translators: %s: porcentaje */
				esc_html__( 'Paga por transferencia y obtén %s adicional', 'nakama-discounts' ),
				esc_html( Nakama_Settings::pct( Nakama_Settings::get( 'transfer_rate' ) ) )
			) . '</span>';
		}
		echo '</div>';

		echo '</td></tr>';
	}

	public static function assets() {
		if ( ! function_exists( 'is_cart' ) || ( ! is_cart() && ! is_checkout() ) ) {
			return;
		}
		wp_enqueue_style( 'nakama-checkout', NAKAMA_DISC_URL . 'assets/css/checkout.css', array(), NAKAMA_DISC_VERSION );
		wp_enqueue_script( 'nakama-checkout', NAKAMA_DISC_URL . 'assets/js/checkout.js', array( 'jquery' ), NAKAMA_DISC_VERSION, true );
		wp_localize_script( 'nakama-checkout', 'NakamaDisc', array(
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'nonce'    => wp_create_nonce( 'nakama_select_promo' ),
			'is_checkout' => is_checkout() ? 1 : 0,
		) );
	}

	public static function ajax_select_promo() {
		check_ajax_referer( 'nakama_select_promo', 'nonce' );
		$promo = isset( $_POST['promo'] ) ? sanitize_text_field( wp_unslash( $_POST['promo'] ) ) : '';
		$allowed = array( '', 'welcome', 'special_10', 'special_3x2' );
		if ( ! in_array( $promo, $allowed, true ) ) {
			$promo = '';
		}
		WC()->session->set( 'nakama_selected_promo', $promo );
		self::flush_plan();
		wp_send_json_success( array( 'promo' => $promo ) );
	}

	/**
	 * Reordena las filas del desglose de totales del pedido:
	 * 1. Subtotal — 2. Envío (costo original de la paquetería) — 3. Descuentos
	 * (fees negativos con su etiqueta real y cupones) — 4. Descuento del envío
	 * (lo que la tienda cubre, como fila propia) — 5. impuestos/método de pago
	 * — 6. Total. Antes el descuento del envío iba escondido en la etiqueta
	 * del método y el orden no cuadraba visualmente con la aritmética.
	 */
	public static function reorder_order_totals( $rows, $order ) {
		if ( ! is_array( $rows ) || ! $order instanceof WC_Abstract_Order ) {
			return $rows;
		}

		// Monto del envío cubierto por la tienda: meta que el rate copia al
		// shipping item del pedido (ver Nakama_Shipping::apply_cap). Pedidos
		// anteriores a esta versión no la traen: se omite la fila.
		$covered = 0.0;
		foreach ( $order->get_items( 'shipping' ) as $item ) {
			$covered += (float) $item->get_meta( '_nakama_ship_covered' );
		}

		$currency = array( 'currency' => $order->get_currency() );

		$ordered = array();
		$take    = function ( $key ) use ( &$ordered, &$rows ) {
			if ( isset( $rows[ $key ] ) ) {
				$ordered[ $key ] = $rows[ $key ];
				unset( $rows[ $key ] );
			}
		};

		$take( 'cart_subtotal' );

		if ( isset( $rows['shipping'] ) ) {
			$take( 'shipping' );
			if ( $covered > 0 ) {
				// Mostrar el costo ORIGINAL de la paquetería; lo cubierto por
				// la tienda aparece como su propia fila de descuento abajo.
				$original = (float) $order->get_shipping_total() + $covered;
				$method   = preg_replace( '/\s*—\s*(Envío gratis|la tienda cubre).*/u', '', (string) $order->get_shipping_method() );
				$ordered['shipping']['value'] = wc_price( $original, $currency )
					. ( $method ? '&nbsp;<small class="shipping_method">via ' . esc_html( $method ) . '</small>' : '' );
			}
		}

		// Descuentos: fees (negativos, cada uno con su etiqueta real) y cupones.
		foreach ( array_keys( $rows ) as $key ) {
			if ( 0 === strpos( $key, 'fee_' ) ) {
				$ordered[ $key ] = $rows[ $key ];
				unset( $rows[ $key ] );
			}
		}
		$take( 'discount' );

		if ( $covered > 0 ) {
			$ordered['nakama_ship_discount'] = array(
				'label' => __( 'Descuento del envío:', 'nakama-discounts' ),
				'value' => wc_price( - $covered, $currency ),
			);
		}

		// Resto (impuestos, método de pago) en su orden original y Total al final.
		foreach ( array_keys( $rows ) as $key ) {
			if ( 'order_total' !== $key ) {
				$ordered[ $key ] = $rows[ $key ];
				unset( $rows[ $key ] );
			}
		}
		$take( 'order_total' );

		return $ordered;
	}

	/** Guarda el resumen del descuento en el pedido. */
	public static function save_order_meta( $order, $data ) {
		$plan = self::get_plan();
		if ( ! $plan ) {
			return;
		}
		if ( ! empty( $plan['primary'] ) ) {
			$order->update_meta_data( '_nakama_primary_type', $plan['primary']['type'] );
			$order->update_meta_data( '_nakama_primary_amount', $plan['primary']['amount'] );
		}
		$order->update_meta_data( '_nakama_transfer', $plan['transfer']['amount'] );
		$order->update_meta_data( '_nakama_free_ship', $plan['free_ship'] ? 'yes' : 'no' );
		$order->update_meta_data( '_nakama_msi', $plan['msi']['months'] );
	}
}
