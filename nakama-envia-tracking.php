<?php
/**
 * Plugin Name: Nakama Envia.com Tracking Integration
 * Description: Sistema completo de rastreo: Webhook de Envia, Proxy de consulta segura y exposición en WPGraphQL.
 * Version: 1.1
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. EXPONER CAMPOS EN WPGRAPHQL
add_action( 'graphql_register_types', function() {
    register_graphql_field( 'Order', 'enviaTrackingCode', [
        'type' => 'String',
        'description' => 'Código de rastreo de Envia.com',
        'resolve' => function( $order ) {
            $tracking_code = get_post_meta( $order->databaseId, '_envia_tracking_code', true );
            return ! empty( $tracking_code ) ? $tracking_code : null;
        }
    ]);

    register_graphql_field( 'Order', 'enviaCarrier', [
        'type' => 'String',
        'description' => 'Paquetería asignada por Envia.com',
        'resolve' => function( $order ) {
            $carrier = get_post_meta( $order->databaseId, '_envia_carrier', true );
            return ! empty( $carrier ) ? $carrier : null;
        }
    ]);
});

// 2. REGISTRAR RUTAS REST API PERSONALIZADAS
add_action( 'rest_api_init', function () {
    // Endpoint para recibir Webhooks de Envia.com
    // URL: https://tudominio.com/wp-json/nakama/v1/envia-webhook
    register_rest_route( 'nakama/v1', '/envia-webhook', array(
        'methods' => 'POST',
        'callback' => 'nakama_handle_envia_webhook',
        'permission_callback' => '__return_true', // Validaremos seguridad dentro de la función
    ) );

    // Endpoint Proxy para consultar el rastreo desde Next.js
    // URL: https://tudominio.com/wp-json/nakama/v1/track-shipment
    register_rest_route( 'nakama/v1', '/track-shipment', array(
        'methods' => 'GET',
        'callback' => 'nakama_get_tracking_data',
        'permission_callback' => '__return_true', // Permitimos consulta pública (se podría asegurar con JWT)
    ) );
});

// 3. HANDLER DEL WEBHOOK (Actualiza WooCommerce)
function nakama_handle_envia_webhook( WP_REST_Request $request ) {
    // El secreto debe configurarse via variable de entorno u opcion de WordPress. NUNCA hardcodear.
    $webhook_secret = getenv('ENVIA_WEBHOOK_SECRET') ?: get_option('nakama_envia_webhook_secret', '');
    
    // Verificar token (Envia.com suele enviarlo en el header Authorization o X-Envia-Token)
    $auth_header = $request->get_header( 'authorization' ) ?: $request->get_header( 'x_envia_token' );
    
    // Validar seguridad
    if ( $auth_header !== $webhook_secret && $auth_header !== 'Bearer ' . $webhook_secret ) {
        return new WP_Error( 'unauthorized', 'Token inválido', array( 'status' => 401 ) );
    }

    $payload = $request->get_json_params();
    if ( empty( $payload ) ) {
        return new WP_Error( 'invalid_data', 'No se recibieron datos', array( 'status' => 400 ) );
    }

    $data = isset($payload['data']) ? (is_array($payload['data']) ? $payload['data'][0] : $payload['data']) : $payload;

    $tracking_number = isset($data['trackingNumber']) ? $data['trackingNumber'] : (isset($data['tracking_number']) ? $data['tracking_number'] : null);
    $carrier = isset($data['carrier']) ? $data['carrier'] : null;
    $order_id = isset($data['order']) ? $data['order'] : (isset($data['order_id']) ? $data['order_id'] : (isset($data['reference']) ? $data['reference'] : null));

    if ( ! $tracking_number || ! $order_id ) {
        return rest_ensure_response( array( 'status' => 'ignored', 'reason' => 'Faltan campos (trackingNumber u order)' ) );
    }

    // Limpiar el ID de la orden (quitar "WP-" si lo mandas así)
    $clean_order_id = preg_replace('/[^0-9]/', '', $order_id);

    $order = wc_get_order( $clean_order_id );
    if ( ! $order ) {
        return new WP_Error( 'not_found', 'Orden no encontrada en WooCommerce', array( 'status' => 404 ) );
    }

    // Actualizar metadatos
    $order->update_meta_data( '_envia_tracking_code', sanitize_text_field($tracking_number) );
    if ( $carrier ) {
        $order->update_meta_data( '_envia_carrier', sanitize_text_field($carrier) );
    }
    $order->save();

    return rest_ensure_response( array( 'success' => true, 'order_id' => $clean_order_id, 'tracking' => $tracking_number ) );
}

// 4. HANDLER DEL PROXY DE RASTREO (Consulta a Envia.com ocultando el Token)
function nakama_get_tracking_data( WP_REST_Request $request ) {
    $tracking_number = $request->get_param( 'tracking' );
    $carrier = $request->get_param( 'carrier' );

    if ( ! $tracking_number || ! $carrier ) {
        return new WP_Error( 'missing_params', 'tracking y carrier son requeridos', array( 'status' => 400 ) );
    }

    // El token debe configurarse via variable de entorno u opcion de WordPress. NUNCA hardcodear.
    $envia_api_token = getenv('ENVIA_API_TOKEN') ?: get_option('nakama_envia_api_token', '');

    $url = 'https://queries.envia.com/guide/track';
    
    $body = json_encode( array(
        'trackingNumbers' => array( $tracking_number ),
        'carrier' => $carrier
    ) );

    $args = array(
        'body'        => $body,
        'timeout'     => 15,
        'headers'     => array(
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $envia_api_token,
        ),
    );

    $response = wp_remote_post( $url, $args );

    if ( is_wp_error( $response ) ) {
        return new WP_Error( 'api_error', 'Error conectando con Envia.com', array( 'status' => 500 ) );
    }

    $body_response = wp_remote_retrieve_body( $response );
    $data = json_decode( $body_response, true );

    $response_obj = rest_ensure_response( array( 'success' => true, 'data' => $data ) );
    
    // Habilitar CORS para permitir consultas desde el entorno local o cualquier origen
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    $response_obj->header( 'Access-Control-Allow-Methods', 'GET' );
    
    return $response_obj;
}
