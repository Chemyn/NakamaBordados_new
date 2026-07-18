<?php
/**
 * Plugin Name: Nakama Envia.com Tracking Integration
 * Description: Sistema completo de rastreo: Webhook de Envia, Proxy de consulta segura, línea de tiempo vía 17TRACK, exposición en WPGraphQL y pantalla de ajustes (tokens/secret).
 * Version: 1.5
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Compatibilidad con HPOS (almacenamiento de pedidos en tablas propias).
add_action( 'before_woocommerce_init', function() {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );

/**
 * Lee un meta de pedido vía WC_Order (funciona con HPOS y con postmeta;
 * get_post_meta directo devuelve vacío cuando HPOS está activo).
 */
function nakama_envia_order_meta( $order_id, $key ) {
    if ( ! function_exists( 'wc_get_order' ) ) {
        return get_post_meta( $order_id, $key, true );
    }
    $order = wc_get_order( $order_id );
    return $order ? $order->get_meta( $key ) : '';
}

/**
 * Localiza la guía de rastreo en un pedido sin depender de una sola clave de
 * metadato. Los plugins de Envia/paquetería guardan la guía con su propia
 * clave (no siempre la nuestra `_envia_tracking_code`), así que buscamos en
 * varias fuentes. Devuelve array( 'code' => string, 'carrier' => string ).
 */
function nakama_find_order_tracking( $order ) {
    if ( ! $order ) {
        return array( 'code' => '', 'carrier' => '' );
    }

    // 1. Nuestra clave (webhook de Envia): la más confiable si existe.
    $code = $order->get_meta( '_envia_tracking_code' );
    if ( ! empty( $code ) ) {
        return array( 'code' => (string) $code, 'carrier' => (string) $order->get_meta( '_envia_carrier' ) );
    }

    // 2. Meta de las LÍNEAS del pedido: el plugin "Envia Shipping and
    //    Fulfillment" guarda la guía como meta de un item de envío (no del
    //    pedido). Confirmado en producción: wc_order_itemmeta.tracking_number.
    $item_hit = nakama_find_item_tracking( $order );
    if ( $item_hit ) {
        return $item_hit;
    }

    // 3. Claves escalares conocidas de otros plugins de tracking.
    $number_keys  = array( '_tracking_number', 'tracking_number', '_wt_tracking_number', '_aftership_tracking_number' );
    $carrier_keys = array( '_tracking_company', 'tracking_company', '_tracking_provider', 'tracking_provider', 'carrier' );
    foreach ( $number_keys as $nk ) {
        $v = $order->get_meta( $nk );
        if ( ! empty( $v ) && is_scalar( $v ) ) {
            $carrier = '';
            foreach ( $carrier_keys as $ck ) {
                $cv = $order->get_meta( $ck );
                if ( ! empty( $cv ) && is_scalar( $cv ) ) { $carrier = (string) $cv; break; }
            }
            return array( 'code' => (string) $v, 'carrier' => $carrier );
        }
    }

    // 3. Escaneo de TODOS los metadatos por si la guía vive dentro de un array
    //    o un JSON (el plugin de Envia guarda el envío como objeto con
    //    tracking_number/tracking_company anidados).
    foreach ( $order->get_meta_data() as $meta ) {
        $data  = $meta->get_data();
        $value = isset( $data['value'] ) ? $data['value'] : null;
        if ( is_string( $value ) ) {
            $decoded = json_decode( $value, true );
            if ( is_array( $decoded ) ) {
                $value = $decoded;
            }
        }
        $hit = nakama_extract_tracking( $value );
        if ( $hit ) {
            return $hit;
        }
    }

    return array( 'code' => '', 'carrier' => '' );
}

/**
 * Busca la guía en la meta de las líneas del pedido (WC_Order_Item). El plugin
 * "Envia Shipping and Fulfillment" agrega una línea con la etiqueta y guarda
 * tracking_number / tracking_company como meta del item. Consulta directa a
 * woocommerce_order_items(+itemmeta) para no depender del tipo de línea (las
 * tablas de items no las mueve HPOS). Devuelve array o null.
 */
function nakama_find_item_tracking( $order ) {
    global $wpdb;
    $items    = $wpdb->prefix . 'woocommerce_order_items';
    $itemmeta = $wpdb->prefix . 'woocommerce_order_itemmeta';

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT im.order_item_id AS iid, im.meta_value AS code
         FROM {$items} oi
         JOIN {$itemmeta} im ON im.order_item_id = oi.order_item_id
         WHERE oi.order_id = %d
           AND im.meta_key IN ('tracking_number', '_tracking_number')
           AND im.meta_value <> ''
         ORDER BY im.order_item_id DESC
         LIMIT 1",
        $order->get_id()
    ) );

    if ( ! $row || empty( $row->code ) ) {
        return null;
    }

    $carrier = $wpdb->get_var( $wpdb->prepare(
        "SELECT meta_value FROM {$itemmeta}
         WHERE order_item_id = %d
           AND meta_key IN ('tracking_company', 'carrier', 'tracking_provider', 'carrier_name')
           AND meta_value <> ''
         LIMIT 1",
        $row->iid
    ) );

    return array( 'code' => (string) $row->code, 'carrier' => (string) $carrier );
}

/**
 * Busca recursivamente un tracking_number dentro de un array anidado
 * (objeto de envío o lista de envíos). Devuelve el primer hallazgo o null.
 */
function nakama_extract_tracking( $value ) {
    if ( ! is_array( $value ) ) {
        return null;
    }

    if ( ! empty( $value['tracking_number'] ) && is_scalar( $value['tracking_number'] ) ) {
        $carrier = '';
        foreach ( array( 'tracking_company', 'carrier', 'tracking_provider', 'carrier_name', 'provider' ) as $k ) {
            if ( ! empty( $value[ $k ] ) && is_scalar( $value[ $k ] ) ) { $carrier = (string) $value[ $k ]; break; }
        }
        return array( 'code' => (string) $value['tracking_number'], 'carrier' => $carrier );
    }

    foreach ( $value as $sub ) {
        if ( is_array( $sub ) ) {
            $hit = nakama_extract_tracking( $sub );
            if ( $hit ) {
                return $hit;
            }
        }
    }
    return null;
}

/**
 * Evita que LiteSpeed cachee las respuestas del API (servía estados de
 * rastreo viejos e incluso 404 previos a instalar el plugin).
 */
function nakama_envia_no_cache( $response ) {
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    return $response;
}

// ---------------------------------------------------------------------------
// 17TRACK (api.17track.net v2.4): aporta el historial COMPLETO de eventos para
// la línea de tiempo de Mi Cuenta. La guía sigue llegando por el webhook de
// Envia; 17TRACK solo enriquece la consulta. El token es secreto (server-side).
// ---------------------------------------------------------------------------

function nakama_17track_token() {
    return getenv( 'SEVENTEENTRACK_TOKEN' ) ?: get_option( 'nakama_17track_token', '' );
}

/**
 * POST a un endpoint de 17TRACK v2.4. $payload es el array de guías (máx 40).
 * Devuelve el JSON decodificado o WP_Error.
 */
function nakama_17track_request( $endpoint, $payload ) {
    $token = nakama_17track_token();
    if ( empty( $token ) ) {
        return new WP_Error( 'not_configured', 'Token de 17TRACK no configurado' );
    }

    $response = wp_remote_post( 'https://api.17track.net/track/v2.4/' . $endpoint, array(
        'timeout' => 15,
        'headers' => array(
            'Content-Type' => 'application/json',
            '17token'      => $token,
        ),
        'body'    => wp_json_encode( $payload ),
    ) );

    if ( is_wp_error( $response ) ) {
        return $response;
    }

    $data = json_decode( wp_remote_retrieve_body( $response ), true );
    if ( ! is_array( $data ) ) {
        return new WP_Error( 'bad_response', 'Respuesta inválida de 17TRACK' );
    }
    return $data;
}

/**
 * Mapa nombre de paquetería (como la reporta Envia) → código de carrier de
 * 17TRACK. Si la paquetería no está aquí se omite el código y 17TRACK la
 * auto-detecta a partir del formato de la guía.
 */
function nakama_17track_carrier_code( $carrier ) {
    $map = array(
        'estafeta'      => 100139,
        'dhl'           => 100001,
        'fedex'         => 100003,
        'ups'           => 100002,
        'paquetexpress' => 100147,
        'redpack'       => 100138,
    );
    $key = strtolower( trim( (string) $carrier ) );
    return isset( $map[ $key ] ) ? $map[ $key ] : 0;
}

/** Estados de 17TRACK → etiqueta en español para el cliente. */
function nakama_17track_status_es( $status ) {
    $map = array(
        'NotFound'           => 'En espera de recolección',
        'InfoReceived'       => 'Información recibida',
        'InTransit'          => 'En tránsito',
        'Expired'            => 'Sin actualizaciones recientes',
        'AvailableForPickup' => 'Listo para recoger en sucursal',
        'OutForDelivery'     => 'En reparto',
        'DeliveryFailure'    => 'Intento de entrega fallido',
        'Delivered'          => 'Entregado',
        'Exception'          => 'Incidencia en el envío',
    );
    return isset( $map[ $status ] ) ? $map[ $status ] : $status;
}

/**
 * Registra una guía en 17TRACK (consume 1 de cuota, solo la primera vez;
 * re-registrar devuelve -18019901 y es inofensivo). Nunca lanza.
 */
function nakama_17track_register( $tracking_number, $carrier = '' ) {
    $item = array(
        'number' => (string) $tracking_number,
        'lang'   => 'es',
    );
    $code = nakama_17track_carrier_code( $carrier );
    if ( $code ) {
        $item['carrier'] = $code;
    }
    return nakama_17track_request( 'register', array( $item ) );
}

// 1. EXPONER CAMPOS EN WPGRAPHQL
add_action( 'graphql_register_types', function() {
    register_graphql_field( 'Order', 'enviaTrackingCode', [
        'type' => 'String',
        'description' => 'Código de rastreo (busca en varias claves de metadatos)',
        'resolve' => function( $order ) {
            $found = nakama_find_order_tracking( wc_get_order( $order->databaseId ) );
            return ! empty( $found['code'] ) ? $found['code'] : null;
        }
    ]);

    register_graphql_field( 'Order', 'enviaCarrier', [
        'type' => 'String',
        'description' => 'Paquetería asignada',
        'resolve' => function( $order ) {
            $found = nakama_find_order_tracking( wc_get_order( $order->databaseId ) );
            return ! empty( $found['carrier'] ) ? $found['carrier'] : null;
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

    // Línea de tiempo de rastreo (17TRACK con fallback a Envia) para Mi Cuenta.
    // URL: https://tudominio.com/?rest_route=/nakama/v1/track-timeline
    register_rest_route( 'nakama/v1', '/track-timeline', array(
        'methods'  => 'GET',
        'callback' => 'nakama_get_track_timeline',
        'permission_callback' => '__return_true', // Consulta pública, igual que track-shipment.
    ) );

    // Endpoint Proxy para cotizar envíos (rate) desde el frontend estático (Next.js export)
    // Reemplaza la ruta Next.js /api/shipping para mantener el ENVIA_API_TOKEN en el servidor.
    // URL: https://tudominio.com/wp-json/nakama/v1/shipping
    register_rest_route( 'nakama/v1', '/shipping', array(
        'methods' => 'POST, OPTIONS', // OPTIONS para el preflight CORS del navegador
        'callback' => 'nakama_get_shipping_rates',
        'permission_callback' => '__return_true', // Es una cotización pública; se valida el origen dentro de la función.
    ) );
});

// 3. HANDLER DEL WEBHOOK (Actualiza WooCommerce)
function nakama_handle_envia_webhook( WP_REST_Request $request ) {
    // El secreto se configura en Ajustes → Nakama Envia (o via variable de entorno).
    $webhook_secret = getenv('ENVIA_WEBHOOK_SECRET') ?: get_option('nakama_envia_webhook_secret', '');

    if ( empty( $webhook_secret ) ) {
        return new WP_Error( 'not_configured', 'Configura el secreto del webhook en Ajustes → Nakama Envia', array( 'status' => 503 ) );
    }

    // El panel de Envia.com no siempre permite headers personalizados: se acepta
    // el secreto en Authorization, X-Envia-Token o como ?secret= en la URL.
    $auth_header = $request->get_header( 'authorization' ) ?: $request->get_header( 'x_envia_token' );
    $query_secret = $request->get_param( 'secret' );

    $valid = ( is_string( $auth_header ) && ( hash_equals( $webhook_secret, $auth_header ) || hash_equals( 'Bearer ' . $webhook_secret, $auth_header ) ) )
        || ( is_string( $query_secret ) && hash_equals( $webhook_secret, $query_secret ) );

    if ( ! $valid ) {
        return new WP_Error( 'unauthorized', 'Token inválido', array( 'status' => 401 ) );
    }

    $payload = $request->get_json_params();
    if ( empty( $payload ) ) {
        return new WP_Error( 'invalid_data', 'No se recibieron datos', array( 'status' => 400 ) );
    }

    $data = isset($payload['data']) ? (is_array($payload['data']) && isset($payload['data'][0]) ? $payload['data'][0] : $payload['data']) : $payload;

    $tracking_number = isset($data['trackingNumber']) ? $data['trackingNumber'] : (isset($data['tracking_number']) ? $data['tracking_number'] : null);
    $carrier = isset($data['carrier']) ? $data['carrier'] : null;
    $order_id = isset($data['order']) ? $data['order'] : (isset($data['order_id']) ? $data['order_id'] : (isset($data['reference']) ? $data['reference'] : null));

    if ( ! $tracking_number || ! $order_id ) {
        return nakama_envia_no_cache( rest_ensure_response( array( 'status' => 'ignored', 'reason' => 'Faltan campos (trackingNumber u order)' ) ) );
    }

    // Limpiar el ID de la orden (quitar "WP-" si lo mandas así)
    $clean_order_id = preg_replace('/[^0-9]/', '', $order_id);

    $order = wc_get_order( $clean_order_id );

    // Cotizaciones: su número visible es el folio NK-#### (no el ID interno).
    // Si la referencia vino como folio, buscar el pedido por su meta.
    if ( ! $order && $clean_order_id ) {
        $folio_orders = wc_get_orders( array(
            'limit'      => 1,
            'meta_key'   => '_nakama_quote_folio',
            'meta_value' => 'NK-' . $clean_order_id,
        ) );
        if ( ! empty( $folio_orders ) ) {
            $order = $folio_orders[0];
        }
    }

    if ( ! $order ) {
        return new WP_Error( 'not_found', 'Orden no encontrada en WooCommerce', array( 'status' => 404 ) );
    }

    // Actualizar metadatos
    $order->update_meta_data( '_envia_tracking_code', sanitize_text_field($tracking_number) );
    if ( $carrier ) {
        $order->update_meta_data( '_envia_carrier', sanitize_text_field($carrier) );
    }
    $order->add_order_note( sprintf( 'Guía de Envia.com registrada: %s%s', sanitize_text_field( $tracking_number ), $carrier ? ' (' . sanitize_text_field( $carrier ) . ')' : '' ) );
    $order->save();

    // Registro proactivo en 17TRACK: así cuando el cliente abra Mi Cuenta la
    // línea de tiempo ya tiene datos. Nunca debe romper el webhook (la función
    // devuelve WP_Error en fallo, no lanza) y re-registrar es inofensivo.
    if ( ! empty( nakama_17track_token() ) ) {
        nakama_17track_register( $tracking_number, (string) $carrier );
    }

    return nakama_envia_no_cache( rest_ensure_response( array( 'success' => true, 'order_id' => $order->get_id(), 'tracking' => $tracking_number ) ) );
}

// 4. HANDLER DEL PROXY DE RASTREO (Consulta a Envia.com ocultando el Token)
function nakama_get_tracking_data( WP_REST_Request $request ) {
    $tracking_number = $request->get_param( 'tracking' );
    $carrier = $request->get_param( 'carrier' );

    if ( ! $tracking_number || ! $carrier ) {
        return new WP_Error( 'missing_params', 'tracking y carrier son requeridos', array( 'status' => 400 ) );
    }

    // El token se configura en Ajustes → Nakama Envia (o via variable de entorno).
    $envia_api_token = getenv('ENVIA_API_TOKEN') ?: get_option('nakama_envia_api_token', '');
    if ( empty( $envia_api_token ) ) {
        return new WP_Error( 'not_configured', 'Configura el token de Envia.com en Ajustes → Nakama Envia', array( 'status' => 503 ) );
    }

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

    // Normalizar: el frontend lee data[0].status/description/checkpoint. La API
    // de Envia envuelve las guías en su propio {meta, data:[...]}; sin este
    // desempaquetado el cliente recibía {data:{meta,data}} y data[0] era undefined.
    $guides = array();
    if ( is_array( $data ) ) {
        if ( isset( $data['data'] ) && is_array( $data['data'] ) ) {
            $guides = $data['data'];
        } elseif ( isset( $data[0] ) ) {
            $guides = $data;
        }
    }

    $normalized = array();
    foreach ( $guides as $guide ) {
        if ( ! is_array( $guide ) ) {
            continue;
        }
        // Último evento del historial (nombres de campo varían por paquetería).
        $events = array();
        foreach ( array( 'events', 'eventHistory', 'history', 'checkpoints' ) as $events_key ) {
            if ( ! empty( $guide[ $events_key ] ) && is_array( $guide[ $events_key ] ) ) {
                $events = array_values( $guide[ $events_key ] );
                break;
            }
        }
        $last_event = ! empty( $events ) ? end( $events ) : array();
        if ( ! is_array( $last_event ) ) {
            $last_event = array();
        }

        $pick = function ( $sources, $keys ) {
            foreach ( $sources as $src ) {
                foreach ( $keys as $key ) {
                    if ( ! empty( $src[ $key ] ) && is_scalar( $src[ $key ] ) ) {
                        return (string) $src[ $key ];
                    }
                }
            }
            return '';
        };

        $status      = $pick( array( $guide, $last_event ), array( 'status', 'statusDescription', 'statusDetail', 'description' ) );
        $description = $pick( array( $guide, $last_event ), array( 'statusDetail', 'description', 'statusDescription', 'status' ) );
        $location    = $pick( array( $last_event, $guide ), array( 'location', 'city', 'place', 'office' ) );
        $event_date  = $pick( array( $last_event, $guide ), array( 'date', 'occurredAt', 'created_at', 'createdAt', 'eventDate' ) );
        $checkpoint  = trim( $location . ( $event_date ? ' — ' . $event_date : '' ), ' —' );

        $normalized[] = array_merge( $guide, array(
            'status'      => $status ? $status : 'En tránsito',
            'description' => $description,
            'checkpoint'  => $checkpoint,
        ) );
    }

    $response_obj = rest_ensure_response( array(
        'success' => true,
        'data'    => $normalized,
        // Respuesta cruda de Envia por si el frontend necesita más detalle.
        'raw'     => $data,
    ) );

    // Habilitar CORS para permitir consultas desde el entorno local o cualquier origen
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    $response_obj->header( 'Access-Control-Allow-Methods', 'GET' );

    return nakama_envia_no_cache( $response_obj );
}

// 4.5 LÍNEA DE TIEMPO DE RASTREO (17TRACK v2.4, fallback a Envia)
// Devuelve el historial completo de eventos para pintar el seguimiento gráfico
// en Mi Cuenta. Consultar 17TRACK no consume cuota (solo el registro inicial
// de cada guía) y la respuesta se cachea en un transient para respetar el
// límite de 3 req/s y hacer gratis el auto-refresh del frontend.
function nakama_get_track_timeline( WP_REST_Request $request ) {
    $tracking = trim( (string) $request->get_param( 'tracking' ) );
    $carrier  = trim( (string) $request->get_param( 'carrier' ) );
    // debug=1: salta el caché y agrega las respuestas crudas de 17TRACK al
    // JSON (no expone el token; solo datos de rastreo). Para diagnóstico.
    $debug = '1' === (string) $request->get_param( 'debug' );

    if ( '' === $tracking ) {
        return new WP_Error( 'missing_params', 'tracking es requerido', array( 'status' => 400 ) );
    }

    $cache_key = 'nakama_17t_' . md5( $tracking . '|' . strtolower( $carrier ) );
    if ( ! $debug ) {
        $cached = get_transient( $cache_key );
        if ( is_array( $cached ) ) {
            return nakama_track_timeline_respond( $cached );
        }
    }

    $trace  = array();
    $result = nakama_17track_timeline_payload( $tracking, $carrier, $trace );

    // Fallback: sin token, error de 17TRACK o guía irreconocible → Envia
    // (un solo evento, pero la tarjeta nunca queda vacía).
    if ( null === $result && '' !== $carrier ) {
        $result = nakama_envia_timeline_fallback( $request, $tracking, $carrier );
    }

    if ( null === $result ) {
        $result = array(
            'success'        => false,
            'source'         => 'none',
            'number'         => $tracking,
            'carrier_name'   => $carrier,
            'status'         => 'NotFound',
            'sub_status'     => '',
            'status_es'      => 'En espera de recolección',
            'delivered_time' => null,
            'events'         => array(),
        );
    }

    if ( $debug ) {
        $result['debug'] = $trace;
        return nakama_track_timeline_respond( $result );
    }

    // Con eventos (guía ya en movimiento): 30 min. Sin eventos todavía
    // (NotFound / esperando primer escaneo): 10 min, para que el primer
    // movimiento aparezca pronto sin martillar la API.
    $has_events = ! empty( $result['events'] );
    set_transient( $cache_key, $result, ( $has_events ? 30 : 10 ) * MINUTE_IN_SECONDS );

    return nakama_track_timeline_respond( $result );
}

/** Respuesta REST con CORS y no-cache (mismo patrón que track-shipment). */
function nakama_track_timeline_respond( $payload ) {
    $response_obj = rest_ensure_response( $payload );
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    $response_obj->header( 'Access-Control-Allow-Methods', 'GET' );
    return nakama_envia_no_cache( $response_obj );
}

/**
 * Consulta 17TRACK y normaliza. Devuelve null si no hay token o la API falla
 * (para que el caller caiga a Envia). Si la guía no estaba registrada, la
 * registra (1 de cuota) y reintenta una vez.
 */
function nakama_17track_timeline_payload( $tracking, $carrier, &$trace = array() ) {
    if ( empty( nakama_17track_token() ) ) {
        return null;
    }

    // gettrackinfo SIEMPRE solo con el número: si se manda un carrier distinto
    // al que quedó registrado (p.ej. auto-detectado), 17TRACK rechaza la
    // consulta aunque la guía exista.
    $query_item = array( 'number' => $tracking );

    $data = nakama_17track_request( 'gettrackinfo', array( $query_item ) );
    $trace['gettrackinfo'] = is_wp_error( $data ) ? $data->get_error_message() : $data;
    if ( is_wp_error( $data ) ) {
        return null;
    }

    $accepted = isset( $data['data']['accepted'] ) && is_array( $data['data']['accepted'] ) ? $data['data']['accepted'] : array();

    if ( empty( $accepted ) ) {
        // Guía no registrada todavía: registrar y reintentar UNA vez.
        $reg = nakama_17track_register( $tracking, $carrier );
        $trace['register'] = is_wp_error( $reg ) ? $reg->get_error_message() : $reg;
        if ( is_wp_error( $reg ) ) {
            return null;
        }

        // Inspeccionar el resultado del registro: antes un fallo real (carrier
        // no detectado, cuota agotada) pasaba desapercibido y quedaba como
        // "esperando datos" para siempre.
        $reg_ok   = ! empty( $reg['data']['accepted'] );
        $rej_code = isset( $reg['data']['rejected'][0]['error']['code'] ) ? (int) $reg['data']['rejected'][0]['error']['code'] : 0;
        $rej_msg  = isset( $reg['data']['rejected'][0]['error']['message'] ) ? (string) $reg['data']['rejected'][0]['error']['message'] : '';
        $already  = ( -18019901 === $rej_code ); // "already registered": inofensivo

        if ( ! $reg_ok && ! $already ) {
            // Registro rechazado de verdad → dejar que el caller caiga a Envia,
            // con el motivo visible en debug.
            $trace['register_error'] = $rej_msg ? $rej_msg : 'Registro rechazado por 17TRACK';
            return null;
        }

        $data = nakama_17track_request( 'gettrackinfo', array( $query_item ) );
        $trace['gettrackinfo_retry'] = is_wp_error( $data ) ? $data->get_error_message() : $data;
        if ( is_wp_error( $data ) ) {
            return null;
        }
        $accepted = isset( $data['data']['accepted'] ) && is_array( $data['data']['accepted'] ) ? $data['data']['accepted'] : array();

        if ( empty( $accepted ) ) {
            // Registrada pero 17TRACK aún no junta datos (los primeros
            // resultados pueden tardar minutos). El transient corto del
            // caller hace que se reintente pronto.
            return array(
                'success'        => false,
                'source'         => '17track',
                'number'         => $tracking,
                'carrier_name'   => '',
                // NotFound: la guía existe (creada en Envia) pero la paquetería
                // aún no la escanea → primer paso del stepper "Guía generada".
                'status'         => 'NotFound',
                'sub_status'     => '',
                'status_es'      => 'Guía generada, en espera de recolección',
                'delivered_time' => null,
                'events'         => array(),
            );
        }
    }

    return nakama_17track_normalize( $accepted[0], $tracking, $carrier );
}

/**
 * Normaliza la respuesta de gettrackinfo a la forma que consume el frontend.
 * Tolerante a variantes de la estructura (providers bajo track_info.tracking
 * o directo bajo track_info; nombres de campo de tiempo/descripcion varían).
 */
function nakama_17track_normalize( $info, $tracking, $carrier ) {
    $ti = isset( $info['track_info'] ) && is_array( $info['track_info'] ) ? $info['track_info'] : array();

    $latest     = isset( $ti['latest_status'] ) && is_array( $ti['latest_status'] ) ? $ti['latest_status'] : array();
    $status     = isset( $latest['status'] ) && is_string( $latest['status'] ) ? $latest['status'] : 'NotFound';
    $sub_status = isset( $latest['sub_status'] ) && is_string( $latest['sub_status'] ) ? $latest['sub_status'] : '';

    // providers: v2.x los anida en track_info.tracking.providers.
    $providers = array();
    if ( isset( $ti['tracking']['providers'] ) && is_array( $ti['tracking']['providers'] ) ) {
        $providers = $ti['tracking']['providers'];
    } elseif ( isset( $ti['providers'] ) && is_array( $ti['providers'] ) ) {
        $providers = $ti['providers'];
    }

    $pick = function ( $src, $keys ) {
        foreach ( $keys as $key ) {
            if ( isset( $src[ $key ] ) && is_scalar( $src[ $key ] ) && '' !== (string) $src[ $key ] ) {
                return (string) $src[ $key ];
            }
        }
        return '';
    };

    $carrier_name = '';
    $events_out   = array();

    foreach ( $providers as $provider ) {
        if ( ! is_array( $provider ) ) {
            continue;
        }
        if ( '' === $carrier_name ) {
            if ( isset( $provider['provider']['name'] ) && is_string( $provider['provider']['name'] ) ) {
                $carrier_name = $provider['provider']['name'];
            } elseif ( isset( $provider['carrier_name'] ) && is_string( $provider['carrier_name'] ) ) {
                $carrier_name = $provider['carrier_name'];
            }
        }
        $events = isset( $provider['events'] ) && is_array( $provider['events'] ) ? $provider['events'] : array();
        foreach ( $events as $event ) {
            if ( ! is_array( $event ) ) {
                continue;
            }
            $location = $pick( $event, array( 'location' ) );
            if ( '' === $location && isset( $event['address'] ) && is_array( $event['address'] ) ) {
                $location = implode( ', ', array_filter( array(
                    $pick( $event['address'], array( 'city' ) ),
                    $pick( $event['address'], array( 'state' ) ),
                    $pick( $event['address'], array( 'country' ) ),
                ) ) );
            }
            $events_out[] = array(
                'time'        => $pick( $event, array( 'time_iso', 'time_utc', 'time_raw', 'time' ) ),
                'status'      => $pick( $event, array( 'stage', 'sub_status', 'status' ) ),
                'description' => $pick( $event, array( 'description_translation', 'description' ) ),
                'location'    => $location,
            );
        }
    }

    // Más reciente primero (usort es estable en PHP 8; sin fecha → al final).
    usort( $events_out, function ( $a, $b ) {
        $ta = $a['time'] ? strtotime( $a['time'] ) : 0;
        $tb = $b['time'] ? strtotime( $b['time'] ) : 0;
        return $tb <=> $ta;
    } );

    $delivered_time = null;
    if ( 'Delivered' === $status && ! empty( $events_out ) ) {
        $delivered_time = $events_out[0]['time'];
    }

    return array(
        'success'        => true,
        'source'         => '17track',
        'number'         => $tracking,
        'carrier_name'   => $carrier_name ? $carrier_name : $carrier,
        'status'         => $status,
        'sub_status'     => $sub_status,
        'status_es'      => nakama_17track_status_es( $status ),
        'delivered_time' => $delivered_time,
        'events'         => $events_out,
    );
}

/**
 * Fallback: reutiliza el proxy de Envia existente y adapta su único estado a
 * la forma de la línea de tiempo (un solo evento). Mapea el texto libre de
 * Envia al enum de 17TRACK para que el stepper del frontend tenga un solo camino.
 */
function nakama_envia_timeline_fallback( WP_REST_Request $request, $tracking, $carrier ) {
    $resp = nakama_get_tracking_data( $request );
    if ( is_wp_error( $resp ) ) {
        return null;
    }
    $payload = $resp->get_data();
    $first   = isset( $payload['data'][0] ) && is_array( $payload['data'][0] ) ? $payload['data'][0] : null;
    if ( ! $first ) {
        return null;
    }

    $status_text = isset( $first['status'] ) ? (string) $first['status'] : '';
    $lower       = strtolower( $status_text );
    if ( false !== strpos( $lower, 'entregado' ) || false !== strpos( $lower, 'delivered' ) ) {
        $status = 'Delivered';
    } elseif ( false !== strpos( $lower, 'reparto' ) || false !== strpos( $lower, 'out for delivery' ) ) {
        $status = 'OutForDelivery';
    } else {
        $status = 'InTransit';
    }

    $event = array(
        'time'        => '',
        'status'      => $status,
        'description' => ! empty( $first['description'] ) ? (string) $first['description'] : $status_text,
        'location'    => ! empty( $first['checkpoint'] ) ? (string) $first['checkpoint'] : '',
    );
    $events = ( '' !== $event['description'] || '' !== $event['location'] ) ? array( $event ) : array();

    return array(
        'success'        => true,
        'source'         => 'envia',
        'number'         => $tracking,
        'carrier_name'   => $carrier,
        'status'         => $status,
        'sub_status'     => '',
        'status_es'      => $status_text ? $status_text : nakama_17track_status_es( $status ),
        'delivered_time' => null,
        'events'         => $events,
    );
}

// 5. GUARDA DE ORIGEN (anti-abuso) PARA EL PROXY DE COTIZACIÓN
// No es autenticación completa: solo bloquea peticiones de navegador cross-origin
// (que siempre envían Origin/Referer) de terceros que intenten gastar el ENVIA_API_TOKEN.
// Peticiones servidor-a-servidor (curl, sin Origin/Referer) se permiten. Espeja isAllowedOrigin() de route.ts.
function nakama_shipping_is_allowed_origin( WP_REST_Request $request ) {
    $origin = $request->get_header( 'origin' );
    if ( ! $origin ) {
        $origin = $request->get_header( 'referer' );
    }

    // Sin Origin/Referer (servidor-a-servidor / curl): permitir para no romper usos existentes.
    if ( ! $origin ) {
        return true;
    }

    $origin_host = wp_parse_url( $origin, PHP_URL_HOST );
    if ( ! $origin_host ) {
        return false; // Origin malformado: rechazar por seguridad.
    }

    // Permitir el propio sitio de WordPress.
    $site_host = wp_parse_url( home_url(), PHP_URL_HOST );
    if ( $site_host && $origin_host === $site_host ) {
        return true;
    }

    // Permitir dominio público del frontend configurable via variable de entorno u opción.
    $frontend_url = getenv( 'NEXT_PUBLIC_SITE_URL' ) ?: get_option( 'nakama_frontend_url', 'https://nakamabordados.com' );
    $frontend_host = $frontend_url ? wp_parse_url( $frontend_url, PHP_URL_HOST ) : null;
    if ( $frontend_host && $origin_host === $frontend_host ) {
        return true;
    }

    // Permitir desarrollo local.
    if ( strpos( $origin_host, 'localhost' ) === 0 || strpos( $origin_host, '127.0.0.1' ) === 0 ) {
        return true;
    }

    return false;
}

// 6. HANDLER DEL PROXY DE COTIZACIÓN (Consulta rates a Envia.com ocultando el Token)
// Reemplaza src/app/api/shipping/route.ts. Espera { postcode, state, city, cart } en el body JSON.
function nakama_get_shipping_rates( WP_REST_Request $request ) {
    // Responder al preflight CORS del navegador antes de procesar nada.
    if ( 'OPTIONS' === $request->get_method() ) {
        $preflight = rest_ensure_response( null );
        $preflight->header( 'Access-Control-Allow-Origin', '*' );
        $preflight->header( 'Access-Control-Allow-Methods', 'POST, OPTIONS' );
        $preflight->header( 'Access-Control-Allow-Headers', 'Content-Type, Authorization' );
        return $preflight;
    }

    // Guarda de origen anti-abuso (protege el gasto del token).
    if ( ! nakama_shipping_is_allowed_origin( $request ) ) {
        return new WP_Error( 'forbidden', 'Forbidden', array( 'status' => 403 ) );
    }

    $body = $request->get_json_params();

    // Esperamos { postcode, state, city, cart }
    if ( empty( $body['postcode'] ) || empty( $body['cart'] ) || ! is_array( $body['cart'] ) ) {
        return new WP_Error( 'missing_params', 'Missing required parameters', array( 'status' => 400 ) );
    }

    // El token debe configurarse via variable de entorno u opcion de WordPress. NUNCA hardcodear.
    $envia_api_token = getenv( 'ENVIA_API_TOKEN' ) ?: get_option( 'nakama_envia_api_token', '' );
    if ( empty( $envia_api_token ) ) {
        return new WP_Error( 'server_config', 'Server configuration error', array( 'status' => 500 ) );
    }

    // Sanitizar entradas del cliente.
    $postcode = sanitize_text_field( $body['postcode'] );
    $state    = ! empty( $body['state'] ) ? sanitize_text_field( $body['state'] ) : 'SO';
    $city     = ! empty( $body['city'] ) ? sanitize_text_field( $body['city'] ) : 'Hermosillo';

    // Calcular peso total basado en la cantidad (asumiendo 1kg por artículo).
    $total_items = 0;
    foreach ( $body['cart'] as $item ) {
        $qty = ( is_array( $item ) && isset( $item['quantity'] ) ) ? intval( $item['quantity'] ) : 1;
        $total_items += $qty > 0 ? $qty : 1;
    }
    if ( $total_items < 1 ) {
        $total_items = 1;
    }

    // Plantilla del payload de Envia.com (misma que route.ts).
    $payload_template = array(
        'origin' => array(
            'name'       => 'Nakama',
            'company'    => 'Nakama Bordados',
            'email'      => 'info@nakamabordados.com',
            'phone'      => '8180000000',
            'street'     => 'Bujalance Oriente',
            'number'     => '7',
            'district'   => 'Puerta Real Residencial VII',
            'city'       => 'Hermosillo',
            'state'      => 'SO',
            'country'    => 'MX',
            'postalCode' => '83177',
            'reference'  => '',
        ),
        'destination' => array(
            'name'       => 'Cliente',
            'company'    => '',
            'email'      => 'cliente@example.com',
            'phone'      => '8180000000',
            'street'     => 'Calle',
            'number'     => '1',
            'district'   => $city,
            'city'       => $city,
            'state'      => $state,
            'country'    => 'MX',
            'postalCode' => $postcode,
            'reference'  => '',
        ),
        'packages' => array(
            array(
                'content'       => 'Ropa',
                'amount'        => 1,
                'type'          => 'box',
                'dimensions'    => array(
                    'length' => 30,
                    'width'  => 25,
                    'height' => 5,
                ),
                'weight'        => $total_items, // 1 kg por artículo (total artículos * 1kg)
                'insurance'     => 0,
                'declaredValue' => 0,
                'weightUnit'    => 'KG',
                'lengthUnit'    => 'CM',
            ),
        ),
        'settings' => array(
            'printFormat' => 'PDF',
            'printSize'   => 'STOCK_4X6',
            'comments'    => '',
        ),
    );

    // Debemos consultar cada paquetería individualmente (la API de Envia lo requiere en el objeto shipment).
    $carriers = array( 'fedex', 'estafeta', 'dhl', 'redpack' );

    $formatted_rates = array();

    foreach ( $carriers as $carrier ) {
        $payload = $payload_template;
        $payload['shipment'] = array(
            'carrier' => $carrier,
            'type'    => 1,
        );

        $args = array(
            'body'    => wp_json_encode( $payload ),
            'timeout' => 20,
            'headers' => array(
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $envia_api_token,
            ),
        );

        $response = wp_remote_post( 'https://api.envia.com/ship/rate/', $args );

        if ( is_wp_error( $response ) ) {
            continue; // Ignorar esta paquetería si falla la petición.
        }
        if ( 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
            continue;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( is_array( $data ) && isset( $data['meta'] ) && 'rate' === $data['meta'] && ! empty( $data['data'] ) && is_array( $data['data'] ) ) {
            foreach ( $data['data'] as $rate ) {
                if ( ! is_array( $rate ) ) {
                    continue;
                }
                $rate_carrier         = isset( $rate['carrier'] ) ? $rate['carrier'] : $carrier;
                $service_id           = isset( $rate['serviceId'] ) ? $rate['serviceId'] : '';
                $carrier_description  = isset( $rate['carrierDescription'] ) ? $rate['carrierDescription'] : '';
                $service_description  = isset( $rate['serviceDescription'] ) ? $rate['serviceDescription'] : '';
                $delivery_estimate    = isset( $rate['deliveryEstimate'] ) ? $rate['deliveryEstimate'] : '';
                $total_price          = isset( $rate['totalPrice'] ) ? $rate['totalPrice'] : 0;

                $formatted_rates[] = array(
                    'id'        => 'envia_' . $rate_carrier . '_' . $service_id,
                    'method_id' => 'envia_shipping',
                    'label'     => $carrier_description . ' - ' . $service_description . ' (' . $delivery_estimate . ')',
                    'cost'      => (string) $total_price,
                );
            }
        }
    }

    // Envolver en estructura de paquete como lo hace WooCommerce (igual que route.ts).
    $response_data = array(
        array(
            'package' => 0,
            'rates'   => $formatted_rates,
        ),
    );

    $response_obj = rest_ensure_response( $response_data );

    // Habilitar CORS igual que el endpoint de rastreo.
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    $response_obj->header( 'Access-Control-Allow-Methods', 'POST, OPTIONS' );
    $response_obj->header( 'Access-Control-Allow-Headers', 'Content-Type, Authorization' );

    return nakama_envia_no_cache( $response_obj );
}

// 7. PANTALLA DE AJUSTES (Ajustes → Nakama Envia)
// Sin esta pantalla el plugin no era funcional en cPanel: getenv() no está
// disponible y no existía ninguna forma de guardar nakama_envia_api_token.
add_action( 'admin_menu', function () {
    add_options_page(
        'Nakama Envia',
        'Nakama Envia',
        'manage_options',
        'nakama-envia',
        'nakama_envia_render_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'nakama_envia_settings', 'nakama_envia_api_token', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ) );
    register_setting( 'nakama_envia_settings', 'nakama_envia_webhook_secret', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ) );
    register_setting( 'nakama_envia_settings', 'nakama_17track_token', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ) );
} );

// Acceso rápido desde la lista de plugins.
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
    array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=nakama-envia' ) ) . '">Ajustes</a>' );
    return $links;
} );

function nakama_envia_render_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $token          = get_option( 'nakama_envia_api_token', '' );
    $secret         = get_option( 'nakama_envia_webhook_secret', '' );
    $token_17track  = get_option( 'nakama_17track_token', '' );

    // URL que se registra en el panel de Envia.com (Configuración → Webhooks).
    // Se usa ?rest_route= porque el .htaccess del sitio le aplica no-cache.
    $webhook_url = home_url( '/?rest_route=/nakama/v1/envia-webhook' . ( $secret ? '&secret=' . rawurlencode( $secret ) : '' ) );
    ?>
    <div class="wrap">
        <h1>Nakama Envia.com</h1>

        <?php if ( empty( $token ) ) : ?>
            <div class="notice notice-error"><p><strong>Falta el token del API de Envia.com:</strong> sin él no funcionan el rastreo ni la cotización de paqueterías.</p></div>
        <?php else : ?>
            <div class="notice notice-success"><p>Token del API configurado. Rastreo y cotización de paqueterías operativos.</p></div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields( 'nakama_envia_settings' ); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="nakama_envia_api_token">Token del API</label></th>
                    <td>
                        <input type="password" id="nakama_envia_api_token" name="nakama_envia_api_token"
                               value="<?php echo esc_attr( $token ); ?>" class="regular-text" autocomplete="off" />
                        <p class="description">Se genera en envia.com → Configuración → API. Usa un token nuevo (el anterior quedó expuesto y debe revocarse).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="nakama_envia_webhook_secret">Secreto del webhook</label></th>
                    <td>
                        <input type="text" id="nakama_envia_webhook_secret" name="nakama_envia_webhook_secret"
                               value="<?php echo esc_attr( $secret ); ?>" class="regular-text" autocomplete="off" />
                        <p class="description">Cualquier cadena larga y aleatoria. Protege el webhook para que solo Envia.com pueda registrar guías.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="nakama_17track_token">API Key de 17TRACK</label></th>
                    <td>
                        <input type="password" id="nakama_17track_token" name="nakama_17track_token"
                               value="<?php echo esc_attr( $token_17track ); ?>" class="regular-text" autocomplete="off" />
                        <p class="description">Security Key de api.17track.net → Settings. Habilita la línea de tiempo completa del rastreo en Mi Cuenta (cada guía nueva consume 1 de la cuota de 17TRACK al registrarse; consultarla es gratis). Sin este token, el rastreo cae al estado simple de Envia.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">URL del webhook</th>
                    <td>
                        <code style="user-select: all; word-break: break-all;"><?php echo esc_html( $webhook_url ); ?></code>
                        <p class="description">Regístrala en envia.com → Configuración → Webhooks (evento de creación de guía / tracking). Al recibirla, el pedido de WooCommerce guarda la guía y el cliente la ve en Mi Cuenta → Rastreo.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr />
        <h2>Diagnóstico de guía en pedidos</h2>
        <p class="description">Escribe el ID de un pedido para ver dónde quedó guardada su guía de rastreo. Útil cuando la guía la crea otro plugin de Envia con su propia clave de metadato.</p>
        <form method="get">
            <input type="hidden" name="page" value="nakama-envia" />
            <p>
                <label>ID de pedido:
                    <input type="number" name="debug_order" value="<?php echo isset( $_GET['debug_order'] ) ? absint( $_GET['debug_order'] ) : ''; ?>" class="small-text" />
                </label>
                <button type="submit" class="button">Ver metadatos</button>
            </p>
        </form>
        <?php
        $debug_order_id = isset( $_GET['debug_order'] ) ? absint( $_GET['debug_order'] ) : 0;
        if ( $debug_order_id ) {
            $dbg_order = function_exists( 'wc_get_order' ) ? wc_get_order( $debug_order_id ) : null;
            if ( ! $dbg_order ) {
                echo '<div class="notice notice-error inline"><p>No se encontró el pedido #' . esc_html( $debug_order_id ) . '.</p></div>';
            } else {
                $found = nakama_find_order_tracking( $dbg_order );
                echo '<p><strong>El buscador detecta:</strong> <code>' . esc_html( wp_json_encode( $found ) ) . '</code>';
                echo empty( $found['code'] )
                    ? ' &mdash; <span style="color:#b32d2e;">NO encontró guía. Revisa abajo en qué clave está y avísame para agregarla.</span></p>'
                    : ' &mdash; <span style="color:#1a7f37;">✓ La guía se leerá bien en Mi Cuenta.</span></p>';
                echo '<p><strong>Todos los metadatos del pedido #' . esc_html( $debug_order_id ) . ':</strong></p>';
                echo '<textarea readonly rows="16" style="width:100%;font-family:monospace;font-size:12px;">';
                foreach ( $dbg_order->get_meta_data() as $meta ) {
                    $d   = $meta->get_data();
                    $val = is_scalar( $d['value'] ) ? $d['value'] : wp_json_encode( $d['value'] );
                    echo esc_textarea( $d['key'] . ' = ' . $val . "\n" );
                }
                echo '</textarea>';
            }
        }
        ?>

        <hr />
        <h2>Localizar un número de guía en la base de datos</h2>
        <p class="description">Si la guía no aparece en los metadatos del pedido (algunos plugins la guardan en su propia tabla), pega aquí el número de guía y te dice en qué tabla y columna está.</p>
        <form method="get">
            <input type="hidden" name="page" value="nakama-envia" />
            <p>
                <label>Número de guía:
                    <input type="text" name="find_tracking" value="<?php echo isset( $_GET['find_tracking'] ) ? esc_attr( sanitize_text_field( wp_unslash( $_GET['find_tracking'] ) ) ) : ''; ?>" class="regular-text" />
                </label>
                <button type="submit" class="button">Localizar</button>
            </p>
        </form>
        <?php
        $find_tracking = isset( $_GET['find_tracking'] ) ? sanitize_text_field( wp_unslash( $_GET['find_tracking'] ) ) : '';
        if ( '' !== $find_tracking ) {
            global $wpdb;
            $like = '%' . $wpdb->esc_like( $find_tracking ) . '%';
            $hits = array();

            // wp_postmeta (pedidos legacy y CPT).
            $rows = $wpdb->get_results( $wpdb->prepare(
                "SELECT post_id AS id, meta_key FROM {$wpdb->postmeta} WHERE meta_value LIKE %s LIMIT 50", $like
            ) );
            foreach ( (array) $rows as $r ) {
                $hits[] = "wp_postmeta  →  post_id={$r->id}, meta_key={$r->meta_key}";
            }

            // Tabla de metadatos de pedidos con HPOS.
            $hpos = $wpdb->prefix . 'wc_orders_meta';
            if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $hpos ) ) === $hpos ) {
                $rows = $wpdb->get_results( $wpdb->prepare(
                    "SELECT order_id AS id, meta_key FROM {$hpos} WHERE meta_value LIKE %s LIMIT 50", $like
                ) );
                foreach ( (array) $rows as $r ) {
                    $hits[] = "wc_orders_meta  →  order_id={$r->id}, meta_key={$r->meta_key}";
                }
            }

            echo '<p><strong>Coincidencias en metadatos:</strong></p>';
            if ( empty( $hits ) ) {
                echo '<p style="color:#b32d2e;">No está en wp_postmeta ni en wc_orders_meta. Ver la búsqueda profunda de abajo.</p>';
            } else {
                echo '<textarea readonly rows="' . min( 12, count( $hits ) + 1 ) . '" style="width:100%;font-family:monospace;font-size:12px;">';
                echo esc_textarea( implode( "\n", $hits ) );
                echo '</textarea>';
            }

            // Búsqueda PROFUNDA: recorre TODAS las tablas y todas sus columnas de
            // texto. Encuentra la guía aunque el plugin la guarde en una tabla
            // propia con cualquier nombre. Los nombres de tabla/columna vienen
            // del propio esquema (confiables); el valor va escapado.
            $deep      = array();
            $val       = esc_sql( $wpdb->esc_like( $find_tracking ) );
            $like_expr = "'%{$val}%'";
            foreach ( (array) $wpdb->get_col( 'SHOW TABLES' ) as $table ) {
                $cols = $wpdb->get_col( $wpdb->prepare(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND DATA_TYPE IN ('char','varchar','tinytext','text','mediumtext','longtext')",
                    DB_NAME, $table
                ) );
                if ( empty( $cols ) ) {
                    continue;
                }
                $where  = array();
                $select = array();
                foreach ( $cols as $col ) {
                    $where[]  = "`{$col}` LIKE {$like_expr}";
                    $select[] = "`{$col}`";
                }
                $sql  = 'SELECT ' . implode( ',', $select ) . " FROM `{$table}` WHERE " . implode( ' OR ', $where ) . ' LIMIT 3';
                $rows = $wpdb->get_results( $sql, ARRAY_A );
                if ( empty( $rows ) ) {
                    continue;
                }
                foreach ( $rows as $row ) {
                    foreach ( $row as $col => $cellval ) {
                        if ( is_string( $cellval ) && false !== stripos( $cellval, $find_tracking ) ) {
                            $snippet = trim( preg_replace( '/\s+/', ' ', substr( $cellval, 0, 300 ) ) );
                            $deep[]  = $table . ' . ' . $col . "\n    " . $snippet;
                        }
                    }
                }
            }

            echo '<p><strong>Búsqueda profunda (todas las tablas):</strong></p>';
            if ( empty( $deep ) ) {
                echo '<p style="color:#b32d2e;">No se encontró el número en NINGUNA tabla. El plugin de Envia probablemente lo obtiene en vivo de su API y solo guarda un ID interno del envío. Busca ese ID (por ejemplo aHQadzFqJdFh2wkfuC) en este mismo localizador.</p>';
            } else {
                echo '<textarea readonly rows="' . min( 24, count( $deep ) + 2 ) . '" style="width:100%;font-family:monospace;font-size:12px;">';
                echo esc_textarea( implode( "\n\n", $deep ) );
                echo '</textarea>';
            }
        }
        ?>
    </div>
    <?php
}
