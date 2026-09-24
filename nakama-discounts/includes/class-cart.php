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

		// Un solo campo admite promociones Nakama, afiliados y cupones nativos.
		add_action( 'wp', array( __CLASS__, 'hide_native_checkout_coupon' ) );
		add_action( 'woocommerce_before_checkout_form', array( __CLASS__, 'render_checkout_code_form' ) );

		// Assets.
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );

		// AJAX: guardar promo elegida.
		add_action( 'wp_ajax_nakama_select_promo', array( __CLASS__, 'ajax_select_promo' ) );
		add_action( 'wp_ajax_nopriv_nakama_select_promo', array( __CLASS__, 'ajax_select_promo' ) );
		add_action( 'wp_ajax_nakama_apply_checkout_code', array( __CLASS__, 'ajax_apply_checkout_code' ) );
		add_action( 'wp_ajax_nopriv_nakama_apply_checkout_code', array( __CLASS__, 'ajax_apply_checkout_code' ) );

		// Un cupón nativo de carrito abandonado reemplaza la primaria Nakama.
		add_action( 'woocommerce_applied_coupon', array( __CLASS__, 'clear_selected_promo' ) );

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
			if ( ! self::$plan['selection_valid'] && $ctx->selected_promo ) {
				WC()->session->set( 'nakama_selected_promo', '' );
				if (
					$ctx->unlocked_public_code_id
					&& $ctx->unlocked_public_code_id === Nakama_Discount_Codes::id_from_selection( $ctx->selected_promo )
				) {
					Nakama_Discount_Codes::clear_unlocked_code( false );
				}
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice(
						__( 'La promoción seleccionada ya no está disponible. Actualizamos tus opciones.', 'nakama-discounts' ),
						'notice'
					);
				}
			}
		}
		return self::$plan;
	}

	public static function flush_plan() {
		self::$plan = null;
	}

	/**
	 * Retira el formulario nativo para que el cliente no vea dos entradas que
	 * aceptan tipos de código distintos. El reemplazo conserva cupones nativos.
	 */
	public static function hide_native_checkout_coupon() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) {
			return;
		}

		remove_action( 'woocommerce_before_checkout_form', 'woocommerce_checkout_coupon_form', 10 );
	}

	/** Campo unificado para promociones, afiliados y cupones de WooCommerce. */
	public static function render_checkout_code_form() {
		if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) {
			return;
		}
		?>
		<section class="nakama-checkout-code" aria-labelledby="nakama-checkout-code-title">
			<h3 id="nakama-checkout-code-title"><?php esc_html_e( '¿Tienes un código?', 'nakama-discounts' ); ?></h3>
			<form class="nakama-checkout-code-form" novalidate>
				<label for="nakama-checkout-code"><?php esc_html_e( 'Código de descuento o afiliado', 'nakama-discounts' ); ?></label>
				<div class="nakama-checkout-code-row">
					<input
						type="text"
						id="nakama-checkout-code"
						name="nakama_checkout_code"
						maxlength="64"
						autocomplete="off"
						spellcheck="false"
						aria-describedby="nakama-checkout-code-help nakama-checkout-code-feedback"
						required
					>
					<button type="submit" class="button nakama-checkout-code-submit"><?php esc_html_e( 'Aplicar código', 'nakama-discounts' ); ?></button>
				</div>
				<p id="nakama-checkout-code-help" class="nakama-checkout-code-help"><?php esc_html_e( 'Acepta promociones Nakama, códigos de afiliado y cupones de WooCommerce.', 'nakama-discounts' ); ?></p>
				<p id="nakama-checkout-code-feedback" class="nakama-checkout-code-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></p>
			</form>
		</section>
		<?php
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
		$applied = ! empty( $plan['primary'] )
			? ( isset( $plan['primary']['selection_key'] ) ? $plan['primary']['selection_key'] : $plan['primary']['type'] )
			: '';

		echo '<tr class="nakama-promo-ui"><td colspan="2">';

		// ¿Hay al menos una promo especial elegible? Si no, la fidelidad se
		// aplica sola y no hace falta mostrar selector.
		$has_specials = false;
		foreach ( $options as $opt ) {
			if ( empty( $opt['auto'] ) && ( ! isset( $opt['visible'] ) || $opt['visible'] ) ) {
				$has_specials = true;
				break;
			}
		}

		if ( $has_specials ) {
			// Las promociones históricas conservan su orden; los códigos públicos
			// se añaden después en el orden estable definido en administración.
			$order  = array( 'welcome', 'special_10', 'special_3x2' );
			foreach ( array_keys( $options ) as $key ) {
				if ( ! in_array( $key, $order, true ) ) {
					$order[] = $key;
				}
			}
			$labels = array(
				'welcome'     => 'Descuento de fidelidad',
				'special_10'  => 'Descuento especial 10%',
				'special_3x2' => '3x2 por categoría',
			);

			echo '<div class="nakama-promos"><strong>Elige tu promoción</strong>';
			echo '<p class="nakama-note">Solo puedes usar una a la vez. Selecciona la que prefieras.</p>';
			if ( ! empty( $plan['native_coupon']['applies'] ) ) {
				echo '<p class="nakama-current-coupon">Tu cupón de carrito abandonado está activo. Elegir otra promoción lo sustituirá.</p>';
			}
			echo '<div class="nakama-promo-group" role="group" aria-label="Opciones de promoción">';

			foreach ( $order as $key ) {
				if (
					! isset( $options[ $key ] ) ||
					( isset( $options[ $key ]['visible'] ) && ! $options[ $key ]['visible'] )
				) {
					continue; // el cliente no califica para esta opción
				}
				$opt     = $options[ $key ];
				$name    = isset( $labels[ $key ] ) ? $labels[ $key ] : $opt['label'];
				$is_on   = ( $applied === $key );
				$active  = $is_on ? ' is-active' : '';
				$detail  = '';
				if ( 'public_code' === $opt['type'] ) {
					$detail = ! empty( $opt['allow_modifiers'] )
						? __( 'Conserva transferencia, envío gratis y MSI', 'nakama-discounts' )
						: __( 'No acumulable', 'nakama-discounts' );
				}
				printf(
					'<button type="button" class="nakama-promo-btn%s" data-promo="%s" aria-pressed="%s">
						<span class="nakama-promo-name">%s</span>
						<span class="nakama-promo-amount">−%s</span>%s
					</button>',
					esc_attr( $active ),
					esc_attr( $key ),
					$is_on ? 'true' : 'false',
					esc_html( $name ),
					wp_kses_post( wc_price( $opt['amount'] ) ),
					$detail ? '<span class="nakama-promo-detail">' . esc_html( $detail ) . '</span>' : ''
				);
			}

			echo '</div><p class="nakama-promo-feedback" role="status" aria-live="polite"></p></div>';
		}

		// Badges informativos.
		echo '<div class="nakama-badges">';
		if ( $plan['free_ship'] ) {
			echo '<span class="nakama-badge">🚚 ' . esc_html__( 'Envío gratis aplicado (tope', 'nakama-discounts' ) . ' ' . wp_kses_post( wc_price( Nakama_Settings::amount( 'free_ship_cap' ) ) ) . ')</span>';
		}
		if ( $plan['msi']['months'] > 0 ) {
			echo '<span class="nakama-badge">💳 ' . esc_html( $plan['msi']['months'] ) . ' meses sin intereses disponibles</span>';
		}
		if ( $plan['totals']['eligible_subtotal'] > 0
			&& ! empty( $plan['allows_modifiers'] )
			&& 'yes' === Nakama_Settings::get( 'transfer_enabled' )
			&& ! $plan['transfer']['applies'] ) {
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
			'apply_nonce' => wp_create_nonce( 'nakama_apply_checkout_code' ),
			'is_checkout' => is_checkout() ? 1 : 0,
			'messages' => array(
				'updating' => __( 'Actualizando promoción…', 'nakama-discounts' ),
				'updated'  => __( 'Promoción actualizada.', 'nakama-discounts' ),
				'error'    => __( 'No pudimos cambiar la promoción. Inténtalo de nuevo.', 'nakama-discounts' ),
				'code_required' => __( 'Escribe un código para continuar.', 'nakama-discounts' ),
				'code_applying' => __( 'Aplicando…', 'nakama-discounts' ),
				'code_error' => __( 'No pudimos aplicar el código. Revisa el dato e inténtalo de nuevo.', 'nakama-discounts' ),
			),
		) );
	}

	public static function ajax_select_promo() {
		check_ajax_referer( 'nakama_select_promo', 'nonce' );
		$promo = isset( $_POST['promo'] ) ? sanitize_text_field( wp_unslash( $_POST['promo'] ) ) : '';
		$plan = self::get_plan();
		$options = $plan && isset( $plan['options'] ) ? $plan['options'] : array();
		if ( ! self::apply_selection( $promo, $options ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Esta promoción ya no está disponible.', 'nakama-discounts' ) ),
				400
			);
		}
		wp_send_json_success( array( 'promo' => $promo ) );
	}

	/** Procesa el campo unificado del checkout y devuelve feedback estructurado. */
	public static function ajax_apply_checkout_code() {
		check_ajax_referer( 'nakama_apply_checkout_code', 'nonce' );
		$code = isset( $_POST['code'] ) ? sanitize_text_field( wp_unslash( $_POST['code'] ) ) : '';
		$result = self::apply_checkout_code( $code );

		if ( empty( $result['success'] ) ) {
			$status = isset( $result['kind'] ) && 'ambiguous' === $result['kind'] ? 409 : 400;
			wp_send_json_error( $result, $status );
		}

		wp_send_json_success( $result );
	}

	/**
	 * Identifica el origen antes de aplicar el código. Si dos motores reclaman
	 * el mismo texto, no cambia el carrito: obliga a corregir la duplicidad en
	 * administración en lugar de elegir una promoción de forma impredecible.
	 */
	public static function apply_checkout_code( $raw_code ) {
		$code = trim( sanitize_text_field( (string) $raw_code ) );
		if ( '' === $code ) {
			return array(
				'success' => false,
				'kind'    => 'empty',
				'message' => __( 'Escribe un código para continuar.', 'nakama-discounts' ),
			);
		}

		$matches = array();
		$nakama = Nakama_Discount_Codes::resolve_manual_code( array( 'handled' => false ), $code );
		if ( ! empty( $nakama['valid'] ) ) {
			$matches['nakama'] = $nakama;
		}

		if ( class_exists( 'Nakama_Affiliates_Codes' ) ) {
			try {
				$affiliate = Nakama_Affiliates_Codes::resolve( $code );
				if ( ! empty( $affiliate['valid'] ) ) {
					$matches['affiliate'] = $affiliate;
				}
			} catch ( Throwable $error ) {
				// Una integración externa no debe impedir usar los otros códigos.
			}
		}

		$native_code = function_exists( 'wc_format_coupon_code' )
			? wc_format_coupon_code( $code )
			: $code;
		if ( self::native_coupon_is_valid( $native_code ) ) {
			$matches['woocommerce'] = array( 'code' => $native_code );
		}

		if ( count( $matches ) > 1 ) {
			return array(
				'success' => false,
				'kind'    => 'ambiguous',
				'message' => __( 'Este código está duplicado y no se puede aplicar de forma segura. Contacta con soporte.', 'nakama-discounts' ),
			);
		}

		if ( ! $matches ) {
			return array(
				'success' => false,
				'kind'    => 'invalid',
				'message' => __( 'No encontramos un código vigente con ese nombre. Revisa cómo lo escribiste.', 'nakama-discounts' ),
			);
		}

		$kind = key( $matches );
		if ( 'nakama' === $kind ) {
			$applied = Nakama_Discount_Codes::apply_checkout_bridge( array( 'handled' => false ), $code );
			if ( empty( $applied['success'] ) ) {
				return array(
					'success' => false,
					'kind'    => 'nakama',
					'message' => isset( $applied['message'] ) ? $applied['message'] : __( 'La promoción ya no está disponible.', 'nakama-discounts' ),
				);
			}

			return array(
				'success' => true,
				'kind'    => 'nakama',
				'code'    => isset( $applied['code'] ) ? $applied['code'] : Nakama_Discount_Codes::normalize_code( $code ),
				'message' => __( 'Código aplicado. Revisa las promociones disponibles y elige la que más te convenga.', 'nakama-discounts' ),
			);
		}

		if ( 'affiliate' === $kind ) {
			if ( ! class_exists( 'Nakama_Affiliates_Discounts' ) ) {
				return array(
					'success' => false,
					'kind'    => 'affiliate',
					'message' => __( 'El código de afiliado está activo, pero no se pudo iniciar su descuento.', 'nakama-discounts' ),
				);
			}

			$applied = Nakama_Affiliates_Discounts::select_code( $code, 'manual' );
			if ( empty( $applied['success'] ) ) {
				return array(
					'success' => false,
					'kind'    => 'affiliate',
					'message' => isset( $applied['message'] ) ? $applied['message'] : __( 'El código de afiliado ya no está disponible.', 'nakama-discounts' ),
				);
			}

			return array(
				'success' => true,
				'kind'    => 'affiliate',
				'code'    => isset( $applied['code'] ) ? $applied['code'] : $code,
				'message' => __( 'Código de afiliado aplicado. Revisa las promociones disponibles y elige la que más te convenga.', 'nakama-discounts' ),
			);
		}

		$cart = function_exists( 'WC' ) && WC() ? WC()->cart : null;
		if ( ! $cart || ! method_exists( $cart, 'apply_coupon' ) ) {
			return array(
				'success' => false,
				'kind'    => 'woocommerce',
				'message' => __( 'No se pudo acceder al carrito para aplicar el cupón.', 'nakama-discounts' ),
			);
		}

		$already_applied = method_exists( $cart, 'has_discount' ) && $cart->has_discount( $native_code );
		$success = $already_applied || $cart->apply_coupon( $native_code );
		if ( ! $success ) {
			return array(
				'success' => false,
				'kind'    => 'woocommerce',
				'message' => __( 'El cupón existe, pero no cumple las condiciones de este pedido.', 'nakama-discounts' ),
			);
		}

		self::flush_plan();
		if ( method_exists( $cart, 'calculate_totals' ) ) {
			$cart->calculate_totals();
		}

		return array(
			'success' => true,
			'kind'    => 'woocommerce',
			'code'    => $native_code,
			'message' => __( 'Cupón aplicado correctamente.', 'nakama-discounts' ),
		);
	}

	/** Comprueba un cupón sin mutar el carrito. */
	private static function native_coupon_is_valid( $code ) {
		if ( '' === (string) $code || ! class_exists( 'WC_Coupon' ) ) {
			return false;
		}

		try {
			$coupon = new WC_Coupon( $code );
			if ( ! $coupon->get_id() ) {
				return false;
			}
			if (
				function_exists( 'WC' )
				&& WC()
				&& WC()->cart
				&& method_exists( WC()->cart, 'has_discount' )
				&& WC()->cart->has_discount( $code )
			) {
				return true;
			}

			if ( class_exists( 'WC_Discounts' ) && function_exists( 'WC' ) && WC() && WC()->cart ) {
				$discounts = new WC_Discounts( WC()->cart );
				$valid = $discounts->is_coupon_valid( $coupon );
				return function_exists( 'is_wp_error' ) ? ! is_wp_error( $valid ) : true === $valid;
			}

			return ! method_exists( $coupon, 'is_valid' ) || $coupon->is_valid();
		} catch ( Throwable $error ) {
			return false;
		}
	}

	/**
	 * Confirma una promoción disponible y retira cualquier cupón nativo.
	 * La lista de opciones procede del plan calculado por el servidor, por lo
	 * que una clave inventada por el navegador nunca llega a la sesión.
	 */
	public static function apply_selection( $promo, array $options ) {
		if ( '' !== $promo && ! isset( $options[ $promo ] ) ) {
			return false;
		}

		if ( '' !== $promo && WC()->cart && method_exists( WC()->cart, 'remove_coupons' ) ) {
			WC()->cart->remove_coupons();
		}
		WC()->session->set( 'nakama_selected_promo', $promo );
		self::flush_plan();
		do_action(
			'nakama_discount_selection_applied',
			$promo,
			'' !== $promo && isset( $options[ $promo ] ) ? $options[ $promo ] : null
		);
		return true;
	}

	/** Cuando WooCommerce aplica un cupón, este pasa a ser la primaria. */
	public static function clear_selected_promo( $coupon_code = '' ) {
		if ( WC()->session ) {
			WC()->session->set( 'nakama_selected_promo', '' );
		}
		self::flush_plan();
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
			if ( isset( $plan['primary']['rate'] ) ) {
				$order->update_meta_data( '_nakama_primary_rate', $plan['primary']['rate'] );
			}
			if ( 'public_code' === $plan['primary']['type'] ) {
				$order->update_meta_data( '_nakama_public_code_id', $plan['primary']['id'] );
				$order->update_meta_data( '_nakama_public_code', $plan['primary']['code'] );
				$order->update_meta_data(
					'_nakama_primary_combinable',
					! empty( $plan['primary']['allow_modifiers'] ) ? 'yes' : 'no'
				);
				$order->update_meta_data(
					'_nakama_public_code_entry_mode',
					isset( $plan['primary']['entry_mode'] )
						? $plan['primary']['entry_mode']
						: Nakama_Discount_Codes::ENTRY_AUTOMATIC
				);
			}
		}
		$order->update_meta_data( '_nakama_transfer', $plan['transfer']['amount'] );
		$order->update_meta_data( '_nakama_free_ship', $plan['free_ship'] ? 'yes' : 'no' );
		$order->update_meta_data( '_nakama_msi', $plan['msi']['months'] );

		/**
		 * Allow independent plugins to persist their own immutable snapshot of the
		 * final server-side plan without teaching this plugin their data model.
		 */
		do_action( 'nakama_discounts_order_plan_saved', $order, $plan, $data );
	}
}
