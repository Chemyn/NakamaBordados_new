<?php
/**
 * Plugin Name: Nakama Checkout Tools
 * Description: Endpoints REST para validación de cupones y sincronización de base de datos local (Next.js).
 * Version: 1.0
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
});

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
