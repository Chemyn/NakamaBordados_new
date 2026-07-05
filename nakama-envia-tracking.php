<?php
/**
 * Plugin Name: Nakama Envia.com Tracking Integration
 * Description: Sistema completo de rastreo: Webhook de Envia, Proxy de consulta segura, exposición en WPGraphQL y pantalla de ajustes (token/secret).
 * Version: 1.2
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
 * Evita que LiteSpeed cachee las respuestas del API (servía estados de
 * rastreo viejos e incluso 404 previos a instalar el plugin).
 */
function nakama_envia_no_cache( $response ) {
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    return $response;
}

// 1. EXPONER CAMPOS EN WPGRAPHQL
add_action( 'graphql_register_types', function() {
    register_graphql_field( 'Order', 'enviaTrackingCode', [
        'type' => 'String',
        'description' => 'Código de rastreo de Envia.com',
        'resolve' => function( $order ) {
            $tracking_code = nakama_envia_order_meta( $order->databaseId, '_envia_tracking_code' );
            return ! empty( $tracking_code ) ? $tracking_code : null;
        }
    ]);

    register_graphql_field( 'Order', 'enviaCarrier', [
        'type' => 'String',
        'description' => 'Paquetería asignada por Envia.com',
        'resolve' => function( $order ) {
            $carrier = nakama_envia_order_meta( $order->databaseId, '_envia_carrier' );
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

    $token  = get_option( 'nakama_envia_api_token', '' );
    $secret = get_option( 'nakama_envia_webhook_secret', '' );

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
                    <th scope="row">URL del webhook</th>
                    <td>
                        <code style="user-select: all; word-break: break-all;"><?php echo esc_html( $webhook_url ); ?></code>
                        <p class="description">Regístrala en envia.com → Configuración → Webhooks (evento de creación de guía / tracking). Al recibirla, el pedido de WooCommerce guarda la guía y el cliente la ve en Mi Cuenta → Rastreo.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
