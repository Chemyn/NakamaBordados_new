<?php
/**
 * Plugin Name: Nakama Checkout Tools
 * Description: Endpoints REST para validación de cupones, moneda, SSO, pedidos de cotización y sincronización de base de datos local (Next.js).
 * Version: 1.9
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'rest_api_init', function () {
    // Endpoint para checar el valor de un cupón
    register_rest_route( 'nakama/v1', '/check-coupon', array(
        'methods' => 'GET',
        'callback' => 'nakama_check_coupon_logic',
        'permission_callback' => '__return_true'
    ) );

    // SSO: convierte el JWT del frontend (que ya autentica esta petición vía
    // el plugin de WPGraphQL JWT) en las cookies de sesión de WordPress.
    // Usos: abrir /wp-admin sin re-login (admins) y mantener la sesión del
    // cliente en el checkout de WooCommerce (el bridge deja de ser "invitado").
    // Cualquier usuario logueado; no acepta usuario por parámetro (usa el del token).
    register_rest_route( 'nakama/v1', '/sso', array(
        'methods' => 'POST',
        'callback' => 'nakama_sso_set_cookie',
        'permission_callback' => 'is_user_logged_in'
    ) );

    // Pedido de cotización: al terminar una cotización en el cotizador se crea
    // un pedido "En espera" en WooCommerce con el folio (NK-xxxx) como número
    // de pedido. El cliente lo ve en Mi Cuenta y, cuando el taller asigna el
    // precio (editando el pedido y pasándolo a "Pendiente de pago"), puede pagar.
    // Si llega un JWT válido el pedido se asocia a ese usuario; si no, queda
    // como invitado con el email del formulario.
    register_rest_route( 'nakama/v1', '/quote-order', array(
        'methods' => 'POST',
        'callback' => 'nakama_create_quote_order',
        'permission_callback' => '__return_true'
    ) );

    // Info de moneda: expone el tipo de cambio MXN->USD que usa el snippet
    // "ImperioDev Currency Global V15.7" para que el frontend Next muestre
    // exactamente los mismos montos que el checkout de WooCommerce.
    register_rest_route( 'nakama/v1', '/currency', array(
        'methods' => 'GET',
        'callback' => 'nakama_currency_info',
        'permission_callback' => '__return_true'
    ) );
});

function nakama_create_quote_order( WP_REST_Request $request ) {
    if ( ! function_exists( 'wc_create_order' ) ) {
        return new WP_Error( 'no_wc', 'WooCommerce no está activo', array( 'status' => 500 ) );
    }

    $params = $request->get_json_params();
    $folio  = sanitize_text_field( $params['folio'] ?? '' );
    $name   = sanitize_text_field( $params['name'] ?? '' );
    $email  = sanitize_email( $params['email'] ?? '' );
    $phone  = sanitize_text_field( $params['phone'] ?? '' );
    $summary = sanitize_textarea_field( $params['summary'] ?? '' );
    $details = sanitize_textarea_field( $params['details'] ?? '' );

    // El folio debe tener el formato NK-<numero> y haber sido emitido por
    // /next-folio (no mayor que el contador actual) — frena órdenes basura.
    if ( ! preg_match( '/^NK-(\d{1,10})$/', $folio, $m ) ) {
        return new WP_Error( 'bad_folio', 'Folio inválido', array( 'status' => 400 ) );
    }
    $counter = (int) get_option( 'nakama_quote_folio_counter', 0 );
    $is_issued_folio = ( (int) $m[1] ) <= $counter;

    if ( empty( $name ) ) {
        return new WP_Error( 'bad_name', 'Falta el nombre del cliente', array( 'status' => 400 ) );
    }

    // Idempotente por folio: si ya existe un pedido con este folio, devolverlo
    // (evita duplicados si el cliente reintenta el envío). meta_query es el
    // formato que soporta el almacenamiento HPOS de WooCommerce; en el
    // almacenamiento clásico el chequeo es best-effort.
    $existing = wc_get_orders( array(
        'limit'      => 1,
        'meta_query' => array(
            array(
                'key'   => '_nakama_quote_folio',
                'value' => $folio,
            ),
        ),
    ) );
    if ( ! empty( $existing ) ) {
        $order = $existing[0];
        return rest_ensure_response( array(
            'success' => true,
            'orderId' => $order->get_id(),
            'folio'   => $folio,
            'duplicated' => true,
        ) );
    }

    $user_id = get_current_user_id(); // 0 si es invitado; JWT lo autentica si viene.

    // Sin sesión pero con email de un cliente registrado: asociar el pedido a
    // esa cuenta para que la cotización aparezca en su Mi Cuenta (los pedidos
    // de invitado no son visibles ahí aunque el email coincida).
    if ( ! $user_id && $email ) {
        $user = get_user_by( 'email', $email );
        if ( $user ) {
            $user_id = (int) $user->ID;
        }
    }

    $order = wc_create_order( array( 'customer_id' => $user_id ) );
    if ( is_wp_error( $order ) ) {
        return new WP_Error( 'order_failed', 'No se pudo crear el pedido', array( 'status' => 500 ) );
    }

    // Concepto de la cotización con precio 0: el taller lo edita después
    // para asignar el precio real.
    $fee = new WC_Order_Item_Fee();
    $fee->set_name( 'Cotización ' . $folio . ( $summary ? ' — ' . $summary : '' ) );
    $fee->set_amount( 0 );
    $fee->set_total( 0 );
    $order->add_item( $fee );

    // Datos del cliente.
    $name_parts = explode( ' ', $name, 2 );
    $order->set_billing_first_name( $name_parts[0] );
    if ( ! empty( $name_parts[1] ) ) {
        $order->set_billing_last_name( $name_parts[1] );
    }
    if ( $email ) {
        $order->set_billing_email( $email );
    }
    if ( $phone ) {
        $order->set_billing_phone( $phone );
    }

    // Moneda base SIEMPRE: el precio que asigna el taller es en MXN; la
    // conversión a USD (si aplica) ocurre al pagar por el checkout normal.
    $order->set_currency( get_option( 'woocommerce_currency', 'MXN' ) );

    $order->update_meta_data( '_nakama_quote_folio', $folio );
    if ( ! $is_issued_folio ) {
        // Folio generado con el fallback aleatorio del frontend: se acepta
        // pero se marca para revisión.
        $order->update_meta_data( '_nakama_quote_folio_unverified', 'yes' );
    }

    $note = "Solicitud de cotización {$folio} generada desde el cotizador web.";
    if ( $summary ) {
        $note .= "\nProducto: {$summary}";
    }
    if ( $details ) {
        $note .= "\nDetalles: {$details}";
    }
    $note .= "\nCliente: {$name}" . ( $phone ? " | Tel: {$phone}" : '' ) . ( $email ? " | Email: {$email}" : '' );
    $note .= "\n\nPara cobrar: asigna el precio en el concepto, recalcula totales y cambia el estado a 'Pendiente de pago'. El cliente podrá pagar desde Mi Cuenta.";
    $order->add_order_note( $note );

    $order->calculate_totals();
    // 'on-hold' = En espera: visible para el cliente en Mi Cuenta, sin permitir
    // pago hasta que el taller asigne precio y lo pase a 'pending'.
    $order->set_status( 'on-hold', 'Cotización en revisión: pendiente de asignar precio.' );
    $order->save();

    $response = rest_ensure_response( array(
        'success' => true,
        'orderId' => $order->get_id(),
        'folio'   => $folio,
    ) );
    $response->header( 'Access-Control-Allow-Origin', '*' );
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    return $response;
}

// El folio de cotización reemplaza al número de pedido interno (NK-1001 en
// lugar de #4382) en Mi Cuenta, el admin y los correos de WooCommerce.
// Guardas defensivas: algunos plugins aplican estos filtros con menos
// argumentos o con un objeto inesperado y sin ellas se produce un fatal
// (p. ej. al cambiar el estado del pedido en el admin).
add_filter( 'woocommerce_order_number', function ( $number, $order = null ) {
    if ( ! $order instanceof WC_Abstract_Order ) {
        return $number;
    }
    $folio = $order->get_meta( '_nakama_quote_folio' );
    return $folio ? $folio : $number;
}, 10, 2 );

// Mostrar SIEMPRE el código de moneda junto al total del pedido (admin,
// Mi Cuenta y correos): MXN y USD comparten el símbolo "$" y no se
// distinguía con qué moneda se pagó.
add_filter( 'woocommerce_get_formatted_order_total', function ( $formatted, $order = null ) {
    if ( ! $order instanceof WC_Abstract_Order || ! is_string( $formatted ) ) {
        return $formatted;
    }
    $currency = $order->get_currency();
    if ( $currency && false === strpos( $formatted, $currency ) ) {
        $formatted .= ' ' . $currency;
    }
    return $formatted;
}, 10, 2 );

// Compatibilidad con el almacenamiento de pedidos HPOS de WooCommerce.
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );

function nakama_sso_set_cookie() {
    $user_id = get_current_user_id();
    if ( ! $user_id ) {
        return new WP_Error( 'no_user', 'Sesión no válida', array( 'status' => 401 ) );
    }

    // Sembrar la sesión de WordPress del MISMO usuario del token.
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true, is_ssl() );

    $response = rest_ensure_response( array(
        'success' => true,
        'adminUrl' => admin_url(),
    ) );
    // Nada de caché: la respuesta siembra cookies de sesión.
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    $response->header( 'Cache-Control', 'no-store' );
    return $response;
}

/**
 * Tipo de cambio MXN->USD con el margen del snippet "ImperioDev Currency
 * Global V15.7" (mismo transient, misma API, mismo -2 pesos). Devuelve
 * false si no hay caché y la API no responde.
 */
function nakama_get_usd_rate() {
    $base = get_option( 'woocommerce_currency', 'MXN' );

    // Mismo transient que el snippet v15.7 (compatibilidad con v15.6 por si acaso).
    $usd_rate = get_transient( 'id_rate_v15_7_USD' );
    if ( false === $usd_rate ) {
        $usd_rate = get_transient( 'id_rate_v15_6_USD' );
    }

    // Si el caché expiró, calcular EXACTAMENTE como el snippet para que
    // checkout y app nunca diverjan.
    if ( false === $usd_rate ) {
        $response_api = wp_remote_get(
            "https://v6.exchangerate-api.com/v6/0f6af8daed019b3b06c10383/pair/{$base}/USD",
            array( 'timeout' => 10 )
        );
        if ( ! is_wp_error( $response_api ) ) {
            $data = json_decode( wp_remote_retrieve_body( $response_api ), true );
            $rate = (float) ( $data['conversion_rate'] ?? 0 );
            if ( 'MXN' === $base && $rate > 0 ) {
                $pesos_por_dolar = max( 1.0, ( 1 / $rate ) - 2 );
                $rate            = 1 / $pesos_por_dolar;
            }
            if ( $rate > 0 ) {
                set_transient( 'id_rate_v15_7_USD', $rate, 6 * HOUR_IN_SECONDS );
                $usd_rate = $rate;
            }
        }
    }

    return ( false === $usd_rate ) ? false : (float) $usd_rate;
}

function nakama_currency_info() {
    $base     = get_option( 'woocommerce_currency', 'MXN' );
    $usd_rate = nakama_get_usd_rate();

    $response = rest_ensure_response( array(
        'baseCurrency' => $base,
        // null => sin caché y sin respuesta de la API; el frontend usa su fallback.
        'usdRate' => ( false === $usd_rate ) ? null : (float) $usd_rate,
    ) );
    $response->header( 'Access-Control-Allow-Origin', '*' );
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    $response->header( 'Cache-Control', 'no-cache, must-revalidate, max-age=0' );
    return $response;
}

function nakama_check_coupon_logic( WP_REST_Request $request ) {
    $code = sanitize_text_field( $request->get_param( 'code' ) );
    
    if ( empty( $code ) ) {
        return new WP_Error( 'no_code', 'Código vacío', array( 'status' => 400 ) );
    }

    $coupon = new WC_Coupon( $code );
    
    if ( ! $coupon->get_id() ) {
        return rest_ensure_response( array( 'valid' => false, 'message' => 'Cupón no existe' ) );
    }

    if ( ! $coupon->is_valid() ) {
        // Obtenemos por qué no es válido, sin embargo $coupon->is_valid() a veces requiere un cart real.
        // Haremos una validación base.
        $usage_count = $coupon->get_usage_count();
        $usage_limit = $coupon->get_usage_limit();
        if ( $usage_limit > 0 && $usage_count >= $usage_limit ) {
            return rest_ensure_response( array( 'valid' => false, 'message' => 'Límite de uso alcanzado' ) );
        }
    }

    $discount_type = $coupon->get_discount_type();
    $amount = $coupon->get_amount();

    $response_obj = rest_ensure_response( array(
        'valid' => true,
        'type' => $discount_type,
        'amount' => (float)$amount,
        'free_shipping' => $coupon->get_free_shipping(),
        'minimum_amount' => $coupon->get_minimum_amount()
    ) );
    
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    return $response_obj;
}

/**
 * BRIDGE: Pasarela de Carrito Headless -> WooCommerce
 * URL: https://nakamabordados.com/?nk_bridge=1&items=ID:QTY,ID:QTY...
 */
add_action( 'template_redirect', 'nakama_cart_bridge_handler' );
function nakama_cart_bridge_handler() {
    if ( ! isset( $_GET['nk_bridge'] ) ) {
        return;
    }

    $debug = isset( $_GET['nk_debug'] );

    if ( ! function_exists( 'WC' ) ) {
        if ( $debug ) echo "Error: WooCommerce no está activo.<br>";
        return;
    }

    // 0. Moneda elegida en el frontend Next: fijarla en la cookie que lee el
    //    snippet "ImperioDev Currency Global V15" (nakama_currency). La cookie
    //    es httpOnly, así que el navegador no puede escribirla con JS; se pasa
    //    por la URL del bridge y se fija aquí (servidor) antes del redirect.
    if ( ! empty( $_GET['currency'] ) ) {
        $currency = strtoupper( sanitize_text_field( $_GET['currency'] ) );
        if ( in_array( $currency, array( 'MXN', 'USD' ), true ) ) {
            setcookie(
                'nakama_currency',
                $currency,
                time() + DAY_IN_SECONDS,
                COOKIEPATH,
                COOKIE_DOMAIN,
                is_ssl(),
                true
            );
            // Disponible de inmediato para los filtros de moneda de ESTA petición.
            $_COOKIE['nakama_currency'] = $currency;
            if ( $debug ) echo "Moneda fijada: $currency<br>";
        }
    }

    // Asegurar que la sesión de WC esté iniciada
    if ( ! WC()->session || ! WC()->session->has_session() ) {
        WC()->session = new WC_Session_Handler();
        WC()->session->init();
    }

    // Asegurar que el carrito esté cargado
    if ( is_null( WC()->cart ) ) {
        WC()->cart = new WC_Cart();
    }

    if ( $debug ) echo "Bridge iniciado. Cart cargado.<br>";

    // MODO PAGO DE COTIZACIÓN: ?nk_bridge=pay-quote&order=<id>&key=<order_key>
    // Lleva la cotización por el CHECKOUT NORMAL (dirección de envío,
    // paqueterías y cupones) en lugar de la página order-pay, que no los pide.
    if ( 'pay-quote' === $_GET['nk_bridge'] ) {
        nakama_pay_quote_via_checkout( $debug );
        return;
    }

    // 1. Limpiar carrito actual
    WC()->cart->empty_cart();
    if ( $debug ) echo "Carrito limpiado.<br>";

    // 2. Parsear items: "ID:QTY,ID:QTY"
    if ( ! isset( $_GET['items'] ) || empty( $_GET['items'] ) ) {
        if ( $debug ) echo "Error: No hay items en la URL.<br>";
        return;
    }

    $items_raw = explode( ',', sanitize_text_field( $_GET['items'] ) );
    if ( $debug ) echo "Items detectados: " . count($items_raw) . "<br>";

    foreach ( $items_raw as $item_str ) {
        $parts = explode( ':', $item_str );
        if ( count( $parts ) < 2 ) continue;

        $product_id = (int) $parts[0];
        $quantity   = (int) $parts[1];

        if ( $product_id <= 0 || $quantity <= 0 ) continue;

        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            if ( $debug ) echo "Error: Producto ID $product_id no encontrado.<br>";
            continue;
        }

        if ( $product->is_type( 'variation' ) ) {
            $parent_id = $product->get_parent_id();
            $added = WC()->cart->add_to_cart( $parent_id, $quantity, $product_id );
            if ( $debug ) echo "Añadiendo variación $product_id (Parent $parent_id) x $quantity: " . ($added ? 'OK' : 'FAIL') . "<br>";
        } else {
            $added = WC()->cart->add_to_cart( $product_id, $quantity );
            if ( $debug ) echo "Añadiendo producto simple $product_id x $quantity: " . ($added ? 'OK' : 'FAIL') . "<br>";
        }
    }

    // 2.5 Aplicar cupón
    if ( ! empty( $_GET['coupon'] ) ) {
        $coupon_code = sanitize_text_field( $_GET['coupon'] );
        $applied = WC()->cart->apply_coupon( $coupon_code );
        if ( $debug ) echo "Aplicando cupón $coupon_code: " . ($applied ? 'OK' : 'FAIL') . "<br>";
    }

    // 3. Redirigir al checkout
    $checkout_url = wc_get_checkout_url();
    
    if ( $debug ) {
        echo "Redirección preparada a: $checkout_url<br>";
        echo "<a href='$checkout_url'>Ir al checkout manualmente (Debug)</a>";
        exit;
    }

    wp_safe_redirect( $checkout_url );
    exit;
}

/**
 * PAGO DE COTIZACIONES POR EL CHECKOUT NORMAL
 * La página order-pay de WooCommerce no pide dirección de envío ni calcula
 * paqueterías/cupones. Para cobrar una cotización con envío real, el pedido
 * de cotización se convierte en un artículo de carrito (producto oculto con
 * el precio asignado) y el cliente pasa por el checkout estándar. Al pagar,
 * el folio NK-x se transfiere al pedido nuevo y la cotización original se
 * cancela con una nota de referencia.
 */

/** Producto oculto reutilizable que representa una cotización en el carrito. */
function nakama_quote_product_id() {
    $id = (int) get_option( 'nakama_quote_product_id' );
    if ( $id && 'publish' === get_post_status( $id ) ) {
        return $id;
    }
    $p = new WC_Product_Simple();
    $p->set_name( 'Cotización Personalizada Nakama' );
    $p->set_status( 'publish' );
    $p->set_catalog_visibility( 'hidden' );
    $p->set_regular_price( '0' );
    $p->set_price( '0' );
    $p->set_virtual( false ); // físico: el checkout debe pedir envío
    $p->set_sold_individually( true );
    // Peso/dimensiones por defecto para que la paquetería cotice; el taller
    // puede ajustarlos editando este producto (queda oculto del catálogo).
    $p->set_weight( '1' );
    $id = $p->save();
    update_option( 'nakama_quote_product_id', $id );
    return $id;
}

/** Valida el pedido de cotización y manda al cliente al checkout normal. */
function nakama_pay_quote_via_checkout( $debug = false ) {
    $order_id = absint( $_GET['order'] ?? 0 );
    $key      = sanitize_text_field( $_GET['key'] ?? '' );

    $order = $order_id ? wc_get_order( $order_id ) : false;
    if ( ! $order || ! hash_equals( $order->get_order_key(), $key ) ) {
        if ( $debug ) { echo 'Error: pedido o llave inválidos.'; exit; }
        wp_safe_redirect( home_url( '/' ) );
        exit;
    }
    if ( ! $order->needs_payment() ) {
        if ( $debug ) { echo 'El pedido no requiere pago (estado: ' . $order->get_status() . ').'; exit; }
        wp_safe_redirect( home_url( '/mi-cuenta/' ) );
        exit;
    }

    $total = (float) $order->get_total();
    if ( $total <= 0 ) {
        // Aún sin precio asignado: no hay nada que cobrar.
        if ( $debug ) { echo 'La cotización aún no tiene precio asignado.'; exit; }
        wp_safe_redirect( home_url( '/mi-cuenta/' ) );
        exit;
    }

    // El precio del carrito debe ir en moneda BASE (MXN): el conversor de
    // moneda del checkout multiplica por el tipo de cambio si el cliente ve
    // USD. Si la cotización se creó/preció en USD (pedidos previos al fix de
    // moneda base), convertir a MXN con el MISMO rate del snippet para que el
    // viaje de ida y vuelta sea exacto (100 USD -> MXN -> 100 USD).
    $base           = get_option( 'woocommerce_currency', 'MXN' );
    $order_currency = $order->get_currency();
    if ( $order_currency && $order_currency !== $base ) {
        if ( 'USD' === $order_currency ) {
            $rate = nakama_get_usd_rate();
            if ( $rate && $rate > 0 ) {
                $total = $total / $rate; // USD -> MXN
                if ( $debug ) echo 'Total convertido de USD a base: ' . $total . '<br>';
            } else {
                if ( $debug ) { echo 'Error: no hay tipo de cambio disponible para convertir la cotización en USD.'; exit; }
                wp_safe_redirect( home_url( '/mi-cuenta/' ) );
                exit;
            }
        } else {
            if ( $debug ) { echo 'Error: moneda de cotización no soportada: ' . esc_html( $order_currency ); exit; }
            wp_safe_redirect( home_url( '/mi-cuenta/' ) );
            exit;
        }
    }

    WC()->cart->empty_cart();
    $added = WC()->cart->add_to_cart(
        nakama_quote_product_id(),
        1,
        0,
        array(),
        array(
            'nakama_quote_order_id' => $order->get_id(),
            'nakama_quote_folio'    => (string) $order->get_meta( '_nakama_quote_folio' ),
            'nakama_quote_price'    => $total,
        )
    );

    if ( $debug ) {
        echo 'Cotización ' . esc_html( $order->get_meta( '_nakama_quote_folio' ) ) . " al carrito: " . ( $added ? 'OK' : 'FAIL' ) . '<br>';
        echo "<a href='" . esc_url( wc_get_checkout_url() ) . "'>Ir al checkout</a>";
        exit;
    }

    wp_safe_redirect( wc_get_checkout_url() );
    exit;
}

// Precio y nombre del artículo de cotización en el carrito. Prioridad 20:
// corre ANTES que el conversor de moneda (999), que convierte a USD si aplica.
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
    foreach ( $cart->get_cart() as $cart_item ) {
        if ( isset( $cart_item['nakama_quote_price'] ) ) {
            $cart_item['data']->set_price( (float) $cart_item['nakama_quote_price'] );
            if ( ! empty( $cart_item['nakama_quote_folio'] ) ) {
                $cart_item['data']->set_name( 'Cotización ' . $cart_item['nakama_quote_folio'] );
            }
        }
    }
}, 20 );

// Copiar la referencia de la cotización al pedido nuevo que crea el checkout.
add_action( 'woocommerce_checkout_create_order_line_item', function ( $item, $cart_item_key, $values, $order ) {
    if ( isset( $values['nakama_quote_order_id'] ) ) {
        $order->update_meta_data( '_nakama_quote_source_order', (int) $values['nakama_quote_order_id'] );
        if ( ! empty( $values['nakama_quote_folio'] ) ) {
            $order->update_meta_data( '_nakama_quote_folio', $values['nakama_quote_folio'] );
            $item->add_meta_data( 'Folio', $values['nakama_quote_folio'], true );
        }
    }
}, 10, 4 );

// Al completarse el checkout: el folio vive ahora en el pedido nuevo (pagado,
// con envío); la cotización original se cancela con nota de referencia.
add_action( 'woocommerce_checkout_order_processed', function ( $order_id, $posted_data, $order ) {
    $src_id = (int) $order->get_meta( '_nakama_quote_source_order' );
    if ( ! $src_id ) {
        return;
    }
    $src = wc_get_order( $src_id );
    if ( ! $src ) {
        return;
    }
    $folio = $src->get_meta( '_nakama_quote_folio' );
    // Liberar el folio del original para que el número NK-x identifique al nuevo.
    $src->delete_meta_data( '_nakama_quote_folio' );
    $src->update_meta_data( '_nakama_quote_folio_ref', $folio );
    $src->add_order_note( sprintf( 'Cotización %s pagada mediante el pedido #%d (checkout normal con envío).', $folio, $order_id ) );
    $src->update_status( 'cancelled', 'Reemplazada por el pedido de pago con envío.' );
    $src->save();
}, 10, 3 );

/**
 * PROMOCIONES CONSCIENTES DE MONEDA + DESCUENTO POR TRANSFERENCIA
 * Los mínimos de las promos están definidos en MXN (envío gratis desde
 * $1,500, etc.), pero cuando el cliente navega en USD los totales del
 * carrito quedan en dólares y las comparaciones fallan (100 USD < 1500).
 * Estos filtros convierten el subtotal a moneda base antes de comparar.
 */

/** Moneda que está viendo el cliente (cookie del snippet de moneda). */
function nakama_current_display_currency() {
    if ( isset( $_COOKIE['nakama_currency'] ) ) {
        $val = strtoupper( sanitize_text_field( $_COOKIE['nakama_currency'] ) );
        if ( in_array( $val, array( 'MXN', 'USD' ), true ) ) {
            return $val;
        }
    }
    return get_option( 'woocommerce_currency', 'MXN' );
}

/** Subtotal mostrado del carrito convertido a moneda base (MXN). */
function nakama_cart_subtotal_in_base( $subtotal_display ) {
    $base     = get_option( 'woocommerce_currency', 'MXN' );
    $currency = nakama_current_display_currency();
    if ( $currency === $base ) {
        return (float) $subtotal_display;
    }
    $rate = nakama_get_usd_rate();
    if ( ! $rate || $rate <= 0 ) {
        return (float) $subtotal_display; // sin rate: no tocar el comportamiento.
    }
    return (float) $subtotal_display / $rate; // USD -> MXN
}

// Método "Envío gratuito": re-evaluar el requisito de monto mínimo en MXN.
add_filter( 'woocommerce_shipping_free_shipping_is_available', function ( $is_available, $package, $method ) {
    if ( $is_available || ! WC()->cart ) {
        return $is_available;
    }
    $requires = $method->get_option( 'requires' );
    if ( ! in_array( $requires, array( 'min_amount', 'either', 'both' ), true ) ) {
        return $is_available;
    }
    $min = (float) $method->get_option( 'min_amount' );
    if ( $min <= 0 ) {
        return $is_available;
    }

    // Mismo cálculo que hace WooCommerce, pero convertido a moneda base.
    $subtotal = WC()->cart->get_displayed_subtotal();
    if ( 'no' === $method->get_option( 'ignore_discounts', 'no' ) ) {
        $subtotal -= WC()->cart->get_discount_total();
        if ( WC()->cart->display_prices_including_tax() ) {
            $subtotal -= WC()->cart->get_discount_tax();
        }
    }
    $meets_min = nakama_cart_subtotal_in_base( $subtotal ) >= $min;

    if ( 'both' === $requires ) {
        $has_free_coupon = false;
        foreach ( WC()->cart->get_coupons() as $coupon ) {
            if ( $coupon->get_free_shipping() ) {
                $has_free_coupon = true;
                break;
            }
        }
        return $meets_min && $has_free_coupon;
    }

    // min_amount o either: basta con cumplir el monto en base.
    return $meets_min;
}, 20, 3 );

// Cupones con "gasto mínimo": validar el mínimo contra el subtotal en MXN.
add_filter( 'woocommerce_coupon_validate_minimum_amount', function ( $invalid, $coupon, $subtotal ) {
    if ( ! $invalid ) {
        return $invalid;
    }
    return ! ( nakama_cart_subtotal_in_base( $subtotal ) >= (float) $coupon->get_minimum_amount() );
}, 10, 3 );

// Nota: el descuento por transferencia y los cupones se gestionan desde otro
// plugin; aquí solo viven los ajustes de moneda (mínimos en MXN vs carrito USD).

// Webhook para sincronizar Base de datos al actualizar/crear producto
add_action( 'save_post_product', 'nakama_trigger_db_sync', 10, 3 );
function nakama_trigger_db_sync( $post_id, $post, $update ) {
    if ( $post->post_status !== 'publish' ) {
        return;
    }
    
    // Cambiar localhost por la URL de tu Next.js cuando esté en producción
    $nextjs_sync_url = 'http://localhost:3000/api/sync-db';
    
    // Usamos wp_remote_post en background timeout pequeño para no alentar WP
    wp_remote_post( $nextjs_sync_url, array(
        'timeout'   => 1,
        'blocking'  => false,
        'body'      => json_encode( array( 'product_id' => $post_id, 'action' => 'update' ) ),
        'headers'   => array( 'Content-Type' => 'application/json' )
    ) );
}
