<?php
/**
 * Plugin Name: Nakama Panel de Producción
 * Description: Tablero Kanban de pedidos para el personal de producción: ver pedidos en proceso, tomarlos, finalizar producción y gestionar los PDF de patrones. Sin exponer precios ni datos administrativos.
 * Version: 1.0.1
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'NAKAMA_PROD_CAP', 'access_production_dashboard' );
define( 'NAKAMA_PROD_STATUS', 'pendiente-guia' ); // sin prefijo wc-
define( 'NAKAMA_PROD_PAGE', 'nakama-produccion' );
define( 'NAKAMA_PROD_PER_PAGE', 5 );

// Compatibilidad con HPOS (pedidos en tablas propias).
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );

/* ============================================================================
 * ACTIVACIÓN: tabla de PDFs de patrones + capability a admin/shop_manager
 * ========================================================================== */
function nakama_prod_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'nakama_product_pdfs';
}

register_activation_hook( __FILE__, function () {
    global $wpdb;
    $table   = nakama_prod_table_name();
    $charset = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( "CREATE TABLE {$table} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        product_name VARCHAR(255) NOT NULL DEFAULT '',
        pdf_url TEXT NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY (id),
        KEY product_id (product_id)
    ) {$charset};" );

    foreach ( array( 'administrator', 'shop_manager' ) as $role_name ) {
        $role = get_role( $role_name );
        if ( $role ) {
            $role->add_cap( NAKAMA_PROD_CAP );
        }
    }
} );

/* ============================================================================
 * ESTATUS CUSTOM: wc-pendiente-guia ("Pendiente de guía")
 * ========================================================================== */
add_action( 'init', function () {
    register_post_status( 'wc-' . NAKAMA_PROD_STATUS, array(
        'label'                     => 'Pendiente de guía',
        'public'                    => true,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        /* translators: %s: número de pedidos. */
        'label_count'               => _n_noop( 'Pendiente de guía <span class="count">(%s)</span>', 'Pendiente de guía <span class="count">(%s)</span>' ),
    ) );
} );

// Insertar el estatus en la lista de WooCommerce, justo después de "Procesando".
add_filter( 'wc_order_statuses', function ( $statuses ) {
    $new = array();
    foreach ( $statuses as $key => $label ) {
        $new[ $key ] = $label;
        if ( 'wc-processing' === $key ) {
            $new[ 'wc-' . NAKAMA_PROD_STATUS ] = 'Pendiente de guía';
        }
    }
    return $new;
} );

// Registrar el estatus para el almacenamiento HPOS de pedidos.
add_filter( 'woocommerce_register_shop_order_post_statuses', function ( $statuses ) {
    $statuses[ 'wc-' . NAKAMA_PROD_STATUS ] = array(
        'label'                     => 'Pendiente de guía',
        'public'                    => false,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop( 'Pendiente de guía <span class="count">(%s)</span>', 'Pendiente de guía <span class="count">(%s)</span>' ),
    );
    return $statuses;
} );

// Badge ámbar en la lista de pedidos del admin.
add_action( 'admin_head', function () {
    echo '<style>.order-status.status-pendiente-guia{background:#FBBF24;color:#1A1F2B;}</style>';
} );

/* ============================================================================
 * UI DE PERMISOS: checkbox en el perfil de usuario (Usuarios → editar)
 * ========================================================================== */
function nakama_prod_render_user_field( $user ) {
    if ( ! current_user_can( 'edit_users' ) ) {
        return;
    }
    $has = user_can( $user, NAKAMA_PROD_CAP );
    wp_nonce_field( 'nakama_prod_user_cap', 'nakama_prod_user_cap_nonce' );
    ?>
    <h2>Panel de Producción</h2>
    <table class="form-table" role="presentation">
        <tr>
            <th scope="row">Acceso al Panel de Producción</th>
            <td>
                <label>
                    <input type="checkbox" name="nakama_prod_access" value="1" <?php checked( $has ); ?> />
                    Permitir a este usuario ver y gestionar el tablero de producción.
                </label>
            </td>
        </tr>
    </table>
    <?php
}
add_action( 'show_user_profile', 'nakama_prod_render_user_field' );
add_action( 'edit_user_profile', 'nakama_prod_render_user_field' );

function nakama_prod_save_user_field( $user_id ) {
    if ( ! current_user_can( 'edit_users' ) ) {
        return;
    }
    if ( ! isset( $_POST['nakama_prod_user_cap_nonce'] ) ||
         ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nakama_prod_user_cap_nonce'] ) ), 'nakama_prod_user_cap' ) ) {
        return;
    }
    $user = get_userdata( $user_id );
    if ( ! $user ) {
        return;
    }
    if ( ! empty( $_POST['nakama_prod_access'] ) ) {
        $user->add_cap( NAKAMA_PROD_CAP );
    } else {
        $user->remove_cap( NAKAMA_PROD_CAP );
    }
}
add_action( 'personal_options_update', 'nakama_prod_save_user_field' );
add_action( 'edit_user_profile_update', 'nakama_prod_save_user_field' );

/* ============================================================================
 * HELPERS
 * ========================================================================== */

/** Normaliza un texto para comparar nombres de producto/PDF: minúsculas, sin
 *  acentos, sin extensión, espacios/guiones/underscores colapsados a un espacio. */
function nakama_prod_normalize( $text ) {
    $text = (string) $text;
    $text = preg_replace( '/\.pdf$/i', '', $text );
    $text = remove_accents( $text );
    $text = strtolower( $text );
    $text = preg_replace( '/[_\-\s]+/', ' ', $text );
    return trim( $text );
}

/** Lee talla/estilo/color de un WC_Order_Item_Product tolerando los distintos
 *  nombres reales (Size/Talla, Style/Estilo, pa_*), igual que getVariationAttr()
 *  del frontend. Devuelve array( 'talla' => ..., 'estilo' => ..., 'color' => ... ). */
function nakama_prod_item_attributes( $item ) {
    $wanted = array(
        'talla'  => array( 'talla', 'size', 'pa_talla' ),
        'estilo' => array( 'estilo', 'style', 'pa_estilo' ),
        'color'  => array( 'color', 'pa_color' ),
    );
    $out = array( 'talla' => '', 'estilo' => '', 'color' => '' );

    foreach ( $item->get_meta_data() as $meta ) {
        $data  = $meta->get_data();
        $key   = isset( $data['key'] ) ? strtolower( (string) $data['key'] ) : '';
        $value = isset( $data['value'] ) ? $data['value'] : '';
        if ( ! is_scalar( $value ) || '' === (string) $value ) {
            continue;
        }
        // Ignorar meta interna (empieza por _).
        if ( '' === $key || '_' === $key[0] ) {
            continue;
        }
        foreach ( $wanted as $slot => $aliases ) {
            if ( '' !== $out[ $slot ] ) {
                continue;
            }
            foreach ( $aliases as $alias ) {
                if ( false !== strpos( $key, $alias ) ) {
                    $out[ $slot ] = (string) $value;
                    break 2;
                }
            }
        }
    }
    return $out;
}

/** URL del PDF de patrón vinculado a un producto (por product_id o por nombre
 *  normalizado). Devuelve '' si no hay. */
function nakama_prod_pdf_for( $product_id, $product_name ) {
    global $wpdb;
    $table = nakama_prod_table_name();

    if ( $product_id ) {
        $url = $wpdb->get_var( $wpdb->prepare(
            "SELECT pdf_url FROM {$table} WHERE product_id = %d ORDER BY uploaded_at DESC LIMIT 1",
            $product_id
        ) );
        if ( $url ) {
            return $url;
        }
    }
    $norm = nakama_prod_normalize( $product_name );
    if ( '' === $norm ) {
        return '';
    }
    // Comparación por nombre normalizado (los nombres en tabla se guardan crudos).
    $rows = $wpdb->get_results( "SELECT product_name, pdf_url FROM {$table}" );
    foreach ( (array) $rows as $r ) {
        if ( nakama_prod_normalize( $r->product_name ) === $norm ) {
            return $r->pdf_url;
        }
    }
    return '';
}

/** Construye la tarjeta resumida de un pedido (SIN precios ni direcciones). */
function nakama_prod_card( $order ) {
    $items      = $order->get_items();
    $item_count = 0;
    $names      = array();
    foreach ( $items as $item ) {
        $item_count += (int) $item->get_quantity();
        $names[]     = $item->get_name();
    }

    $taken_by = $order->get_meta( '_nakama_prod_taken_by' );
    $taken_at = (int) $order->get_meta( '_nakama_prod_taken_at' );

    $created  = $order->get_date_created();
    $created_ts = $created ? $created->getTimestamp() : 0;

    return array(
        'id'         => $order->get_id(),
        'number'     => $order->get_order_number(),
        'age'        => $created_ts ? human_time_diff( $created_ts, time() ) : '',
        'item_count' => $item_count,
        'products'   => $names,
        'taken'      => ! empty( $taken_by ),
        'taken_by'   => $taken_by ? (string) $taken_by : '',
        'taken_age'  => $taken_at ? human_time_diff( $taken_at, time() ) : '',
    );
}

/** Duración legible entre dos timestamps: "2h 15m". */
function nakama_prod_human_duration( $seconds ) {
    $seconds = max( 0, (int) $seconds );
    $h = floor( $seconds / 3600 );
    $m = floor( ( $seconds % 3600 ) / 60 );
    if ( $h > 0 ) {
        return sprintf( '%dh %dm', $h, $m );
    }
    return sprintf( '%dm', $m );
}

/* ============================================================================
 * REST API: nakama/v1/production/*
 * Auth por cookie de sesión + nonce X-WP-Nonce; requiere la capability.
 * ========================================================================== */
function nakama_prod_permission() {
    return current_user_can( NAKAMA_PROD_CAP );
}

add_action( 'rest_api_init', function () {
    $perm = 'nakama_prod_permission';

    // Chequeo de acceso para el frontend headless: cualquier usuario logueado
    // (JWT) puede preguntar si tiene el permiso; decide si mostrar el botón y
    // el panel en /produccion. current_user_can devuelve false para invitados.
    register_rest_route( 'nakama/v1', '/production/access', array(
        'methods'             => 'GET',
        'callback'            => function () {
            return new WP_REST_Response( array( 'can' => current_user_can( NAKAMA_PROD_CAP ) ), 200 );
        },
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'nakama/v1', '/production/orders', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_prod_rest_orders',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/production/orders/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_prod_rest_order_detail',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/production/take', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_prod_rest_take',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/production/finish', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_prod_rest_finish',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/production/pdfs', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'nakama_prod_rest_pdfs_list',
            'permission_callback' => $perm,
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'nakama_prod_rest_pdf_upload',
            'permission_callback' => $perm,
        ),
    ) );
    register_rest_route( 'nakama/v1', '/production/pdfs/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'nakama_prod_rest_pdf_delete',
        'permission_callback' => $perm,
    ) );
} );

/** GET /production/orders?column=processing|pendiente-guia&page=N */
function nakama_prod_rest_orders( WP_REST_Request $request ) {
    $column = $request->get_param( 'column' );
    $page   = max( 1, (int) $request->get_param( 'page' ) );
    $status = ( NAKAMA_PROD_STATUS === $column ) ? NAKAMA_PROD_STATUS : 'processing';

    // Auto-completar: en "pendiente de guía", los pedidos que ya tienen guía de
    // Envia pasan solos a "completado" y salen del tablero.
    if ( NAKAMA_PROD_STATUS === $status && function_exists( 'nakama_find_order_tracking' ) ) {
        $pending = wc_get_orders( array(
            'status'  => 'wc-' . NAKAMA_PROD_STATUS,
            'limit'   => 50,
            'orderby' => 'date',
            'order'   => 'ASC',
            'return'  => 'objects',
        ) );
        foreach ( $pending as $po ) {
            $found = nakama_find_order_tracking( $po );
            if ( ! empty( $found['code'] ) ) {
                $po->update_status( 'completed', sprintf( 'Guía detectada (%s): completado automáticamente por el Panel de Producción.', $found['code'] ) );
            }
        }
    }

    // Traer una página + 1 para saber si hay más.
    $per   = NAKAMA_PROD_PER_PAGE;
    $args  = array(
        'status'   => 'wc-' . $status,
        'limit'    => $per + 1,
        'offset'   => ( $page - 1 ) * $per,
        'orderby'  => 'date',
        'order'    => 'ASC', // más viejos primero
        'return'   => 'objects',
    );

    // En "en proceso" priorizar los NO tomados: se hace ordenando en dos pasadas.
    if ( 'processing' === $status ) {
        // Traer un lote amplio, separar tomados/no-tomados, paginar en memoria.
        $all = wc_get_orders( array(
            'status'  => 'wc-processing',
            'limit'   => 200,
            'orderby' => 'date',
            'order'   => 'ASC',
            'return'  => 'objects',
        ) );
        $untaken = array();
        $taken   = array();
        foreach ( $all as $o ) {
            if ( $o->get_meta( '_nakama_prod_taken_at' ) ) {
                $taken[] = $o;
            } else {
                $untaken[] = $o;
            }
        }
        $ordered = array_merge( $untaken, $taken );
        $slice   = array_slice( $ordered, ( $page - 1 ) * $per, $per + 1 );
        $orders  = $slice;
    } else {
        $orders = wc_get_orders( $args );
    }

    $has_more = count( $orders ) > $per;
    if ( $has_more ) {
        $orders = array_slice( $orders, 0, $per );
    }

    $cards = array();
    foreach ( $orders as $order ) {
        $cards[] = nakama_prod_card( $order );
    }

    return new WP_REST_Response( array(
        'orders'   => $cards,
        'has_more' => $has_more,
        'page'     => $page,
    ), 200 );
}

/** GET /production/orders/{id} — detalle con atributos y PDF por producto. */
function nakama_prod_rest_order_detail( WP_REST_Request $request ) {
    $order = wc_get_order( (int) $request['id'] );
    if ( ! $order ) {
        return new WP_Error( 'not_found', 'Pedido no encontrado', array( 'status' => 404 ) );
    }

    $products = array();
    foreach ( $order->get_items() as $item ) {
        $product   = $item->get_product();
        $product_id = $product ? ( $product->is_type( 'variation' ) ? $product->get_parent_id() : $product->get_id() ) : 0;
        $attrs     = nakama_prod_item_attributes( $item );
        $products[] = array(
            'name'    => $item->get_name(),
            'qty'     => (int) $item->get_quantity(),
            'talla'   => $attrs['talla'],
            'estilo'  => $attrs['estilo'],
            'color'   => $attrs['color'],
            'pdf_url' => nakama_prod_pdf_for( $product_id, $item->get_name() ),
        );
    }

    $status   = $order->get_status();
    $taken_by = $order->get_meta( '_nakama_prod_taken_by' );

    return new WP_REST_Response( array(
        'id'       => $order->get_id(),
        'number'   => $order->get_order_number(),
        'status'   => $status,
        'taken'    => ! empty( $taken_by ),
        'taken_by' => $taken_by ? (string) $taken_by : '',
        'products' => $products,
    ), 200 );
}

/** POST /production/take { order_id } */
function nakama_prod_rest_take( WP_REST_Request $request ) {
    $order = wc_get_order( (int) $request->get_param( 'order_id' ) );
    if ( ! $order ) {
        return new WP_Error( 'not_found', 'Pedido no encontrado', array( 'status' => 404 ) );
    }
    $user = wp_get_current_user();
    $name = $user->display_name ? $user->display_name : $user->user_login;

    $prev_by = $order->get_meta( '_nakama_prod_taken_by' );
    $order->update_meta_data( '_nakama_prod_taken_by', $name );
    $order->update_meta_data( '_nakama_prod_taken_at', time() );
    $order->save();

    if ( $prev_by && $prev_by !== $name ) {
        $order->add_order_note( sprintf( 'Pedido re-tomado por %s (antes: %s).', $name, $prev_by ) );
    } else {
        $order->add_order_note( sprintf( 'Pedido tomado en producción por %s.', $name ) );
    }

    return new WP_REST_Response( array( 'success' => true, 'taken_by' => $name ), 200 );
}

/** POST /production/finish { order_id } — processing → pendiente-guia. */
function nakama_prod_rest_finish( WP_REST_Request $request ) {
    $order = wc_get_order( (int) $request->get_param( 'order_id' ) );
    if ( ! $order ) {
        return new WP_Error( 'not_found', 'Pedido no encontrado', array( 'status' => 404 ) );
    }
    if ( 'processing' !== $order->get_status() ) {
        return new WP_Error( 'bad_status', 'El pedido no está en proceso.', array( 'status' => 400 ) );
    }

    $user = wp_get_current_user();
    $name = $user->display_name ? $user->display_name : $user->user_login;
    $now  = time();

    $taken_at = (int) $order->get_meta( '_nakama_prod_taken_at' );
    $duration = $taken_at ? ( $now - $taken_at ) : 0;

    $order->update_meta_data( '_nakama_prod_finished_by', $name );
    $order->update_meta_data( '_nakama_prod_finished_at', $now );
    if ( $duration > 0 ) {
        $order->update_meta_data( '_nakama_prod_duration', $duration );
    }
    $order->set_status( 'wc-' . NAKAMA_PROD_STATUS );
    $order->save();

    $note = $duration > 0
        ? sprintf( 'Producción finalizada por %s (duración: %s). Pedido en "Pendiente de guía".', $name, nakama_prod_human_duration( $duration ) )
        : sprintf( 'Producción finalizada por %s. Pedido en "Pendiente de guía".', $name );
    $order->add_order_note( $note );

    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/** GET /production/pdfs — listado de patrones. */
function nakama_prod_rest_pdfs_list() {
    global $wpdb;
    $table = nakama_prod_table_name();
    $rows  = $wpdb->get_results( "SELECT id, product_id, product_name, pdf_url, uploaded_at FROM {$table} ORDER BY product_name ASC" );
    return new WP_REST_Response( array( 'pdfs' => (array) $rows ), 200 );
}

/** POST /production/pdfs (multipart: file) — valida match exacto por nombre. */
function nakama_prod_rest_pdf_upload( WP_REST_Request $request ) {
    $files = $request->get_file_params();
    if ( empty( $files['file'] ) ) {
        return new WP_Error( 'no_file', 'No se recibió ningún archivo.', array( 'status' => 400 ) );
    }
    $file = $files['file'];

    // Validar que sea PDF (por tipo real y por extensión).
    $check = wp_check_filetype( $file['name'] );
    if ( 'pdf' !== strtolower( (string) $check['ext'] ) || 'application/pdf' !== $check['type'] ) {
        return new WP_Error( 'not_pdf', 'El archivo debe ser un PDF.', array( 'status' => 400 ) );
    }

    // Buscar el producto cuyo título normalizado coincida con el del archivo.
    $file_norm = nakama_prod_normalize( $file['name'] );
    $products  = get_posts( array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ) );

    $matched_id   = 0;
    $matched_name = '';
    $catalog      = array();
    foreach ( $products as $pid ) {
        $title = get_the_title( $pid );
        $catalog[ $pid ] = $title;
        if ( nakama_prod_normalize( $title ) === $file_norm ) {
            $matched_id   = $pid;
            $matched_name = $title;
            break;
        }
    }

    if ( ! $matched_id ) {
        // Sugerir los 5 títulos más parecidos, sin guardar nada.
        $scored = array();
        foreach ( $catalog as $pid => $title ) {
            similar_text( $file_norm, nakama_prod_normalize( $title ), $pct );
            $scored[] = array( 'name' => $title, 'pct' => $pct );
        }
        usort( $scored, function ( $a, $b ) {
            return $b['pct'] <=> $a['pct'];
        } );
        $suggestions = array_map( function ( $s ) {
            return $s['name'];
        }, array_slice( $scored, 0, 5 ) );

        return new WP_REST_Response( array(
            'success'     => false,
            'message'     => 'El nombre del PDF no coincide con ningún producto. Renómbralo igual que el producto y vuelve a subirlo.',
            'suggestions' => $suggestions,
        ), 400 );
    }

    // Subir el archivo a la Media Library.
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $overrides = array( 'test_form' => false, 'mimes' => array( 'pdf' => 'application/pdf' ) );
    $uploaded  = wp_handle_upload( $file, $overrides );
    if ( isset( $uploaded['error'] ) ) {
        return new WP_Error( 'upload_error', $uploaded['error'], array( 'status' => 500 ) );
    }

    // Insert/update: un PDF por producto.
    global $wpdb;
    $table    = nakama_prod_table_name();
    $existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE product_id = %d", $matched_id ) );
    $data     = array(
        'product_id'   => $matched_id,
        'product_name' => $matched_name,
        'pdf_url'      => esc_url_raw( $uploaded['url'] ),
        'uploaded_at'  => current_time( 'mysql' ),
    );
    if ( $existing ) {
        $wpdb->update( $table, $data, array( 'id' => (int) $existing ) );
    } else {
        $wpdb->insert( $table, $data );
    }

    return new WP_REST_Response( array(
        'success'      => true,
        'product_name' => $matched_name,
        'pdf_url'      => $data['pdf_url'],
    ), 200 );
}

/** DELETE /production/pdfs/{id} */
function nakama_prod_rest_pdf_delete( WP_REST_Request $request ) {
    global $wpdb;
    $table = nakama_prod_table_name();
    $id    = (int) $request['id'];
    $url   = $wpdb->get_var( $wpdb->prepare( "SELECT pdf_url FROM {$table} WHERE id = %d", $id ) );
    if ( null === $url ) {
        return new WP_Error( 'not_found', 'Registro no encontrado', array( 'status' => 404 ) );
    }
    // Borrar el archivo físico si está en uploads.
    $upload_dir = wp_upload_dir();
    if ( $url && false !== strpos( $url, $upload_dir['baseurl'] ) ) {
        $path = str_replace( $upload_dir['baseurl'], $upload_dir['basedir'], $url );
        if ( file_exists( $path ) ) {
            wp_delete_file( $path );
        }
    }
    $wpdb->delete( $table, array( 'id' => $id ) );
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/* ============================================================================
 * PÁGINA DEL PANEL (wp-admin, pantalla completa)
 * ========================================================================== */
add_action( 'admin_menu', function () {
    add_menu_page(
        'Producción',
        'Producción',
        NAKAMA_PROD_CAP,
        NAKAMA_PROD_PAGE,
        'nakama_prod_render_page',
        'dashicons-hammer',
        56
    );
} );

// Ocultar el chrome de wp-admin solo en la página del panel (uso en piso/tablet).
add_action( 'admin_head', function () {
    $screen = get_current_screen();
    if ( ! $screen || 'toplevel_page_' . NAKAMA_PROD_PAGE !== $screen->id ) {
        return;
    }
    echo '<style>
        #adminmenumain, #wpfooter, #screen-meta, #screen-meta-links { display:none !important; }
        #wpcontent, #wpbody-content { margin-left:0 !important; padding-left:0 !important; }
        #wpbody-content { padding-bottom:0 !important; }
        html.wp-toolbar { padding-top:32px; }
    </style>';
} );

function nakama_prod_render_page() {
    if ( ! current_user_can( NAKAMA_PROD_CAP ) ) {
        wp_die( 'No tienes permiso para acceder al Panel de Producción.' );
    }
    $user      = wp_get_current_user();
    $user_name = $user->display_name ? $user->display_name : $user->user_login;
    // ?rest_route= para que el .htaccess aplique no-cache al REST.
    $rest_base = home_url( '/?rest_route=/nakama/v1/production' );
    $nonce     = wp_create_nonce( 'wp_rest' );
    ?>
    <div id="nakama-prod-app"
         data-rest="<?php echo esc_attr( $rest_base ); ?>"
         data-nonce="<?php echo esc_attr( $nonce ); ?>"
         data-user="<?php echo esc_attr( $user_name ); ?>">

        <header class="np-header">
            <h1>Panel de Producción</h1>
            <div class="np-tabs">
                <button class="np-tab is-active" data-tab="board">Tablero</button>
                <button class="np-tab" data-tab="pdfs">Patrones (PDF)</button>
            </div>
        </header>

        <section class="np-view" data-view="board">
            <div class="np-board">
                <div class="np-col np-col-processing">
                    <h2 class="np-col-title">En proceso</h2>
                    <div class="np-cards" data-column="processing"></div>
                    <button class="np-more" data-column="processing" hidden>Ver más</button>
                </div>
                <div class="np-col np-col-pending">
                    <h2 class="np-col-title">Pendiente de guía</h2>
                    <div class="np-cards" data-column="<?php echo esc_attr( NAKAMA_PROD_STATUS ); ?>"></div>
                    <button class="np-more" data-column="<?php echo esc_attr( NAKAMA_PROD_STATUS ); ?>" hidden>Ver más</button>
                </div>
            </div>
        </section>

        <section class="np-view" data-view="pdfs" hidden>
            <div class="np-pdf-upload">
                <h2>Subir patrón (PDF)</h2>
                <p>El nombre del archivo debe coincidir con el nombre del producto. Ejemplo: <code>Hoodie One Piece.pdf</code></p>
                <input type="file" id="np-pdf-file" accept="application/pdf" />
                <button class="np-btn np-btn-primary" id="np-pdf-submit">Subir PDF</button>
                <div class="np-pdf-msg" id="np-pdf-msg"></div>
            </div>
            <div class="np-pdf-list" id="np-pdf-list"></div>
        </section>

        <div class="np-modal" id="np-modal" hidden>
            <div class="np-modal-box">
                <button class="np-modal-close" id="np-modal-close" aria-label="Cerrar">&times;</button>
                <div class="np-modal-content" id="np-modal-content"></div>
            </div>
        </div>
    </div>

    <?php nakama_prod_render_styles(); ?>
    <?php nakama_prod_render_script(); ?>
    <?php
}

function nakama_prod_render_styles() {
    ?>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Teko:wght@500;600;700&display=swap');

    #nakama-prod-app {
        --np-primary: #E3000F;
        --np-amber:   #FBBF24;
        --np-ink:     #0A0A0A;
        --np-paper:   #f4f1ea;
        --np-card:    #ffffff;
        font-family: 'Inter', system-ui, sans-serif;
        color: var(--np-ink);
        background:
            radial-gradient(#d5d1c8 1px, transparent 1px) 0 0 / 20px 20px,
            var(--np-paper);
        min-height: calc(100vh - 32px);
        margin: 0 0 0 -20px;
        padding: 0 0 40px;
        box-sizing: border-box;
    }
    #nakama-prod-app *, #nakama-prod-app *::before, #nakama-prod-app *::after { box-sizing: border-box; }

    #nakama-prod-app h1, #nakama-prod-app h2, #nakama-prod-app .np-col-title {
        font-family: 'Teko', sans-serif;
        letter-spacing: 0.5px;
        margin: 0;
    }

    .np-header {
        background: var(--np-ink);
        border-bottom: 4px solid var(--np-primary);
        padding: 14px 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 14px 24px;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 32px;
        z-index: 10;
    }
    .np-header h1 { color: #fff; font-size: 2.4rem; line-height: 1; text-transform: uppercase; }

    .np-tabs { display: flex; gap: 10px; }
    .np-tab {
        font-family: 'Teko', sans-serif;
        font-size: 1.3rem;
        text-transform: uppercase;
        padding: 6px 18px;
        background: #fff;
        color: var(--np-ink);
        border: 2px solid #000;
        box-shadow: 3px 3px 0 var(--np-primary);
        cursor: pointer;
        line-height: 1.1;
    }
    .np-tab.is-active { background: var(--np-primary); color: #fff; box-shadow: 3px 3px 0 #000; }

    .np-view { padding: 24px; }
    .np-board { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 900px) { .np-board { grid-template-columns: 1fr; } }

    .np-col { background: transparent; }
    .np-col-title {
        font-size: 2rem;
        text-transform: uppercase;
        padding: 8px 14px;
        border: 3px solid #000;
        box-shadow: 4px 4px 0 #000;
        margin-bottom: 18px;
        color: #fff;
    }
    .np-col-processing .np-col-title { background: var(--np-primary); }
    .np-col-pending .np-col-title { background: var(--np-amber); color: #1A1F2B; }

    .np-cards { display: flex; flex-direction: column; gap: 14px; }

    .np-card {
        background: var(--np-card);
        border: 3px solid #000;
        box-shadow: 4px 4px 0 #000;
        padding: 14px 16px;
        cursor: pointer;
        transition: transform .08s ease, box-shadow .08s ease;
    }
    .np-card:hover { transform: translate(2px,2px); box-shadow: 2px 2px 0 #000; }
    .np-card-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
    .np-card-num { font-family: 'Teko', sans-serif; font-size: 1.7rem; line-height: 1; }
    .np-card-age { font-size: .8rem; color: #555; white-space: nowrap; }
    .np-card-count {
        display: inline-block; margin: 8px 0; font-weight: 800; font-size: .8rem;
        text-transform: uppercase; background: #000; color: #fff; padding: 2px 8px;
    }
    .np-card-products { font-size: .92rem; line-height: 1.35; }
    .np-card-taken {
        margin-top: 10px; font-size: .82rem; font-weight: 600;
        background: #fff5f5; border-left: 3px solid var(--np-primary); padding: 4px 8px;
    }

    .np-more {
        margin-top: 16px; width: 100%;
        font-family: 'Teko', sans-serif; font-size: 1.3rem; text-transform: uppercase;
        background: #fff; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
        padding: 8px; cursor: pointer;
    }
    .np-more:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 #000; }

    .np-empty { font-style: italic; color: #666; padding: 12px 4px; }

    .np-btn {
        font-family: 'Teko', sans-serif; font-size: 1.35rem; text-transform: uppercase;
        border: 2px solid #000; box-shadow: 3px 3px 0 #000; padding: 8px 18px;
        cursor: pointer; background: #fff; line-height: 1.1;
    }
    .np-btn:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 #000; }
    .np-btn:disabled { opacity: .5; cursor: default; transform: none; box-shadow: 3px 3px 0 #000; }
    .np-btn-primary { background: var(--np-primary); color: #fff; }
    .np-btn-amber { background: var(--np-amber); color: #1A1F2B; }

    /* Modal — el flex SOLO cuando está visible; si no, el atributo [hidden]
       (display:none) se respeta y el modal no bloquea la página al cargar. */
    .np-modal {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,.6); align-items: center; justify-content: center;
        padding: 20px;
    }
    .np-modal:not([hidden]) { display: flex; }
    .np-modal-box {
        background: var(--np-card); border: 4px solid #000; box-shadow: 8px 8px 0 #000;
        max-width: 640px; width: 100%; max-height: 88vh; overflow: auto; position: relative;
        padding: 24px;
    }
    .np-modal-close {
        position: absolute; top: 10px; right: 14px; font-size: 2rem; line-height: 1;
        background: none; border: none; cursor: pointer; color: #000;
    }
    .np-modal h2 { font-size: 2rem; text-transform: uppercase; margin-bottom: 4px; }
    .np-prod-row {
        border: 2px solid #000; padding: 12px; margin-bottom: 12px;
        display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between;
    }
    .np-prod-name { font-weight: 800; font-size: 1rem; flex: 1 1 200px; }
    .np-prod-attrs { display: flex; flex-wrap: wrap; gap: 6px; }
    .np-attr {
        font-size: .78rem; font-weight: 700; text-transform: uppercase;
        border: 2px solid #000; padding: 2px 8px; background: #f4f1ea;
    }
    .np-modal-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }

    /* PDFs */
    .np-pdf-upload {
        background: var(--np-card); border: 3px solid #000; box-shadow: 4px 4px 0 #000;
        padding: 20px; margin-bottom: 24px; max-width: 640px;
    }
    .np-pdf-upload input[type=file] { display: block; margin: 12px 0; }
    .np-pdf-msg { margin-top: 12px; font-size: .9rem; }
    .np-pdf-msg.ok { color: #1a7f37; font-weight: 700; }
    .np-pdf-msg.err { color: #b32d2e; font-weight: 700; }
    .np-pdf-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 14px; }
    .np-pdf-item {
        background: var(--np-card); border: 3px solid #000; box-shadow: 4px 4px 0 #000;
        padding: 12px; display: flex; flex-direction: column; gap: 8px;
    }
    .np-pdf-name { font-weight: 800; font-size: .95rem; }
    .np-pdf-actions { display: flex; gap: 8px; }
    .np-pdf-actions a, .np-pdf-actions button {
        font-size: .78rem; font-weight: 700; text-transform: uppercase; text-decoration: none;
        border: 2px solid #000; padding: 4px 10px; cursor: pointer; background: #fff; color: #000;
    }
    .np-pdf-del { background: #b32d2e; color: #fff; }
    </style>
    <?php
}

function nakama_prod_render_script() {
    ?>
    <script>
    (function () {
        var app   = document.getElementById('nakama-prod-app');
        if (!app) return;
        var REST  = app.dataset.rest;
        var NONCE = app.dataset.nonce;

        // El endpoint usa ?rest_route=, así que los sub-recursos van con / codificado
        // como parte del valor de rest_route; construimos añadiendo el sufijo.
        function url(path, params) {
            var u = REST + path;
            if (params) {
                Object.keys(params).forEach(function (k) {
                    u += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
                });
            }
            return u + '&_cb=' + Date.now();
        }
        function api(path, opts) {
            opts = opts || {};
            opts.headers = Object.assign({ 'X-WP-Nonce': NONCE }, opts.headers || {});
            return fetch(path, opts).then(function (r) {
                return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
            });
        }
        function esc(s) {
            var d = document.createElement('div');
            d.textContent = (s == null ? '' : String(s));
            return d.innerHTML;
        }

        /* ---- Tabs ---- */
        app.querySelectorAll('.np-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                app.querySelectorAll('.np-tab').forEach(function (t) { t.classList.remove('is-active'); });
                tab.classList.add('is-active');
                var name = tab.dataset.tab;
                app.querySelectorAll('.np-view').forEach(function (v) {
                    v.hidden = (v.dataset.view !== name);
                });
                if (name === 'pdfs') loadPdfs();
            });
        });

        /* ---- Tablero ---- */
        var pages = { processing: 1, '<?php echo esc_js( NAKAMA_PROD_STATUS ); ?>': 1 };

        function columnEl(col) { return app.querySelector('.np-cards[data-column="' + col + '"]'); }
        function moreEl(col) { return app.querySelector('.np-more[data-column="' + col + '"]'); }

        function cardHtml(o) {
            var products = (o.products || []).map(function (p) { return esc(p); }).join(', ');
            var taken = o.taken
                ? '<div class="np-card-taken">👤 ' + esc(o.taken_by) + ' · hace ' + esc(o.taken_age) + '</div>'
                : '';
            return '<div class="np-card" data-id="' + o.id + '">' +
                '<div class="np-card-top"><span class="np-card-num">#' + esc(o.number) + '</span>' +
                '<span class="np-card-age">hace ' + esc(o.age) + '</span></div>' +
                '<span class="np-card-count">' + o.item_count + ' pza' + (o.item_count === 1 ? '' : 's') + '</span>' +
                '<div class="np-card-products">' + products + '</div>' + taken + '</div>';
        }

        function loadColumn(col, append) {
            var cards = columnEl(col);
            if (!append) { cards.innerHTML = '<div class="np-empty">Cargando…</div>'; pages[col] = 1; }
            api(url('/orders', { column: col, page: pages[col] })).then(function (res) {
                if (!res.ok) { cards.innerHTML = '<div class="np-empty">Error al cargar.</div>'; return; }
                var html = (res.data.orders || []).map(cardHtml).join('');
                if (!append) {
                    cards.innerHTML = html || '<div class="np-empty">Sin pedidos.</div>';
                } else {
                    cards.insertAdjacentHTML('beforeend', html);
                }
                moreEl(col).hidden = !res.data.has_more;
            });
        }

        app.querySelectorAll('.np-more').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var col = btn.dataset.column;
                pages[col]++;
                loadColumn(col, true);
            });
        });

        // Clic en tarjeta → detalle.
        app.addEventListener('click', function (e) {
            var card = e.target.closest('.np-card');
            if (card) openDetail(card.dataset.id);
        });

        /* ---- Modal detalle ---- */
        var modal   = document.getElementById('np-modal');
        var content = document.getElementById('np-modal-content');
        document.getElementById('np-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
        function closeModal() { modal.hidden = true; content.innerHTML = ''; }

        function openDetail(id) {
            modal.hidden = false;
            content.innerHTML = '<div class="np-empty">Cargando…</div>';
            api(url('/orders/' + id)).then(function (res) {
                if (!res.ok) { content.innerHTML = '<div class="np-empty">Error.</div>'; return; }
                var o = res.data;
                var rows = (o.products || []).map(function (p) {
                    var attrs = [];
                    if (p.talla)  attrs.push('<span class="np-attr">Talla: ' + esc(p.talla) + '</span>');
                    if (p.estilo) attrs.push('<span class="np-attr">Estilo: ' + esc(p.estilo) + '</span>');
                    if (p.color)  attrs.push('<span class="np-attr">Color: ' + esc(p.color) + '</span>');
                    attrs.push('<span class="np-attr">Cant: ' + p.qty + '</span>');
                    var pdf = p.pdf_url
                        ? '<a class="np-btn np-btn-amber" href="' + esc(p.pdf_url) + '" target="_blank" rel="noopener">Ver patrón (PDF)</a>'
                        : '';
                    return '<div class="np-prod-row"><div class="np-prod-name">' + esc(p.name) + '</div>' +
                        '<div class="np-prod-attrs">' + attrs.join('') + '</div>' + pdf + '</div>';
                }).join('');

                var actions = '';
                if (o.status === 'processing') {
                    var takeLabel = o.taken ? 'Re-tomar pedido' : 'Tomar pedido';
                    actions = '<button class="np-btn" id="np-take" data-id="' + o.id + '">' + takeLabel + '</button>' +
                        '<button class="np-btn np-btn-primary" id="np-finish" data-id="' + o.id + '">Finalizar producción</button>';
                }

                content.innerHTML = '<h2>Pedido #' + esc(o.number) + '</h2>' + rows +
                    '<div class="np-modal-actions">' + actions + '</div>';

                var takeBtn = document.getElementById('np-take');
                if (takeBtn) takeBtn.addEventListener('click', function () {
                    takeBtn.disabled = true;
                    api(url('/take'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: o.id })
                    }).then(function () { closeModal(); loadColumn('processing', false); });
                });
                var finishBtn = document.getElementById('np-finish');
                if (finishBtn) finishBtn.addEventListener('click', function () {
                    finishBtn.disabled = true;
                    api(url('/finish'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: o.id })
                    }).then(function (res) {
                        closeModal();
                        loadColumn('processing', false);
                        loadColumn('<?php echo esc_js( NAKAMA_PROD_STATUS ); ?>', false);
                    });
                });
            });
        }

        /* ---- PDFs ---- */
        var pdfMsg = document.getElementById('np-pdf-msg');
        document.getElementById('np-pdf-submit').addEventListener('click', function () {
            var input = document.getElementById('np-pdf-file');
            if (!input.files || !input.files[0]) { pdfMsg.className = 'np-pdf-msg err'; pdfMsg.textContent = 'Selecciona un PDF.'; return; }
            var fd = new FormData();
            fd.append('file', input.files[0]);
            pdfMsg.className = 'np-pdf-msg'; pdfMsg.textContent = 'Subiendo…';
            api(url('/pdfs'), { method: 'POST', body: fd }).then(function (res) {
                if (res.ok && res.data.success) {
                    pdfMsg.className = 'np-pdf-msg ok';
                    pdfMsg.textContent = '✓ PDF vinculado a "' + res.data.product_name + '".';
                    input.value = '';
                    loadPdfs();
                } else {
                    pdfMsg.className = 'np-pdf-msg err';
                    var msg = (res.data && res.data.message) ? res.data.message : 'Error al subir.';
                    if (res.data && res.data.suggestions && res.data.suggestions.length) {
                        msg += ' ¿Quisiste decir?: ' + res.data.suggestions.map(esc).join(' · ');
                    }
                    pdfMsg.innerHTML = msg;
                }
            });
        });

        function loadPdfs() {
            var list = document.getElementById('np-pdf-list');
            list.innerHTML = '<div class="np-empty">Cargando…</div>';
            api(url('/pdfs')).then(function (res) {
                var pdfs = (res.data && res.data.pdfs) || [];
                if (!pdfs.length) { list.innerHTML = '<div class="np-empty">Aún no hay patrones subidos.</div>'; return; }
                list.innerHTML = pdfs.map(function (p) {
                    return '<div class="np-pdf-item"><div class="np-pdf-name">' + esc(p.product_name) + '</div>' +
                        '<div class="np-pdf-actions">' +
                        '<a href="' + esc(p.pdf_url) + '" target="_blank" rel="noopener">Ver</a>' +
                        '<button class="np-pdf-del" data-id="' + p.id + '">Eliminar</button>' +
                        '</div></div>';
                }).join('');
                list.querySelectorAll('.np-pdf-del').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        if (!confirm('¿Eliminar este patrón?')) return;
                        api(url('/pdfs/' + btn.dataset.id), { method: 'DELETE' }).then(loadPdfs);
                    });
                });
            });
        }

        /* ---- Init ---- */
        loadColumn('processing', false);
        loadColumn('<?php echo esc_js( NAKAMA_PROD_STATUS ); ?>', false);
    })();
    </script>
    <?php
}
