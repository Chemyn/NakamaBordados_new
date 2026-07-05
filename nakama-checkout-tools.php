<?php
/**
 * Plugin Name: Nakama Checkout Tools
 * Description: Endpoints REST para validación de cupones, moneda, SSO, pedidos de cotización y sincronización de base de datos local (Next.js).
 * Version: 1.5
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

function nakama_currency_info() {
    $base = get_option( 'woocommerce_currency', 'MXN' );

    // Mismo transient que el snippet v15.7 (compatibilidad con v15.6 por si acaso).
    $usd_rate = get_transient( 'id_rate_v15_7_USD' );
    if ( false === $usd_rate ) {
        $usd_rate = get_transient( 'id_rate_v15_6_USD' );
    }

    // Si el caché expiró, calcular EXACTAMENTE como el snippet (misma API,
    // mismo margen de -2 pesos, mismo transient) para que checkout y app
    // nunca diverjan.
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
