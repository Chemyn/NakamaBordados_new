<?php
/**
 * Plugin Name: Nakama Checkout Tools
 * Description: Endpoints REST para validación de cupones, moneda, SSO, social login, pedidos de cotización, registro de clientes y sincronización de base de datos local (Next.js).
 * Version: 2.9
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Duración de la sesión: el plugin "WPGraphQL JWT Authentication" (el que
// emite el authToken que usa el frontend, ver nakama_sso_set_cookie abajo)
// expira el token a los 300 segundos (5 minutos) por defecto vía este
// filtro. Se extiende a 2 horas para que el cliente no tenga que
// reloguearse a cada rato en Mi Cuenta/checkout. Solo aplica a tokens
// emitidos DESPUÉS de activar este cambio; las sesiones ya iniciadas
// conservan la expiración con la que se emitieron.
add_filter( 'graphql_jwt_auth_expire', function ( $expiration ) {
    return 2 * HOUR_IN_SECONDS;
} );

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

    // PDF de cotización: el cotizador sube aquí (multipart) el PDF generado en el
    // navegador para dejarlo guardado en el servidor y vinculado al pedido de
    // cotización (folio NK-xxxx). El pedido pagado lo hereda y el panel de
    // Producción lo muestra. Público como /quote-order (mismo momento del flujo);
    // se acota con escritura única, estado on-hold y ventana temporal (ver abajo).
    register_rest_route( 'nakama/v1', '/quote-pdf', array(
        'methods' => 'POST',
        'callback' => 'nakama_quote_pdf_upload',
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

    // Registro de clientes: crea una cuenta de cliente de WooCommerce desde el
    // frontend estático (Next.js export). El sitio headless no expone el
    // registro nativo de WooCommerce, así que este endpoint lo suple creando
    // un cliente real (rol 'customer', correo de bienvenida). El frontend
    // inicia sesión enseguida con las mismas credenciales para obtener el JWT.
    register_rest_route( 'nakama/v1', '/register', array(
        'methods' => 'POST',
        'callback' => 'nakama_register_customer',
        'permission_callback' => '__return_true'
    ) );
});

/**
 * Alta de cliente de WooCommerce. Devuelve { success, username, email } o un
 * WP_Error con status 4xx/5xx. No requiere activar "Cualquiera puede
 * registrarse" en WP: wc_create_new_customer crea la cuenta de forma
 * programática con el rol 'customer'.
 */
function nakama_register_customer( WP_REST_Request $request ) {
    if ( ! function_exists( 'wc_create_new_customer' ) ) {
        return new WP_Error( 'no_wc', 'WooCommerce no está activo', array( 'status' => 500 ) );
    }

    $params   = $request->get_json_params();
    $email    = sanitize_email( $params['email'] ?? '' );
    $password = (string) ( $params['password'] ?? '' );
    $first    = sanitize_text_field( $params['firstName'] ?? '' );
    $last     = sanitize_text_field( $params['lastName'] ?? '' );
    $phone    = sanitize_text_field( $params['phone'] ?? '' );

    if ( ! is_email( $email ) ) {
        return new WP_Error( 'bad_email', 'Correo electrónico inválido', array( 'status' => 400 ) );
    }
    if ( email_exists( $email ) ) {
        // 409: el frontend lo traduce a "ya existe una cuenta con este correo".
        return new WP_Error( 'email_exists', 'Ya existe una cuenta con este correo', array( 'status' => 409 ) );
    }
    if ( strlen( $password ) < 6 ) {
        return new WP_Error( 'weak_password', 'La contraseña debe tener al menos 6 caracteres', array( 'status' => 400 ) );
    }

    // Username vacío => WooCommerce lo genera a partir del correo.
    $user_id = wc_create_new_customer( $email, '', $password, array(
        'first_name' => $first,
        'last_name'  => $last,
    ) );

    if ( is_wp_error( $user_id ) ) {
        return new WP_Error(
            'register_failed',
            $user_id->get_error_message(),
            array( 'status' => 400 )
        );
    }

    // Meta de facturación para que el prellenado del cotizador y Mi Cuenta
    // tengan datos desde el primer inicio de sesión.
    if ( $first ) { update_user_meta( $user_id, 'billing_first_name', $first ); }
    if ( $last )  { update_user_meta( $user_id, 'billing_last_name', $last ); }
    if ( $phone ) { update_user_meta( $user_id, 'billing_phone', $phone ); }
    update_user_meta( $user_id, 'billing_email', $email );

    $user = get_user_by( 'id', $user_id );

    $response = rest_ensure_response( array(
        'success'  => true,
        'username' => $user ? $user->user_login : '',
        'email'    => $email,
    ) );
    $response->header( 'Access-Control-Allow-Origin', '*' );
    $response->header( 'X-LiteSpeed-Cache-Control', 'no-cache' );
    $response->header( 'Cache-Control', 'no-store' );
    return $response;
}

/**
 * Ruta interna segura o cadena vacía.
 *
 * Los destinos del login social llegan por la URL, así que sin esto cualquiera
 * podría usar el sitio como trampolín hacia otro dominio (open redirect). Se
 * aceptan solo rutas relativas: '/algo', nunca '//host' ni 'https://…'.
 */
function nakama_safe_internal_path( $path ) {
    $path = is_string( $path ) ? $path : '';
    return preg_match( '#^/(?!/)[A-Za-z0-9\-_./?=&%]*$#', $path ) ? $path : '';
}

/**
 * Datos del proveedor social durante un alta cancelada.
 *
 * Nextend pregunta primero si puede registrar y solo después a dónde mandar al
 * usuario, en dos filtros distintos y sin pasar los datos al segundo. Este
 * estático los traslada de uno a otro; ambos corren en la misma petición.
 */
function nakama_social_signup_data( $set = null ) {
    static $data = array( 'email' => '', 'first_name' => '', 'last_name' => '' );
    if ( is_array( $set ) ) {
        $data = wp_parse_args( $set, $data );
    }
    return $data;
}

/**
 * Un correo sin cuenta no se registra solo: se manda a completar el registro.
 *
 * Nextend consulta este filtro únicamente cuando el correo del proveedor no
 * corresponde a ningún usuario (en un correo ya conocido vincula la cuenta y
 * ni pasa por aquí), así que llegar hasta este punto ya significa "cliente
 * nuevo". Devolver false cancela el alta automática y hace que Nextend pida el
 * destino con el filtro de abajo, donde armamos el formulario prellenado.
 *
 * Prioridad 99 para tener la última palabra sobre el propio filtro de Nextend.
 */
add_filter( 'nsl_is_register_allowed', 'nakama_social_block_auto_register', 99, 2 );
function nakama_social_block_auto_register( $allowed, $provider = null ) {
    $read = static function ( $key ) use ( $provider ) {
        if ( ! is_object( $provider ) || ! method_exists( $provider, 'getAuthUserData' ) ) {
            return '';
        }
        $value = $provider->getAuthUserData( $key );
        return is_string( $value ) ? $value : '';
    };

    // Facebook puede no entregar correo si el usuario no dio ese permiso; en
    // ese caso el formulario sale vacío y lo escribe a mano.
    nakama_social_signup_data( array(
        'email'      => sanitize_email( $read( 'email' ) ),
        'first_name' => sanitize_text_field( $read( 'first_name' ) ),
        'last_name'  => sanitize_text_field( $read( 'last_name' ) ),
    ) );

    return false;
}

// El aviso lo da Mi Cuenta con el diseño del sitio; sin esto Nextend encima
// mostraría el mensaje genérico de WordPress ("User registration is currently
// not allowed"), que aquí sería falso: el registro sí se puede, por formulario.
add_filter( 'nsl_disabled_register_error_message', '__return_false' );

/**
 * A dónde va el cliente nuevo tras cancelar el alta automática.
 *
 * Al formulario de registro de Mi Cuenta con lo que entregó el proveedor ya
 * puesto, para que solo tenga que elegir contraseña. Si venía de otra página
 * (el cotizador, por ejemplo) se conserva para devolverlo ahí al terminar.
 */
add_filter( 'nsl_disabled_register_redirect_url', 'nakama_social_signup_redirect' );
function nakama_social_signup_redirect( $url ) {
    $back = nakama_social_login_back_path();

    // La app móvil abre este flujo dentro de un navegador que solo sabe volver
    // por el esquema nakamaprod://; el formulario web la dejaría atrapada. Se
    // le responde con el error que ya sabe interpretar.
    if ( 0 === strpos( $back, '/app-auth/' ) ) {
        return home_url( '/app-auth/?social_error=1' );
    }

    $data = nakama_social_signup_data();
    $args = array( 'social_signup' => '1' );

    if ( '' !== $data['email'] )      { $args['email'] = $data['email']; }
    if ( '' !== $data['first_name'] ) { $args['first_name'] = $data['first_name']; }
    if ( '' !== $data['last_name'] )  { $args['last_name'] = $data['last_name']; }

    $return = nakama_social_signup_return_path( $back );
    if ( '' !== $return ) {
        $args['return'] = $return;
    }

    // add_query_arg codifica los valores; pasarlos en crudo evita doble escape.
    return add_query_arg( $args, home_url( '/mi-cuenta/' ) );
}

/**
 * El 'back' del bridge guardado por Nextend al iniciar el OAuth.
 *
 * En el callback del proveedor ya no hay parámetros nuestros en la URL, pero
 * Nextend conservó el 'redirect' con el que arrancó (Persistent::set en
 * provider.php) y de ahí se recupera nuestra ruta de retorno.
 */
function nakama_social_login_back_path() {
    if ( ! class_exists( '\NSL\Persistent\Persistent' ) ) {
        return '';
    }

    $redirect = \NSL\Persistent\Persistent::get( 'redirect' );
    if ( ! is_string( $redirect ) || '' === $redirect ) {
        return '';
    }

    $query = wp_parse_url( $redirect, PHP_URL_QUERY );
    if ( ! is_string( $query ) || '' === $query ) {
        return '';
    }

    $params = array();
    parse_str( $query, $params );

    return nakama_safe_internal_path( isset( $params['back'] ) ? (string) $params['back'] : '' );
}

/**
 * Página a la que volver después de registrarse, o cadena vacía.
 *
 * Cuando el intento salió de Mi Cuenta no hay nada que conservar: ahí es donde
 * va a caer. Y si esa vuelta ya traía su propio 'return' (el caso de quien
 * llegó desde el cotizador), se hereda ese en vez de anidar una ruta dentro de
 * otra.
 */
function nakama_social_signup_return_path( $back ) {
    if ( '' === $back ) {
        return '';
    }

    $path = (string) wp_parse_url( $back, PHP_URL_PATH );
    if ( '/mi-cuenta/' !== untrailingslashit( $path ) . '/' ) {
        return $back;
    }

    $query = wp_parse_url( $back, PHP_URL_QUERY );
    if ( ! is_string( $query ) || '' === $query ) {
        return '';
    }

    $params = array();
    parse_str( $query, $params );

    return nakama_safe_internal_path( isset( $params['return'] ) ? (string) $params['return'] : '' );
}

/**
 * Rol 'customer' para las altas de Nextend.
 *
 * Con el filtro de arriba el login social ya no registra a nadie, así que esto
 * solo entra si alguien vuelve a habilitar el alta automática desde los ajustes
 * del plugin. Se conserva porque Nextend registra con el rol por defecto de
 * WordPress ('subscriber'), y WooCommerce no trataría a ese usuario como
 * cliente. A un usuario existente vinculado por correo no se le toca el rol.
 */
add_action( 'nsl_register_new_user', 'nakama_social_new_user_role', 10, 2 );
function nakama_social_new_user_role( $user_id, $provider = null ) {
    $user = ( $user_id instanceof WP_User ) ? $user_id : get_user_by( 'id', (int) $user_id );
    if ( ! $user instanceof WP_User ) {
        return;
    }

    $user->set_role( 'customer' );

    // Mismo prellenado que el registro por formulario (arriba).
    if ( $user->first_name ) { update_user_meta( $user->ID, 'billing_first_name', $user->first_name ); }
    if ( $user->last_name )  { update_user_meta( $user->ID, 'billing_last_name', $user->last_name ); }
    if ( $user->user_email ) { update_user_meta( $user->ID, 'billing_email', $user->user_email ); }
}

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

/**
 * POST /nakama/v1/quote-pdf — guarda el PDF de la cotización (generado en el
 * navegador) en el servidor y lo vincula al pedido de cotización por su folio.
 * Multipart: campo `folio` (NK-xxxx) + archivo `file` (PDF).
 *
 * Endpoint público (como /quote-order, mismo instante del flujo). Se acota el
 * abuso con: folio válido + pedido existente, estado on-hold, escritura única
 * (no reemplaza un PDF ya guardado), ventana < 1 h desde la creación, tamaño
 * máximo, verificación de PDF real y nombre de archivo controlado por servidor.
 */
function nakama_quote_pdf_upload( WP_REST_Request $request ) {
    $folio = trim( (string) $request->get_param( 'folio' ) );
    if ( ! preg_match( '/^NK-\d{1,10}$/', $folio ) ) {
        return new WP_Error( 'bad_folio', 'Folio inválido.', array( 'status' => 400 ) );
    }

    // Localizar el pedido de cotización por su folio (mismo patrón idempotente).
    $orders = wc_get_orders( array(
        'limit'      => 1,
        'meta_query' => array(
            array(
                'key'   => '_nakama_quote_folio',
                'value' => $folio,
            ),
        ),
    ) );
    if ( empty( $orders ) ) {
        return new WP_Error( 'not_found', 'No existe una cotización con ese folio.', array( 'status' => 404 ) );
    }
    $order = $orders[0];

    // Anti-abuso: solo cotizaciones recién creadas, en espera y sin PDF previo.
    if ( 'on-hold' !== $order->get_status() ) {
        return new WP_Error( 'bad_status', 'La cotización ya no admite adjuntar el PDF.', array( 'status' => 409 ) );
    }
    if ( '' !== (string) $order->get_meta( '_nakama_quote_pdf_url' ) ) {
        return new WP_Error( 'already_uploaded', 'La cotización ya tiene un PDF adjunto.', array( 'status' => 409 ) );
    }
    $created = $order->get_date_created();
    if ( $created && ( time() - $created->getTimestamp() ) > HOUR_IN_SECONDS ) {
        return new WP_Error( 'too_late', 'La ventana para adjuntar el PDF ha expirado.', array( 'status' => 410 ) );
    }

    // Archivo.
    $files = $request->get_file_params();
    if ( empty( $files['file'] ) || ! isset( $files['file']['tmp_name'] ) ) {
        return new WP_Error( 'no_file', 'No se recibió ningún archivo.', array( 'status' => 400 ) );
    }
    $file = $files['file'];

    if ( (int) $file['size'] > 10 * MB_IN_BYTES ) {
        return new WP_Error( 'too_big', 'El PDF supera el tamaño máximo (10 MB).', array( 'status' => 413 ) );
    }

    // Verificar que sea un PDF real: extensión/tipo + magic bytes + finfo.
    $check = wp_check_filetype( $file['name'] );
    $is_pdf = ( 'pdf' === strtolower( (string) $check['ext'] ) && 'application/pdf' === $check['type'] );
    if ( $is_pdf ) {
        $fh = fopen( $file['tmp_name'], 'rb' );
        $magic = $fh ? fread( $fh, 5 ) : '';
        if ( $fh ) {
            fclose( $fh );
        }
        if ( '%PDF-' !== $magic ) {
            $is_pdf = false;
        }
    }
    if ( $is_pdf && function_exists( 'finfo_open' ) ) {
        $finfo = finfo_open( FILEINFO_MIME_TYPE );
        if ( $finfo ) {
            $mime = finfo_file( $finfo, $file['tmp_name'] );
            finfo_close( $finfo );
            if ( 'application/pdf' !== $mime ) {
                $is_pdf = false;
            }
        }
    }
    if ( ! $is_pdf ) {
        return new WP_Error( 'not_pdf', 'El archivo debe ser un PDF.', array( 'status' => 400 ) );
    }

    // Nombre controlado por el servidor (neutraliza el filename del cliente).
    $file['name'] = 'cotizacion-' . strtolower( $folio ) . '.pdf';

    require_once ABSPATH . 'wp-admin/includes/file.php';
    $overrides = array( 'test_form' => false, 'mimes' => array( 'pdf' => 'application/pdf' ) );
    $uploaded  = wp_handle_upload( $file, $overrides );
    if ( isset( $uploaded['error'] ) ) {
        return new WP_Error( 'upload_error', $uploaded['error'], array( 'status' => 500 ) );
    }

    $order->update_meta_data( '_nakama_quote_pdf_url', esc_url_raw( $uploaded['url'] ) );
    $order->save();
    $order->add_order_note( 'PDF de cotización adjuntado automáticamente desde el cotizador web.' );

    $response = rest_ensure_response( array(
        'success' => true,
        'pdf_url' => $uploaded['url'],
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

// ------------------------------------------------------------------
// Enlace "Pagar" en los CORREOS -> /mi-cuenta/
// El correo de cotización (factura al asignar precio) traía el enlace
// directo a order-pay, que no pide dirección de envío ni paqueterías.
// En Mi Cuenta el cliente paga por el flujo correcto (pay-quote via
// checkout normal). Solo aplica DENTRO de los correos: la flag se
// enciende en el header del email y se apaga en el footer, así los
// botones de pago del sitio (order-pay web) no cambian.
// ------------------------------------------------------------------
$GLOBALS['nakama_in_email'] = false;
add_action( 'woocommerce_email_header', function () {
    $GLOBALS['nakama_in_email'] = true;
}, 1 );
add_action( 'woocommerce_email_footer', function () {
    $GLOBALS['nakama_in_email'] = false;
}, 999 );
add_filter( 'woocommerce_get_checkout_payment_url', function ( $url ) {
    if ( ! empty( $GLOBALS['nakama_in_email'] ) ) {
        return home_url( '/mi-cuenta/' );
    }
    return $url;
} );

// ------------------------------------------------------------------
// Vaciar el carrito del frontend tras una compra exitosa.
// El carrito del sitio Next vive en localStorage y la compra termina en
// la página de gracias de WooCommerce; como AMBOS comparten el origen
// nakamabordados.com, este script limpia las llaves directamente.
// ------------------------------------------------------------------
add_action( 'woocommerce_thankyou', function () {
    echo '<script>try{["nakama_cart","nakama_quote_cart","nakama_coupon","nakama_discount","nakama_discount_type"].forEach(function(k){window.localStorage.removeItem(k);});}catch(e){}</script>';
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

    // Social login: tras el OAuth de Nextend el usuario ya viene autenticado
    // por cookie; este bridge solo emite el JWT del frontend. No necesita
    // WooCommerce ni carrito, así que se atiende antes de esos guards.
    if ( 'social-login' === $_GET['nk_bridge'] ) {
        nakama_social_login_bridge();
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

    // 2. Parsear items "ID:QTY,ID:QTY" y/o cotizaciones "ID:ORDER_KEY,...".
    //    Cualquiera de los dos puede faltar (un carrito de solo cotizaciones
    //    es válido), pero no ambos.
    $items_param  = isset( $_GET['items'] )  ? trim( sanitize_text_field( $_GET['items'] ) )  : '';
    $quotes_param = isset( $_GET['quotes'] ) ? trim( sanitize_text_field( $_GET['quotes'] ) ) : '';
    if ( '' === $items_param && '' === $quotes_param ) {
        if ( $debug ) echo "Error: No hay items ni cotizaciones en la URL.<br>";
        return;
    }

    if ( '' !== $items_param ) {
        $items_raw = explode( ',', $items_param );
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
    }

    // 2.4 Cotizaciones del carrito mixto. Cada una se valida por su order_key
    //     (misma exigencia que pay-quote); las que ya no procedan se OMITEN
    //     con un aviso en el checkout en vez de tumbar todo el carrito — el
    //     caso típico es una cotización pagada en otra pestaña.
    if ( '' !== $quotes_param ) {
        $seen_quotes = array();
        foreach ( explode( ',', $quotes_param ) as $quote_str ) {
            $parts = explode( ':', $quote_str, 2 );
            if ( count( $parts ) < 2 ) continue;

            $quote_id  = absint( $parts[0] );
            $quote_key = trim( $parts[1] );
            if ( $quote_id <= 0 || '' === $quote_key || isset( $seen_quotes[ $quote_id ] ) ) continue;
            $seen_quotes[ $quote_id ] = true;

            $result = nakama_add_quote_to_wc_cart( $quote_id, $quote_key );
            if ( true !== $result ) {
                wc_add_notice( sprintf( 'Se omitió una cotización del carrito: %s.', $result ), 'notice' );
            }
            if ( $debug ) echo "Cotización $quote_id: " . ( true === $result ? 'OK' : esc_html( $result ) ) . "<br>";
        }
    }

    // Todo resultó inválido: un checkout vacío solo confunde.
    if ( WC()->cart->is_empty() ) {
        if ( $debug ) { echo 'Carrito vacío tras validar items y cotizaciones.'; exit; }
        wp_safe_redirect( home_url( '/mi-cuenta/' ) );
        exit;
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

// El placeholder guarda sold_individually=true, pero un carrito mixto puede
// llevar VARIAS cotizaciones y todas usan el mismo producto: sin este filtro
// WooCommerce rechazaría la segunda ("solo puedes tener 1"). Cada cotización
// sigue siendo un artículo separado porque su meta produce un cart_item_key
// distinto, y el guard de check_cart_items fuerza cantidad 1 por artículo.
add_filter( 'woocommerce_is_sold_individually', function ( $sold, $product ) {
    if ( $product && (int) get_option( 'nakama_quote_product_id' ) === $product->get_id() ) {
        return false;
    }
    return $sold;
}, 10, 2 );

/**
 * Valida una cotización y la añade al carrito de WC como artículo.
 *
 * El precio de la cotización es el precio FINAL acordado: se guarda junto con
 * su moneda y el hook de precio (prioridad 1000, después del conversor del
 * sitio) lo fija en la moneda que el cliente esté viendo, SIN el margen de
 * productos: 100 USD se ven/pagan como 100 USD.
 *
 * @return true|string true si se añadió; texto con el motivo si no procede.
 */
function nakama_add_quote_to_wc_cart( $order_id, $key ) {
    $order = $order_id ? wc_get_order( $order_id ) : false;
    if ( ! $order || ! hash_equals( $order->get_order_key(), (string) $key ) ) {
        return 'no existe o la llave no coincide';
    }
    if ( ! $order->needs_payment() ) {
        return 'ya no requiere pago (estado: ' . $order->get_status() . ')';
    }
    $total = (float) $order->get_total();
    if ( $total <= 0 ) {
        return 'aún no tiene precio asignado';
    }

    $added = WC()->cart->add_to_cart(
        nakama_quote_product_id(),
        1,
        0,
        array(),
        array(
            'nakama_quote_order_id' => $order->get_id(),
            'nakama_quote_folio'    => (string) $order->get_meta( '_nakama_quote_folio' ),
            'nakama_quote_price'    => $total,
            'nakama_quote_currency' => $order->get_currency() ? $order->get_currency() : get_option( 'woocommerce_currency', 'MXN' ),
        )
    );

    return $added ? true : 'no se pudo añadir al carrito';
}

/** Valida el pedido de cotización y manda al cliente al checkout normal. */
function nakama_pay_quote_via_checkout( $debug = false ) {
    $order_id = absint( $_GET['order'] ?? 0 );
    $key      = sanitize_text_field( $_GET['key'] ?? '' );

    // Camino rápido "Pagar ahora": SOLO esta cotización, carrito limpio.
    WC()->cart->empty_cart();
    $result = nakama_add_quote_to_wc_cart( $order_id, $key );

    if ( true !== $result ) {
        if ( $debug ) { echo 'Cotización rechazada: ' . esc_html( $result ); exit; }
        // Llave inválida -> home (posible enlace manipulado); el resto son
        // estados legítimos del pedido y el cliente los entiende en Mi Cuenta.
        $dest = ( 'no existe o la llave no coincide' === $result ) ? '/' : '/mi-cuenta/';
        wp_safe_redirect( home_url( $dest ) );
        exit;
    }

    if ( $debug ) {
        echo 'Cotización al carrito: OK<br>';
        echo "<a href='" . esc_url( wc_get_checkout_url() ) . "'>Ir al checkout</a>";
        exit;
    }

    wp_safe_redirect( wc_get_checkout_url() );
    exit;
}

/**
 * BRIDGE: Social login (Nextend) -> JWT del frontend
 * URL: https://nakamabordados.com/index.php?nk_bridge=social-login&back=/mi-cuenta/
 *
 * Tras el OAuth, Nextend deja al usuario autenticado con cookie de WordPress,
 * pero el frontend estático trabaja con el JWT de WPGraphQL. La REST API con
 * cookie exigiría un nonce que el frontend todavía no tiene, así que la
 * conversión se hace aquí, en contexto web normal, y el token viaja de vuelta
 * en el FRAGMENT de la URL (no llega a los logs del servidor ni al Referer).
 */
function nakama_social_login_bridge() {
    // La respuesta depende de la cookie de sesión: nunca debe cachearse.
    nocache_headers();
    header( 'X-LiteSpeed-Cache-Control: no-cache' );

    $back = nakama_safe_internal_path( isset( $_GET['back'] ) ? (string) wp_unslash( $_GET['back'] ) : '' );
    if ( '' === $back ) {
        $back = '/';
    }

    $token = null;
    $user  = wp_get_current_user();
    if ( $user && $user->ID && class_exists( '\WPGraphQL\JWT_Authentication\Auth' ) ) {
        // get_token() valida que el usuario sea el de la sesión actual, que es
        // justo el caso aquí. Devuelve el token, null o WP_Error (por ejemplo
        // si falta GRAPHQL_JWT_AUTH_SECRET_KEY).
        $issued = \WPGraphQL\JWT_Authentication\Auth::get_token( $user );
        if ( ! is_wp_error( $issued ) && is_string( $issued ) && '' !== $issued ) {
            $token = $issued;
        }
    }

    if ( null === $token ) {
        $sep = ( false === strpos( $back, '?' ) ) ? '?' : '&';
        wp_safe_redirect( home_url( $back . $sep . 'social_error=1' ) );
        exit;
    }

    wp_safe_redirect( home_url( $back ) . '#nk_jwt=' . rawurlencode( $token ) );
    exit;
}

// Precio y nombre del artículo de cotización en el carrito.
// Prioridad 1000: corre DESPUÉS del conversor de moneda del sitio (999) y
// fija el precio FINAL en la moneda que el cliente está viendo, exento del
// margen de productos. Conversión cruzada con el tipo de cambio REAL
// (pesos_reales = 1/rate + 2): cotización de 100 USD -> 100 USD en vista USD
// y 1,747 MXN en vista MXN; cotización en MXN -> división inversa.
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
    foreach ( $cart->get_cart() as $cart_item ) {
        if ( ! isset( $cart_item['nakama_quote_price'] ) ) {
            continue;
        }

        $price          = (float) $cart_item['nakama_quote_price'];
        $quote_currency = ! empty( $cart_item['nakama_quote_currency'] )
            ? $cart_item['nakama_quote_currency']
            : get_option( 'woocommerce_currency', 'MXN' );
        // Moneda activa (el conversor del sitio filtra woocommerce_currency).
        $display_currency = get_woocommerce_currency();

        if ( $display_currency !== $quote_currency ) {
            $rate = nakama_get_usd_rate();
            if ( $rate && $rate > 0 ) {
                $pesos_reales = ( 1 / $rate ) + 2;
                if ( 'USD' === $quote_currency ) {
                    $price = round( $price * $pesos_reales, 2 ); // USD -> MXN
                } elseif ( 'USD' === $display_currency ) {
                    $price = round( $price / $pesos_reales, 2 ); // MXN -> USD
                }
            }
            // Sin tipo de cambio disponible: se deja el precio tal cual
            // (caso raro; el transient se renueva solo).
        }

        $cart_item['data']->set_price( $price );
        if ( ! empty( $cart_item['nakama_quote_folio'] ) ) {
            $cart_item['data']->set_name( 'Cotización ' . $cart_item['nakama_quote_folio'] );
        }
    }
}, 1000 );

// Referencia de cada cotización EN SU LINE ITEM: con varias en el mismo
// pedido, una meta a nivel pedido se sobrescribiría entre sí (le pasaba al
// folio, al source y al PDF). El item conserva la suya pase lo que pase.
add_action( 'woocommerce_checkout_create_order_line_item', function ( $item, $cart_item_key, $values, $order ) {
    if ( ! isset( $values['nakama_quote_order_id'] ) ) {
        return;
    }
    $src_id = (int) $values['nakama_quote_order_id'];
    $item->add_meta_data( '_nakama_quote_source_order', $src_id, true );
    if ( ! empty( $values['nakama_quote_folio'] ) ) {
        $item->add_meta_data( 'Folio', $values['nakama_quote_folio'], true );
    }
    // Heredar el PDF de la cotización origen para que Producción lo muestre.
    $src_quote = wc_get_order( $src_id );
    if ( $src_quote ) {
        $pdf = (string) $src_quote->get_meta( '_nakama_quote_pdf_url' );
        if ( '' !== $pdf ) {
            $item->add_meta_data( '_nakama_quote_pdf_url', $pdf, true );
        }
    }
}, 10, 4 );

// Meta a nivel pedido SOLO cuando hay exactamente una cotización: así el
// pedido nuevo toma el folio como número (filtro woocommerce_order_number) y
// Producción encuentra el PDF donde siempre. Con varias, el pedido conserva
// su número nativo y cada línea lleva su folio — no hay un único NK-x que
// pueda representarlas a todas.
add_action( 'woocommerce_checkout_create_order', function ( $order ) {
    $quote_items = array();
    foreach ( $order->get_items( 'line_item' ) as $item ) {
        if ( $item->get_meta( '_nakama_quote_source_order' ) ) {
            $quote_items[] = $item;
        }
    }
    if ( 1 !== count( $quote_items ) ) {
        return;
    }
    $item = $quote_items[0];
    $order->update_meta_data( '_nakama_quote_source_order', (int) $item->get_meta( '_nakama_quote_source_order' ) );
    $folio = $item->get_meta( 'Folio' );
    if ( $folio ) {
        $order->update_meta_data( '_nakama_quote_folio', $folio );
    }
    $pdf = $item->get_meta( '_nakama_quote_pdf_url' );
    if ( $pdf ) {
        $order->update_meta_data( '_nakama_quote_pdf_url', $pdf );
    }
}, 20 );

// Al completarse el checkout: cada cotización pagada libera su folio hacia el
// pedido nuevo y se cancela con nota. Se recorren los LINE ITEMS (no la meta
// del pedido) para cubrir el caso de varias cotizaciones, y cada origen se
// revalida: si otro flujo ya la pagó o canceló, solo se deja constancia —
// nunca una segunda cancelación ni pisar un pedido vivo.
add_action( 'woocommerce_checkout_order_processed', function ( $order_id, $posted_data, $order ) {
    $src_ids = array();
    foreach ( $order->get_items( 'line_item' ) as $item ) {
        $sid = (int) $item->get_meta( '_nakama_quote_source_order' );
        if ( $sid ) {
            $src_ids[ $sid ] = true;
        }
    }

    foreach ( array_keys( $src_ids ) as $src_id ) {
        $src = wc_get_order( $src_id );
        if ( ! $src ) {
            continue;
        }
        if ( '' !== (string) $src->get_meta( '_nakama_quote_folio_ref' ) || $src->has_status( 'cancelled' ) ) {
            $src->add_order_note( sprintf( 'El pedido #%d volvió a referenciar esta cotización; ya estaba procesada, sin cambios.', $order_id ) );
            $src->save();
            continue;
        }
        if ( ! $src->needs_payment() ) {
            $src->add_order_note( sprintf( 'El pedido #%d referenció esta cotización, pero ya no requería pago (estado: %s). Sin cambios.', $order_id, $src->get_status() ) );
            $src->save();
            continue;
        }
        $folio = $src->get_meta( '_nakama_quote_folio' );
        // Liberar el folio del original para que el número NK-x identifique al nuevo.
        $src->delete_meta_data( '_nakama_quote_folio' );
        $src->update_meta_data( '_nakama_quote_folio_ref', $folio );
        $src->add_order_note( sprintf( 'Cotización %s pagada mediante el pedido #%d (checkout normal con envío).', $folio, $order_id ) );
        $src->update_status( 'cancelled', 'Reemplazada por el pedido de pago con envío.' );
        $src->save();
    }
}, 10, 3 );

// Entre que la cotización entró al carrito y el cliente paga puede pasar de
// todo: pagarla en otra pestaña con "Pagar ahora", o que el taller la cierre.
// WooCommerce ejecuta esto en el carrito y el checkout: la cotización que ya
// no proceda sale del carrito con aviso, y ninguna puede llevar cantidad > 1.
add_action( 'woocommerce_check_cart_items', function () {
    if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
        return;
    }
    foreach ( WC()->cart->get_cart() as $cart_key => $cart_item ) {
        if ( empty( $cart_item['nakama_quote_order_id'] ) ) {
            continue;
        }
        if ( (int) $cart_item['quantity'] > 1 ) {
            WC()->cart->set_quantity( $cart_key, 1, false );
        }
        $src = wc_get_order( (int) $cart_item['nakama_quote_order_id'] );
        if ( ! $src || ! $src->needs_payment() || (float) $src->get_total() <= 0 ) {
            WC()->cart->remove_cart_item( $cart_key );
            $folio = ! empty( $cart_item['nakama_quote_folio'] ) ? $cart_item['nakama_quote_folio'] : '';
            wc_add_notice( sprintf( 'La cotización %s ya no está pendiente de pago; se quitó del carrito.', $folio ), 'notice' );
        }
    }
} );

// Nota: el envío gratis, el descuento por transferencia y los cupones se
// gestionan desde otro plugin; este plugin no interviene en esas promos.

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
