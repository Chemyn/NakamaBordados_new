<?php
/**
 * Plugin Name: Nakama Almacén (SKU Base)
 * Description: Inventario de materia prima compartida. El stock vive en la prenda lisa base (prenda+color+talla); muchas variaciones de diseño descuentan del mismo SKU base al pagarse el pedido. Panel de almacén y alertas de faltantes, con cascada de "agotado" a la tienda.
 * Version: 1.1
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'NAKAMA_WH_CAP', 'access_warehouse' );
define( 'NAKAMA_WH_PAGE', 'nakama-almacen' );

// Compatibilidad con HPOS (pedidos en tablas propias).
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );

/* ============================================================================
 * ACTIVACIÓN: tablas de SKU base + movimientos, y capability a admin/shop_manager
 * ========================================================================== */
function nakama_wh_table() {
    global $wpdb;
    return $wpdb->prefix . 'nakama_base_skus';
}
function nakama_wh_moves_table() {
    global $wpdb;
    return $wpdb->prefix . 'nakama_stock_moves';
}

register_activation_hook( __FILE__, function () {
    global $wpdb;
    $table   = nakama_wh_table();
    $moves   = nakama_wh_moves_table();
    $charset = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    dbDelta( "CREATE TABLE {$table} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        sku_key VARCHAR(191) NOT NULL,
        prenda VARCHAR(80) NOT NULL DEFAULT '',
        color VARCHAR(80) NOT NULL DEFAULT '',
        talla VARCHAR(40) NOT NULL DEFAULT '',
        label VARCHAR(255) NOT NULL DEFAULT '',
        stock INT NOT NULL DEFAULT 0,
        min_stock INT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY (id),
        UNIQUE KEY sku_key (sku_key)
    ) {$charset};" );

    dbDelta( "CREATE TABLE {$moves} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        sku_key VARCHAR(191) NOT NULL,
        delta INT NOT NULL DEFAULT 0,
        reason VARCHAR(40) NOT NULL DEFAULT '',
        order_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY (id),
        KEY sku_key (sku_key),
        KEY order_id (order_id)
    ) {$charset};" );

    foreach ( array( 'administrator', 'shop_manager' ) as $role_name ) {
        $role = get_role( $role_name );
        if ( $role ) {
            $role->add_cap( NAKAMA_WH_CAP );
        }
    }
} );

/* ============================================================================
 * UI DE PERMISOS: checkbox en el perfil de usuario (Usuarios → editar)
 * ========================================================================== */
function nakama_wh_render_user_field( $user ) {
    if ( ! current_user_can( 'edit_users' ) ) {
        return;
    }
    $has = user_can( $user, NAKAMA_WH_CAP );
    wp_nonce_field( 'nakama_wh_user_cap', 'nakama_wh_user_cap_nonce' );
    ?>
    <h2>Almacén (SKU Base)</h2>
    <table class="form-table" role="presentation">
        <tr>
            <th scope="row">Acceso al Panel de Almacén</th>
            <td>
                <label>
                    <input type="checkbox" name="nakama_wh_access" value="1" <?php checked( $has ); ?> />
                    Permitir a este usuario ver y gestionar el inventario de materia prima.
                </label>
            </td>
        </tr>
    </table>
    <?php
}
add_action( 'show_user_profile', 'nakama_wh_render_user_field' );
add_action( 'edit_user_profile', 'nakama_wh_render_user_field' );

function nakama_wh_save_user_field( $user_id ) {
    if ( ! current_user_can( 'edit_users' ) ) {
        return;
    }
    if ( ! isset( $_POST['nakama_wh_user_cap_nonce'] ) ||
         ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nakama_wh_user_cap_nonce'] ) ), 'nakama_wh_user_cap' ) ) {
        return;
    }
    $user = get_userdata( $user_id );
    if ( ! $user ) {
        return;
    }
    if ( ! empty( $_POST['nakama_wh_access'] ) ) {
        $user->add_cap( NAKAMA_WH_CAP );
    } else {
        $user->remove_cap( NAKAMA_WH_CAP );
    }
}
add_action( 'personal_options_update', 'nakama_wh_save_user_field' );
add_action( 'edit_user_profile_update', 'nakama_wh_save_user_field' );

/* ============================================================================
 * NORMALIZACIÓN Y RESOLUCIÓN variación → SKU base
 * La "prenda" es el atributo Estilo (Oversize, Tank Top, Hoodie…); el SKU base
 * es Estilo+Color+Talla. Items sin los tres quedan fuera del sistema (null).
 * ========================================================================== */

/** Normaliza un componente de la clave: sin acentos, MAYÚSCULAS, espacios y
 *  underscores colapsados a un guion. "Acid Wash" → "ACID-WASH". */
function nakama_wh_norm_part( $raw ) {
    $t = remove_accents( (string) $raw );
    $t = strtoupper( trim( $t ) );
    $t = preg_replace( '/[\s_]+/', '-', $t );
    $t = preg_replace( '/-+/', '-', $t );
    return trim( $t, '-' );
}

/**
 * Unifica sinónimos de color a un token canónico en español. Evita que la misma
 * prenda física se duplique como dos SKU base ("Negra" vs "Black"). Si el color
 * no está en el diccionario se devuelve tal cual (no rompe colores nuevos).
 * Ampliable con el filtro 'nakama_wh_color_synonyms' (clave = color normalizado
 * sin acentos/minúsculas, valor = display canónico).
 */
function nakama_wh_color_canonical( $raw ) {
    $raw = trim( (string) $raw );
    if ( '' === $raw ) {
        return $raw;
    }
    $norm = strtolower( remove_accents( $raw ) );
    $norm = preg_replace( '/\s+/', ' ', trim( $norm ) );

    $map = array(
        'negro' => 'Negro', 'negra' => 'Negro', 'black' => 'Negro', 'blk' => 'Negro',
        'blanco' => 'Blanco', 'blanca' => 'Blanco', 'white' => 'Blanco', 'wht' => 'Blanco',
        'rojo' => 'Rojo', 'roja' => 'Rojo', 'red' => 'Rojo',
        'azul' => 'Azul', 'blue' => 'Azul', 'navy' => 'Azul Marino', 'azul marino' => 'Azul Marino',
        'verde' => 'Verde', 'green' => 'Verde',
        'amarillo' => 'Amarillo', 'amarilla' => 'Amarillo', 'yellow' => 'Amarillo',
        'rosa' => 'Rosa', 'rosado' => 'Rosa', 'rosada' => 'Rosa', 'pink' => 'Rosa',
        'gris' => 'Gris', 'gray' => 'Gris', 'grey' => 'Gris',
        'kaki' => 'Kaki', 'caqui' => 'Kaki', 'khaki' => 'Kaki',
        'morado' => 'Morado', 'morada' => 'Morado', 'purpura' => 'Morado', 'purple' => 'Morado',
        'naranja' => 'Naranja', 'orange' => 'Naranja',
        'cafe' => 'Café', 'marron' => 'Café', 'brown' => 'Café',
        'beige' => 'Beige',
        'vino' => 'Vino', 'wine' => 'Vino', 'burgundy' => 'Vino',
    );
    $map = apply_filters( 'nakama_wh_color_synonyms', $map );

    return isset( $map[ $norm ] ) ? $map[ $norm ] : $raw;
}

/** Clave canónica PRENDA-COLOR-TALLA a partir de los valores legibles. El color
 *  se unifica por sinónimos antes de normalizar (Negra/Black → misma clave). */
function nakama_wh_key( $prenda, $color, $talla ) {
    $color = nakama_wh_color_canonical( $color );
    return nakama_wh_norm_part( $prenda ) . '-' . nakama_wh_norm_part( $color ) . '-' . nakama_wh_norm_part( $talla );
}

/** Etiqueta legible "Oversize / Negro / M". */
function nakama_wh_label( $prenda, $color, $talla ) {
    return trim( $prenda ) . ' / ' . trim( $color ) . ' / ' . trim( $talla );
}

/** Lee estilo/color/talla de un WC_Order_Item_Product tolerando los distintos
 *  nombres reales (Size/Talla, Style/Estilo, pa_*). */
function nakama_wh_item_attributes( $item ) {
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

/** Lee estilo/color/talla de una WC_Product_Variation (get_attributes() →
 *  nombre legible del término para taxonomías globales). */
function nakama_wh_variation_attributes( $variation ) {
    $wanted = array(
        'talla'  => array( 'talla', 'size', 'pa_talla' ),
        'estilo' => array( 'estilo', 'style', 'pa_estilo' ),
        'color'  => array( 'color', 'pa_color' ),
    );
    $out = array( 'talla' => '', 'estilo' => '', 'color' => '' );

    foreach ( $variation->get_attributes() as $attr_key => $attr_value ) {
        if ( '' === $attr_value || null === $attr_value ) {
            continue;
        }
        $key = strtolower( str_replace( 'attribute_', '', (string) $attr_key ) );

        // Slug → nombre legible del término si es taxonomía global.
        $display = (string) $attr_value;
        if ( taxonomy_exists( $attr_key ) ) {
            $term = get_term_by( 'slug', $attr_value, $attr_key );
            if ( $term && ! is_wp_error( $term ) ) {
                $display = $term->name;
            }
        }

        foreach ( $wanted as $slot => $aliases ) {
            if ( '' !== $out[ $slot ] ) {
                continue;
            }
            foreach ( $aliases as $alias ) {
                if ( false !== strpos( $key, $alias ) ) {
                    $out[ $slot ] = $display;
                    break 2;
                }
            }
        }
    }
    return $out;
}

/** Estilo del producto padre (para productos de un solo estilo cuyas variaciones
 *  no llevan el atributo Estilo). Devuelve '' si no hay. */
function nakama_wh_parent_estilo( $parent_id ) {
    if ( ! $parent_id ) {
        return '';
    }
    $product = wc_get_product( $parent_id );
    if ( ! $product ) {
        return '';
    }
    foreach ( array( 'pa_estilo', 'estilo', 'pa_style', 'style' ) as $name ) {
        $val = $product->get_attribute( $name );
        if ( '' !== trim( (string) $val ) ) {
            // get_attribute puede devolver "A | B"; tomar el primero.
            $parts = array_map( 'trim', explode( '|', $val ) );
            return $parts[0];
        }
    }
    return '';
}

/** Busca una fila de SKU base por clave. */
function nakama_wh_get_row( $sku_key ) {
    global $wpdb;
    $table = nakama_wh_table();
    return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE sku_key = %s", $sku_key ) );
}

/** Construye la resolución a partir de estilo/color/talla + override opcional.
 *  Devuelve array('key','prenda','color','talla','label') o null. */
function nakama_wh_resolve_parts( $estilo, $color, $talla, $variation_id = 0 ) {
    // 1) Override manual en la variación.
    if ( $variation_id ) {
        $override = get_post_meta( $variation_id, '_nakama_base_sku', true );
        if ( '-' === $override ) {
            return null; // excluido del sistema
        }
        if ( is_string( $override ) && '' !== $override ) {
            $row = nakama_wh_get_row( $override );
            return array(
                'key'    => $override,
                'prenda' => $row ? $row->prenda : '',
                'color'  => $row ? $row->color : '',
                'talla'  => $row ? $row->talla : '',
                'label'  => $row && '' !== $row->label ? $row->label : $override,
            );
        }
    }

    // 2) Fallback de estilo al producto padre.
    if ( '' === trim( (string) $estilo ) ) {
        $variation = $variation_id ? wc_get_product( $variation_id ) : null;
        if ( $variation ) {
            $estilo = nakama_wh_parent_estilo( $variation->get_parent_id() );
        }
    }

    // 3) Sin los tres componentes → fuera del sistema.
    if ( '' === trim( (string) $estilo ) || '' === trim( (string) $color ) || '' === trim( (string) $talla ) ) {
        return null;
    }

    return array(
        'key'    => nakama_wh_key( $estilo, $color, $talla ),
        'prenda' => trim( (string) $estilo ),
        'color'  => trim( (string) $color ),
        'talla'  => trim( (string) $talla ),
        'label'  => nakama_wh_label( $estilo, $color, $talla ),
    );
}

/** Resolución desde una línea de pedido. */
function nakama_wh_resolve_for_item( $item ) {
    $attrs        = nakama_wh_item_attributes( $item );
    $variation_id = method_exists( $item, 'get_variation_id' ) ? (int) $item->get_variation_id() : 0;
    return nakama_wh_resolve_parts( $attrs['estilo'], $attrs['color'], $attrs['talla'], $variation_id );
}

/** Resolución desde una variación del catálogo. */
function nakama_wh_resolve_for_variation( $variation ) {
    if ( ! $variation instanceof WC_Product ) {
        return null;
    }
    $attrs = nakama_wh_variation_attributes( $variation );
    return nakama_wh_resolve_parts( $attrs['estilo'], $attrs['color'], $attrs['talla'], $variation->get_id() );
}

/* ============================================================================
 * STOCK EFECTIVO Y CASCADA
 * ========================================================================== */

/** Mapa sku_key => stock (int) de toda la tabla, cacheado por request. */
function nakama_wh_stock_map( $force = false ) {
    static $map = null;
    if ( null === $map || $force ) {
        global $wpdb;
        $table = nakama_wh_table();
        $map   = array();
        $rows  = $wpdb->get_results( "SELECT sku_key, stock FROM {$table}" );
        foreach ( (array) $rows as $r ) {
            $map[ $r->sku_key ] = (int) $r->stock;
        }
    }
    return $map;
}

/**
 * Stock efectivo de una variación desde el almacén de SKU base.
 * Devuelve array( int|null $stock, string|null $base_sku ):
 *   - null stock  = fuera del sistema o clave aún no capturada → ilimitado/disponible.
 *   - int stock   = existencias reales del SKU base (puede ser 0 o negativo).
 */
function nakama_wh_effective_stock( $variation ) {
    $res = nakama_wh_resolve_for_variation( $variation );
    if ( ! $res ) {
        return array( null, null );
    }
    $map = nakama_wh_stock_map();
    if ( ! array_key_exists( $res['key'], $map ) ) {
        // Resoluble pero aún no capturada: no bloquear la tienda antes de sembrar.
        return array( null, $res['key'] );
    }
    return array( (int) $map[ $res['key'] ], $res['key'] );
}

/**
 * Aplica instock/outofstock a UNA variación según el mapa de stock del almacén,
 * y de paso mantiene el índice inverso _nakama_wh_key. Devuelve 1 si cambió el
 * stock_status, 0 si no. NO activa manage_stock.
 */
function nakama_wh_apply_variation_status( $variation, $map ) {
    $res = nakama_wh_resolve_for_variation( $variation );
    if ( ! $res ) {
        return 0; // fuera del sistema: no tocar
    }
    // Índice inverso clave→variación (para el sync eficiente por pedido/lote).
    if ( (string) get_post_meta( $variation->get_id(), '_nakama_wh_key', true ) !== $res['key'] ) {
        update_post_meta( $variation->get_id(), '_nakama_wh_key', $res['key'] );
    }
    // Agotado solo si la clave está capturada y en 0 o menos.
    $is_out  = array_key_exists( $res['key'], $map ) && (int) $map[ $res['key'] ] <= 0;
    $desired = $is_out ? 'outofstock' : 'instock';
    if ( $variation->get_stock_status() !== $desired ) {
        $variation->set_stock_status( $desired );
        $variation->save();
        return 1;
    }
    return 0;
}

/**
 * Sincroniza el stock_status de las variaciones de Woo (instock/outofstock) para
 * que el checkout nativo y el "bridge" del carrito rechacen agotados.
 *
 * - $only_keys (array): SOLO toca las variaciones de esas claves, resueltas por
 *   el índice inverso _nakama_wh_key (una query de meta + carga de las afectadas).
 *   O(variaciones afectadas), no O(catálogo). Este es el camino de pedidos/lotes.
 * - $only_keys null: barrido COMPLETO del catálogo (solo "Generar desde catálogo"),
 *   que además reconstruye el índice _nakama_wh_key de cada variación.
 *
 * Devuelve cuántas variaciones cambiaron de estado.
 */
function nakama_wh_sync_stock_status( $only_keys = null ) {
    global $wpdb;
    $map     = nakama_wh_stock_map( true );
    $changed = 0;

    if ( is_array( $only_keys ) ) {
        $keys = array_values( array_unique( array_filter( array_map( 'strval', $only_keys ) ) ) );
        if ( empty( $keys ) ) {
            return 0;
        }
        $placeholders = implode( ',', array_fill( 0, count( $keys ), '%s' ) );
        $ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_nakama_wh_key' AND meta_value IN ({$placeholders})",
            $keys
        ) );
    } else {
        $ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product_variation' AND post_status IN ('publish','private')" );
    }

    foreach ( (array) $ids as $vid ) {
        $variation = wc_get_product( (int) $vid );
        if ( ! $variation ) {
            continue;
        }
        $changed += nakama_wh_apply_variation_status( $variation, $map );
    }

    if ( $changed && function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
    return $changed;
}

/** Registra un movimiento de inventario para auditoría. */
function nakama_wh_log_move( $sku_key, $delta, $reason, $order_id = 0 ) {
    global $wpdb;
    $wpdb->insert( nakama_wh_moves_table(), array(
        'sku_key'    => $sku_key,
        'delta'      => (int) $delta,
        'reason'     => $reason,
        'order_id'   => (int) $order_id,
        'user_id'    => (int) get_current_user_id(),
        'created_at' => current_time( 'mysql' ),
    ) );
}

/** Descuento/incremento atómico del stock de un SKU base. Crea la fila si no
 *  existe (auto-registro con stock 0 antes de aplicar el delta). */
function nakama_wh_apply_delta( $res, $delta, $reason, $order_id = 0 ) {
    global $wpdb;
    $table = nakama_wh_table();
    $key   = $res['key'];

    $exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE sku_key = %s", $key ) );
    if ( ! $exists ) {
        $wpdb->insert( $table, array(
            'sku_key'    => $key,
            'prenda'     => isset( $res['prenda'] ) ? $res['prenda'] : '',
            'color'      => isset( $res['color'] ) ? $res['color'] : '',
            'talla'      => isset( $res['talla'] ) ? $res['talla'] : '',
            'label'      => isset( $res['label'] ) ? $res['label'] : $key,
            'stock'      => 0,
            'min_stock'  => 0,
            'updated_at' => current_time( 'mysql' ),
        ) );
        nakama_wh_log_move( $key, 0, 'seed', $order_id );
    }

    $wpdb->query( $wpdb->prepare(
        "UPDATE {$table} SET stock = stock + %d, updated_at = %s WHERE sku_key = %s",
        (int) $delta,
        current_time( 'mysql' ),
        $key
    ) );
    nakama_wh_log_move( $key, (int) $delta, $reason, $order_id );

    return (int) $wpdb->get_var( $wpdb->prepare( "SELECT stock FROM {$table} WHERE sku_key = %s", $key ) );
}

/**
 * Fusiona filas de SKU base que colapsan a la MISMA clave canónica (sinónimos de
 * color). Recomputa la clave desde prenda/color/talla; en cada grupo con >1 fila
 * suma el stock, toma el mínimo mayor, conserva una sola fila con la clave/color
 * canónicos y borra las demás. Repunta los overrides de variación que apuntaban a
 * claves eliminadas. Idempotente. Devuelve cuántas filas se eliminaron (fusionadas).
 */
function nakama_wh_merge_duplicates() {
    global $wpdb;
    $table = nakama_wh_table();
    $rows  = $wpdb->get_results( "SELECT * FROM {$table}" );
    if ( empty( $rows ) ) {
        return 0;
    }

    // Agrupar por clave canónica recomputada.
    $groups = array();
    foreach ( $rows as $r ) {
        $canon = nakama_wh_key( $r->prenda, $r->color, $r->talla );
        $groups[ $canon ][] = $r;
    }

    $merged = 0;
    foreach ( $groups as $canon => $group ) {
        // Nada que fusionar si es una sola fila ya con la clave canónica.
        if ( count( $group ) === 1 && $group[0]->sku_key === $canon ) {
            continue;
        }

        // Elegir la fila superviviente: la que ya tenga la clave canónica, si no la primera.
        $survivor = $group[0];
        foreach ( $group as $r ) {
            if ( $r->sku_key === $canon ) {
                $survivor = $r;
                break;
            }
        }

        $total_stock = 0;
        $max_min     = 0;
        $canon_color = nakama_wh_color_canonical( $survivor->color );
        foreach ( $group as $r ) {
            $total_stock += (int) $r->stock;
            $max_min      = max( $max_min, (int) $r->min_stock );
        }

        // Actualizar la superviviente a la forma canónica con el stock sumado.
        $wpdb->update( $table, array(
            'sku_key'    => $canon,
            'color'      => $canon_color,
            'label'      => nakama_wh_label( $survivor->prenda, $canon_color, $survivor->talla ),
            'stock'      => $total_stock,
            'min_stock'  => $max_min,
            'updated_at' => current_time( 'mysql' ),
        ), array( 'id' => (int) $survivor->id ) );

        // Borrar las demás filas del grupo y repuntar sus overrides al canónico.
        foreach ( $group as $r ) {
            if ( (int) $r->id === (int) $survivor->id ) {
                continue;
            }
            if ( $r->sku_key !== $canon ) {
                $wpdb->update( $wpdb->postmeta,
                    array( 'meta_value' => $canon ),
                    array( 'meta_key' => '_nakama_base_sku', 'meta_value' => $r->sku_key )
                );
            }
            $wpdb->delete( $table, array( 'id' => (int) $r->id ) );
            $merged++;
        }

        if ( count( $group ) > 1 ) {
            nakama_wh_log_move( $canon, 0, 'merge' );
        }
    }

    return $merged;
}

/* ============================================================================
 * HOOKS DE PEDIDO: descontar al pagar, devolver al cancelar/reembolsar
 * ========================================================================== */
// El stock vive en el SKU base; se desactiva la contabilidad por variación de
// Woo core para que no haya doble descuento (ninguna variación usa manage_stock).
add_filter( 'woocommerce_can_reduce_order_stock', '__return_false' );
add_filter( 'woocommerce_can_restore_order_stock', '__return_false' );

add_action( 'woocommerce_payment_complete', 'nakama_wh_on_paid', 20 );
add_action( 'woocommerce_order_status_processing', 'nakama_wh_on_paid', 20 );
add_action( 'woocommerce_order_status_cancelled', 'nakama_wh_on_unpaid', 20 );
add_action( 'woocommerce_order_status_refunded', 'nakama_wh_on_unpaid', 20 );
add_action( 'woocommerce_order_status_failed', 'nakama_wh_on_unpaid', 20 );

function nakama_wh_on_paid( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }
    if ( 'yes' === $order->get_meta( '_nakama_wh_reduced' ) ) {
        return; // idempotente: payment_complete + status_processing
    }

    $lines        = array();
    $affected     = array();
    $note_parts   = array();

    foreach ( $order->get_items() as $item ) {
        $res = nakama_wh_resolve_for_item( $item );
        if ( ! $res ) {
            continue;
        }
        $qty = (int) $item->get_quantity();
        if ( $qty <= 0 ) {
            continue;
        }
        $remaining = nakama_wh_apply_delta( $res, -$qty, 'order', $order->get_id() );
        $lines[]    = array( 'key' => $res['key'], 'qty' => $qty );
        $affected[] = $res['key'];
        $note_parts[] = sprintf( '%s x%d (quedan %d)', $res['key'], $qty, $remaining );
    }

    if ( empty( $lines ) ) {
        // Nada trackeable: marcar para no re-evaluar en cada transición.
        $order->update_meta_data( '_nakama_wh_reduced', 'yes' );
        $order->update_meta_data( '_nakama_wh_lines', wp_json_encode( array() ) );
        $order->save();
        return;
    }

    $order->update_meta_data( '_nakama_wh_reduced', 'yes' );
    $order->update_meta_data( '_nakama_wh_lines', wp_json_encode( $lines ) );
    $order->save();

    $order->add_order_note( 'Almacén: descontado ' . implode( ', ', $note_parts ) . '.' );

    nakama_wh_sync_stock_status( array_values( array_unique( $affected ) ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
}

function nakama_wh_on_unpaid( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }
    if ( 'yes' !== $order->get_meta( '_nakama_wh_reduced' ) ) {
        return; // nunca se descontó
    }

    $lines = json_decode( (string) $order->get_meta( '_nakama_wh_lines' ), true );
    if ( ! is_array( $lines ) || empty( $lines ) ) {
        $order->update_meta_data( '_nakama_wh_reduced', 'restored' );
        $order->save();
        return;
    }

    $affected   = array();
    $note_parts = array();
    foreach ( $lines as $ln ) {
        if ( empty( $ln['key'] ) ) {
            continue;
        }
        $qty = (int) $ln['qty'];
        $res = array( 'key' => $ln['key'] );
        $row = nakama_wh_get_row( $ln['key'] );
        if ( $row ) {
            $res['prenda'] = $row->prenda;
            $res['color']  = $row->color;
            $res['talla']  = $row->talla;
            $res['label']  = $row->label;
        }
        $remaining = nakama_wh_apply_delta( $res, $qty, 'restock', $order->get_id() );
        $affected[]   = $ln['key'];
        $note_parts[] = sprintf( '%s +%d (quedan %d)', $ln['key'], $qty, $remaining );
    }

    $order->update_meta_data( '_nakama_wh_reduced', 'restored' );
    $order->save();

    if ( $note_parts ) {
        $order->add_order_note( 'Almacén: devuelto ' . implode( ', ', $note_parts ) . '.' );
    }

    nakama_wh_sync_stock_status( array_values( array_unique( $affected ) ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
}

/* ============================================================================
 * REST API: nakama/v1/warehouse/*
 * ========================================================================== */
function nakama_wh_permission() {
    return current_user_can( NAKAMA_WH_CAP );
}

/** Añade el campo calculado 'status' (ok|low|out) a una fila. */
function nakama_wh_row_out( $row ) {
    $stock = (int) $row->stock;
    $min   = (int) $row->min_stock;
    $status = 'ok';
    if ( $stock <= 0 ) {
        $status = 'out';
    } elseif ( $stock <= $min && $min > 0 ) {
        $status = 'low';
    }
    return array(
        'id'        => (int) $row->id,
        'sku_key'   => $row->sku_key,
        'prenda'    => $row->prenda,
        'color'     => $row->color,
        'talla'     => $row->talla,
        'label'     => $row->label,
        'stock'     => $stock,
        'min_stock' => $min,
        'status'    => $status,
    );
}

add_action( 'rest_api_init', function () {
    $perm = 'nakama_wh_permission';

    // Chequeo de acceso para el frontend headless (JWT). __return_true + gate interno.
    register_rest_route( 'nakama/v1', '/warehouse/access', array(
        'methods'             => 'GET',
        'callback'            => function () {
            return new WP_REST_Response( array( 'can' => current_user_can( NAKAMA_WH_CAP ) ), 200 );
        },
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'nakama/v1', '/warehouse/items', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'nakama_wh_rest_items',
            'permission_callback' => $perm,
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'nakama_wh_rest_upsert',
            'permission_callback' => $perm,
        ),
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/items/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'nakama_wh_rest_delete',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/adjust', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_wh_rest_adjust',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/bulk', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_wh_rest_bulk',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/sync', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_wh_rest_sync',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/alerts', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_wh_rest_alerts',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/generate', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_wh_rest_generate',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/variation', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_wh_rest_variation',
        'permission_callback' => $perm,
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/override', array(
        'methods'             => 'POST',
        'callback'            => 'nakama_wh_rest_override',
        'permission_callback' => $perm,
    ) );
} );

/** GET /warehouse/items?search=&alerts=0|1 */
function nakama_wh_rest_items( WP_REST_Request $request ) {
    global $wpdb;
    $table  = nakama_wh_table();
    $search = trim( (string) $request->get_param( 'search' ) );
    $alerts = (int) $request->get_param( 'alerts' );

    $where = '1=1';
    $args  = array();
    if ( '' !== $search ) {
        $like  = '%' . $wpdb->esc_like( $search ) . '%';
        $where .= ' AND (sku_key LIKE %s OR label LIKE %s OR prenda LIKE %s OR color LIKE %s OR talla LIKE %s)';
        $args   = array( $like, $like, $like, $like, $like );
    }
    if ( 1 === $alerts ) {
        $where .= ' AND (stock <= 0 OR (min_stock > 0 AND stock <= min_stock))';
    }

    $sql  = "SELECT * FROM {$table} WHERE {$where} ORDER BY prenda ASC, color ASC, talla ASC";
    $rows = $args ? $wpdb->get_results( $wpdb->prepare( $sql, $args ) ) : $wpdb->get_results( $sql );

    $items = array_map( 'nakama_wh_row_out', (array) $rows );
    return new WP_REST_Response( array( 'items' => $items ), 200 );
}

/** POST /warehouse/items — upsert por prenda/color/talla. */
function nakama_wh_rest_upsert( WP_REST_Request $request ) {
    global $wpdb;
    $table  = nakama_wh_table();
    $prenda = trim( (string) $request->get_param( 'prenda' ) );
    $color  = trim( (string) $request->get_param( 'color' ) );
    $talla  = trim( (string) $request->get_param( 'talla' ) );

    if ( '' === $prenda || '' === $color || '' === $talla ) {
        return new WP_Error( 'bad_input', 'Prenda, color y talla son obligatorios.', array( 'status' => 400 ) );
    }

    $stock = (int) $request->get_param( 'stock' );
    $min   = (int) $request->get_param( 'min_stock' );
    $key   = nakama_wh_key( $prenda, $color, $talla );
    $label = trim( (string) $request->get_param( 'label' ) );
    if ( '' === $label ) {
        $label = nakama_wh_label( $prenda, $color, $talla );
    }

    $existing = nakama_wh_get_row( $key );
    $data = array(
        'sku_key'    => $key,
        'prenda'     => $prenda,
        'color'      => $color,
        'talla'      => $talla,
        'label'      => $label,
        'stock'      => $stock,
        'min_stock'  => max( 0, $min ),
        'updated_at' => current_time( 'mysql' ),
    );

    if ( $existing ) {
        $delta = $stock - (int) $existing->stock;
        $wpdb->update( $table, $data, array( 'id' => (int) $existing->id ) );
        if ( 0 !== $delta ) {
            nakama_wh_log_move( $key, $delta, 'manual' );
        }
    } else {
        $wpdb->insert( $table, $data );
        nakama_wh_log_move( $key, $stock, 'manual' );
    }

    nakama_wh_sync_stock_status( array( $key ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }

    $row = nakama_wh_get_row( $key );
    return new WP_REST_Response( nakama_wh_row_out( $row ), 200 );
}

/** POST /warehouse/adjust — { id, delta } o { id, stock } (set absoluto). */
function nakama_wh_rest_adjust( WP_REST_Request $request ) {
    global $wpdb;
    $table = nakama_wh_table();
    $id    = (int) $request->get_param( 'id' );
    $row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) );
    if ( ! $row ) {
        return new WP_Error( 'not_found', 'SKU base no encontrado.', array( 'status' => 404 ) );
    }

    $has_min = null !== $request->get_param( 'min_stock' );
    if ( $has_min ) {
        $min = max( 0, (int) $request->get_param( 'min_stock' ) );
        $wpdb->update( $table, array( 'min_stock' => $min, 'updated_at' => current_time( 'mysql' ) ), array( 'id' => $id ) );
    }

    if ( null !== $request->get_param( 'stock' ) ) {
        $new   = (int) $request->get_param( 'stock' );
        $delta = $new - (int) $row->stock;
        $wpdb->update( $table, array( 'stock' => $new, 'updated_at' => current_time( 'mysql' ) ), array( 'id' => $id ) );
        if ( 0 !== $delta ) {
            nakama_wh_log_move( $row->sku_key, $delta, 'manual' );
        }
    } elseif ( null !== $request->get_param( 'delta' ) ) {
        $delta = (int) $request->get_param( 'delta' );
        if ( 0 !== $delta ) {
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$table} SET stock = stock + %d, updated_at = %s WHERE id = %d",
                $delta, current_time( 'mysql' ), $id
            ) );
            nakama_wh_log_move( $row->sku_key, $delta, 'manual' );
        }
    } elseif ( ! $has_min ) {
        return new WP_Error( 'bad_input', 'Falta stock, delta o min_stock.', array( 'status' => 400 ) );
    }

    nakama_wh_sync_stock_status( array( $row->sku_key ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }

    $fresh = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) );
    return new WP_REST_Response( nakama_wh_row_out( $fresh ), 200 );
}

/**
 * POST /warehouse/bulk — aplica hasta 50 cambios de una vez, SOLO a la tabla (sin
 * sincronizar el stock_status: eso lo hace /sync una sola vez al final del lote).
 * Body: { items: [ { id, stock?, min_stock? }, … ] }.
 * Devuelve { items: [filas actualizadas], keys: [sku_key afectadas] }.
 */
function nakama_wh_rest_bulk( WP_REST_Request $request ) {
    global $wpdb;
    $table = nakama_wh_table();
    $input = $request->get_param( 'items' );
    if ( ! is_array( $input ) || empty( $input ) ) {
        return new WP_Error( 'bad_input', 'Sin cambios que aplicar.', array( 'status' => 400 ) );
    }
    $input = array_slice( $input, 0, 50 ); // cap defensivo

    $out_rows = array();
    $keys     = array();
    $now      = current_time( 'mysql' );

    foreach ( $input as $chg ) {
        $id  = isset( $chg['id'] ) ? (int) $chg['id'] : 0;
        $row = $id ? $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) ) : null;
        if ( ! $row ) {
            continue;
        }

        $fields = array( 'updated_at' => $now );
        if ( array_key_exists( 'min_stock', $chg ) && null !== $chg['min_stock'] ) {
            $fields['min_stock'] = max( 0, (int) $chg['min_stock'] );
        }
        if ( array_key_exists( 'stock', $chg ) && null !== $chg['stock'] ) {
            $new   = (int) $chg['stock'];
            $delta = $new - (int) $row->stock;
            $fields['stock'] = $new;
            if ( 0 !== $delta ) {
                nakama_wh_log_move( $row->sku_key, $delta, 'manual' );
            }
        }
        $wpdb->update( $table, $fields, array( 'id' => $id ) );

        $keys[]    = $row->sku_key;
        $fresh     = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) );
        $out_rows[] = nakama_wh_row_out( $fresh );
    }

    return new WP_REST_Response( array(
        'items' => $out_rows,
        'keys'  => array_values( array_unique( $keys ) ),
    ), 200 );
}

/**
 * POST /warehouse/sync — sincroniza la cascada de "agotado" UNA sola vez. Con
 * { keys: [...] } solo toca esas claves (vía índice); sin keys, barrido completo.
 */
function nakama_wh_rest_sync( WP_REST_Request $request ) {
    $keys    = $request->get_param( 'keys' );
    $only    = is_array( $keys ) && ! empty( $keys ) ? array_map( 'strval', $keys ) : null;
    $changed = nakama_wh_sync_stock_status( $only );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
    return new WP_REST_Response( array( 'changed' => (int) $changed ), 200 );
}

/** DELETE /warehouse/items/{id} */
function nakama_wh_rest_delete( WP_REST_Request $request ) {
    global $wpdb;
    $table = nakama_wh_table();
    $id    = (int) $request['id'];
    $row   = $wpdb->get_row( $wpdb->prepare( "SELECT sku_key FROM {$table} WHERE id = %d", $id ) );
    if ( ! $row ) {
        return new WP_Error( 'not_found', 'SKU base no encontrado.', array( 'status' => 404 ) );
    }
    $wpdb->delete( $table, array( 'id' => $id ) );
    nakama_wh_sync_stock_status( array( $row->sku_key ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/** GET /warehouse/alerts — agotados y por debajo del umbral. */
function nakama_wh_rest_alerts() {
    global $wpdb;
    $table = nakama_wh_table();
    $rows  = $wpdb->get_results( "SELECT * FROM {$table} WHERE stock <= 0 OR (min_stock > 0 AND stock <= min_stock) ORDER BY stock ASC, prenda ASC" );
    $items = array_map( 'nakama_wh_row_out', (array) $rows );
    return new WP_REST_Response( array( 'items' => $items ), 200 );
}

/**
 * POST /warehouse/generate — fusiona duplicados, y en UN SOLO barrido del catálogo
 * siembra las claves faltantes, (re)construye el índice _nakama_wh_key y aplica la
 * cascada de "agotado". Antes hacía dos barridos (sembrar + sincronizar) lo que en
 * catálogos grandes agotaba el tiempo/memoria de PHP. Devuelve created/skipped/merged.
 */
function nakama_wh_rest_generate() {
    global $wpdb;
    $table = nakama_wh_table();

    // Catálogos grandes: dar margen de tiempo y memoria (best-effort; algunos hosts
    // ignoran set_time_limit, pero no hace daño).
    if ( function_exists( 'set_time_limit' ) ) {
        @set_time_limit( 0 );
    }
    if ( function_exists( 'wp_raise_memory_limit' ) ) {
        wp_raise_memory_limit( 'admin' );
    }

    try {
        // 1) Fusionar SKU base duplicados por sinónimos de color (suma stock).
        $merged = nakama_wh_merge_duplicates();

        // Mapa de stock actual (tras la fusión) para decidir agotado sin re-consultar.
        $map = nakama_wh_stock_map( true );

        $ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product_variation' AND post_status IN ('publish','private')" );

        $created = 0;
        $skipped = 0;
        foreach ( (array) $ids as $vid ) {
            $variation = wc_get_product( (int) $vid );
            if ( ! $variation ) {
                continue;
            }
            $res = nakama_wh_resolve_for_variation( $variation );
            if ( ! $res ) {
                $skipped++;
                continue;
            }
            $key = $res['key'];

            // Sembrar la clave si aún no existe (stock 0).
            if ( ! array_key_exists( $key, $map ) ) {
                $wpdb->insert( $table, array(
                    'sku_key'    => $key,
                    'prenda'     => $res['prenda'],
                    'color'      => $res['color'],
                    'talla'      => $res['talla'],
                    'label'      => $res['label'],
                    'stock'      => 0,
                    'min_stock'  => 0,
                    'updated_at' => current_time( 'mysql' ),
                ) );
                nakama_wh_log_move( $key, 0, 'seed' );
                $map[ $key ] = 0;
                $created++;
            }

            // Índice inverso clave→variación (para el sync eficiente por pedido/lote).
            if ( (string) get_post_meta( $vid, '_nakama_wh_key', true ) !== $key ) {
                update_post_meta( $vid, '_nakama_wh_key', $key );
            }

            // Cascada de agotado en la misma pasada.
            $desired = ( (int) $map[ $key ] <= 0 ) ? 'outofstock' : 'instock';
            if ( $variation->get_stock_status() !== $desired ) {
                $variation->set_stock_status( $desired );
                $variation->save();
            }
        }

        if ( function_exists( 'nakama_products_bump_cache' ) ) {
            nakama_products_bump_cache();
        }

        return new WP_REST_Response( array( 'created' => $created, 'skipped' => $skipped, 'merged' => $merged ), 200 );
    } catch ( \Throwable $e ) {
        return new WP_Error( 'generate_failed', 'Error al generar: ' . $e->getMessage(), array( 'status' => 500 ) );
    }
}

/** GET /warehouse/variation?id= — clave resuelta + override actual. */
function nakama_wh_rest_variation( WP_REST_Request $request ) {
    $id = (int) $request->get_param( 'id' );
    $variation = $id ? wc_get_product( $id ) : null;
    if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
        return new WP_Error( 'not_found', 'Variación no encontrada.', array( 'status' => 404 ) );
    }
    $override = get_post_meta( $id, '_nakama_base_sku', true );
    $res      = nakama_wh_resolve_for_variation( $variation );
    return new WP_REST_Response( array(
        'variation_id' => $id,
        'name'         => $variation->get_name(),
        'resolved_key' => $res ? $res['key'] : null,
        'override'     => is_string( $override ) ? $override : '',
    ), 200 );
}

/** POST /warehouse/override — { variation_id, sku_key|''|'-' }. */
function nakama_wh_rest_override( WP_REST_Request $request ) {
    $id  = (int) $request->get_param( 'variation_id' );
    $val = (string) $request->get_param( 'sku_key' );
    if ( ! $id ) {
        return new WP_Error( 'bad_input', 'Falta variation_id.', array( 'status' => 400 ) );
    }
    if ( '' === $val ) {
        delete_post_meta( $id, '_nakama_base_sku' );
    } else {
        update_post_meta( $id, '_nakama_base_sku', sanitize_text_field( $val ) );
    }

    // Aplicar el estado directo a esta variación: refresca su índice _nakama_wh_key
    // (el override cambió su resolución) y actualiza su stock_status.
    $variation = wc_get_product( $id );
    if ( $variation ) {
        if ( '-' === $val ) {
            // Excluida del sistema: quitar del índice para que no la toque el sync.
            delete_post_meta( $id, '_nakama_wh_key' );
        } else {
            nakama_wh_apply_variation_status( $variation, nakama_wh_stock_map( true ) );
        }
    }
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }

    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/* ============================================================================
 * PÁGINA DE ALMACÉN (wp-admin, pantalla completa)
 * ========================================================================== */
add_action( 'admin_menu', function () {
    add_menu_page(
        'Almacén',
        'Almacén',
        NAKAMA_WH_CAP,
        NAKAMA_WH_PAGE,
        'nakama_wh_render_page',
        'dashicons-archive',
        57
    );
} );

add_action( 'admin_head', function () {
    $screen = get_current_screen();
    if ( ! $screen || 'toplevel_page_' . NAKAMA_WH_PAGE !== $screen->id ) {
        return;
    }
    echo '<style>
        #adminmenumain, #wpfooter, #screen-meta, #screen-meta-links { display:none !important; }
        #wpcontent, #wpbody-content { margin-left:0 !important; padding-left:0 !important; }
        #wpbody-content { padding-bottom:0 !important; }
        html.wp-toolbar { padding-top:32px; }
    </style>';
} );

function nakama_wh_render_page() {
    if ( ! current_user_can( NAKAMA_WH_CAP ) ) {
        wp_die( 'No tienes permiso para acceder al Panel de Almacén.' );
    }
    $rest_base = home_url( '/?rest_route=/nakama/v1/warehouse' );
    $nonce     = wp_create_nonce( 'wp_rest' );
    ?>
    <div id="nakama-wh-app"
         data-rest="<?php echo esc_attr( $rest_base ); ?>"
         data-nonce="<?php echo esc_attr( $nonce ); ?>">

        <header class="nw-header">
            <h1>Almacén — Materia Prima</h1>
            <div class="nw-tabs">
                <button class="nw-tab is-active" data-tab="stock">Almacén</button>
                <button class="nw-tab" data-tab="alerts">Alertas <span class="nw-badge" id="nw-alert-count" hidden>0</span></button>
            </div>
        </header>

        <section class="nw-view" data-view="stock">
            <div class="nw-toolbar">
                <input type="search" id="nw-search" placeholder="Buscar prenda, color, talla…" />
                <button class="nw-btn" id="nw-generate">Generar desde catálogo</button>
            </div>

            <form class="nw-new" id="nw-new-form">
                <input type="text" id="nw-new-prenda" placeholder="Prenda (Estilo)" required />
                <input type="text" id="nw-new-color" placeholder="Color" required />
                <input type="text" id="nw-new-talla" placeholder="Talla" required />
                <input type="number" id="nw-new-stock" placeholder="Stock" value="0" />
                <input type="number" id="nw-new-min" placeholder="Mínimo" value="0" />
                <button class="nw-btn nw-btn-primary" type="submit">Añadir</button>
            </form>

            <div class="nw-table-wrap">
                <table class="nw-table" id="nw-table">
                    <thead>
                        <tr>
                            <th>SKU base</th><th>Prenda</th><th>Color</th><th>Talla</th>
                            <th>Stock</th><th>Mínimo</th><th>Estado</th><th></th>
                        </tr>
                    </thead>
                    <tbody id="nw-tbody"><tr><td colspan="8" class="nw-empty">Cargando…</td></tr></tbody>
                </table>
            </div>
        </section>

        <section class="nw-view" data-view="alerts" hidden>
            <div class="nw-table-wrap">
                <table class="nw-table">
                    <thead>
                        <tr><th>SKU base</th><th>Prenda</th><th>Color</th><th>Talla</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th></th></tr>
                    </thead>
                    <tbody id="nw-alerts-tbody"><tr><td colspan="8" class="nw-empty">Cargando…</td></tr></tbody>
                </table>
            </div>
        </section>
    </div>

    <?php nakama_wh_render_styles(); ?>
    <?php nakama_wh_render_script(); ?>
    <?php
}

function nakama_wh_render_styles() {
    ?>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Teko:wght@500;600;700&display=swap');

    #nakama-wh-app {
        --nw-primary: #E3000F;
        --nw-amber:   #FBBF24;
        --nw-ink:     #0A0A0A;
        --nw-paper:   #f4f1ea;
        --nw-card:    #ffffff;
        font-family: 'Inter', system-ui, sans-serif;
        color: var(--nw-ink);
        background:
            radial-gradient(#d5d1c8 1px, transparent 1px) 0 0 / 20px 20px,
            var(--nw-paper);
        min-height: calc(100vh - 32px);
        margin: 0 0 0 -20px;
        padding: 0 0 40px;
        box-sizing: border-box;
    }
    #nakama-wh-app *, #nakama-wh-app *::before, #nakama-wh-app *::after { box-sizing: border-box; }
    #nakama-wh-app h1 { font-family: 'Teko', sans-serif; letter-spacing: .5px; margin: 0; }

    .nw-header {
        background: var(--nw-ink);
        border-bottom: 4px solid var(--nw-primary);
        padding: 14px 24px;
        display: flex; flex-wrap: wrap; gap: 14px 24px;
        align-items: center; justify-content: space-between;
        position: sticky; top: 32px; z-index: 10;
    }
    .nw-header h1 { color: #fff; font-size: 2.4rem; line-height: 1; text-transform: uppercase; }
    .nw-tabs { display: flex; gap: 10px; }
    .nw-tab {
        font-family: 'Teko', sans-serif; font-size: 1.3rem; text-transform: uppercase;
        padding: 6px 18px; background: #fff; color: var(--nw-ink);
        border: 2px solid #000; box-shadow: 3px 3px 0 var(--nw-primary);
        cursor: pointer; line-height: 1.1;
    }
    .nw-tab.is-active { background: var(--nw-primary); color: #fff; box-shadow: 3px 3px 0 #000; }
    .nw-badge { display: inline-block; background: #000; color: #fff; font-family: 'Inter'; font-size: .7rem; padding: 1px 6px; margin-left: 4px; }

    .nw-view { padding: 24px; }
    .nw-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
    .nw-toolbar input[type=search] {
        flex: 1 1 260px; padding: 8px 12px; border: 2px solid #000; font-size: 1rem; background: #fff;
    }

    .nw-new {
        display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;
        background: var(--nw-card); border: 3px solid #000; box-shadow: 4px 4px 0 #000; padding: 14px;
    }
    .nw-new input { padding: 8px 10px; border: 2px solid #000; font-size: .95rem; background: #fff; }
    .nw-new input[type=text] { flex: 1 1 140px; }
    .nw-new input[type=number] { width: 90px; }

    .nw-btn {
        font-family: 'Teko', sans-serif; font-size: 1.25rem; text-transform: uppercase;
        border: 2px solid #000; box-shadow: 3px 3px 0 #000; padding: 6px 16px;
        cursor: pointer; background: #fff; line-height: 1.1;
    }
    .nw-btn:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 #000; }
    .nw-btn:disabled { opacity: .5; cursor: default; transform: none; box-shadow: 3px 3px 0 #000; }
    .nw-btn-primary { background: var(--nw-primary); color: #fff; }
    .nw-btn-mini {
        font-family: 'Inter'; font-size: .9rem; font-weight: 800; padding: 2px 9px;
        border: 2px solid #000; background: #fff; cursor: pointer; line-height: 1.2;
    }
    .nw-btn-mini:hover { background: #000; color: #fff; }
    .nw-btn-del { color: #b32d2e; border-color: #b32d2e; }
    .nw-btn-del:hover { background: #b32d2e; color: #fff; }

    .nw-table-wrap { overflow-x: auto; background: var(--nw-card); border: 3px solid #000; box-shadow: 4px 4px 0 #000; }
    .nw-table { width: 100%; border-collapse: collapse; min-width: 720px; }
    .nw-table th, .nw-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2ded3; font-size: .92rem; }
    .nw-table th { background: #1A1F2B; color: #fff; font-size: .78rem; text-transform: uppercase; letter-spacing: .5px; }
    .nw-table tr:last-child td { border-bottom: none; }
    .nw-table .nw-key { font-family: 'Teko', sans-serif; font-size: 1.1rem; }
    .nw-stock-cell { display: flex; align-items: center; gap: 6px; }
    .nw-stock-cell input { width: 66px; padding: 4px 6px; border: 2px solid #000; text-align: center; font-weight: 700; }
    .nw-min-cell input { width: 60px; padding: 4px 6px; border: 2px solid #000; text-align: center; }

    .nw-pill { display: inline-block; font-size: .72rem; font-weight: 800; text-transform: uppercase; padding: 2px 9px; border: 2px solid #000; }
    .nw-pill.ok  { background: #d7f5dd; }
    .nw-pill.low { background: var(--nw-amber); color: #1A1F2B; }
    .nw-pill.out { background: var(--nw-primary); color: #fff; }

    .nw-empty { font-style: italic; color: #666; padding: 14px; text-align: center; }
    .nw-msg { margin: 12px 0; font-weight: 700; }
    .nw-msg.ok { color: #1a7f37; }
    .nw-msg.err { color: #b32d2e; }
    </style>
    <?php
}

function nakama_wh_render_script() {
    ?>
    <script>
    (function () {
        var app = document.getElementById('nakama-wh-app');
        if (!app) return;
        var REST  = app.dataset.rest;
        var NONCE = app.dataset.nonce;

        function url(path, params) {
            var u = REST + path;
            if (params) {
                Object.keys(params).forEach(function (k) {
                    if (params[k] === '' || params[k] == null) return;
                    u += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
                });
            }
            return u + '&_cb=' + Date.now();
        }
        function api(path, opts) {
            opts = opts || {};
            opts.headers = Object.assign({ 'X-WP-Nonce': NONCE }, opts.headers || {});
            return fetch(path, opts).then(function (r) {
                return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; })
                    .catch(function () { return { ok: r.ok, status: r.status, data: {} }; });
            });
        }
        function esc(s) {
            var d = document.createElement('div');
            d.textContent = (s == null ? '' : String(s));
            return d.innerHTML;
        }

        /* ---- Tabs ---- */
        app.querySelectorAll('.nw-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                app.querySelectorAll('.nw-tab').forEach(function (t) { t.classList.remove('is-active'); });
                tab.classList.add('is-active');
                var name = tab.dataset.tab;
                app.querySelectorAll('.nw-view').forEach(function (v) { v.hidden = (v.dataset.view !== name); });
                if (name === 'alerts') loadAlerts();
            });
        });

        /* ---- Fila de la tabla ---- */
        function rowHtml(it) {
            return '<tr data-id="' + it.id + '" data-key="' + esc(it.sku_key) + '">' +
                '<td class="nw-key">' + esc(it.sku_key) + '</td>' +
                '<td>' + esc(it.prenda) + '</td>' +
                '<td>' + esc(it.color) + '</td>' +
                '<td>' + esc(it.talla) + '</td>' +
                '<td><div class="nw-stock-cell">' +
                    '<button class="nw-btn-mini nw-dec">−</button>' +
                    '<input type="number" class="nw-stock" value="' + it.stock + '" />' +
                    '<button class="nw-btn-mini nw-inc">+</button>' +
                '</div></td>' +
                '<td class="nw-min-cell"><input type="number" class="nw-min" value="' + it.min_stock + '" /></td>' +
                '<td><span class="nw-pill ' + it.status + '">' +
                    (it.status === 'out' ? 'Agotado' : it.status === 'low' ? 'Bajo' : 'OK') + '</span></td>' +
                '<td><button class="nw-btn-mini nw-btn-del nw-del">Eliminar</button></td>' +
            '</tr>';
        }

        function bindRow(tr) {
            var id = tr.dataset.id;
            function adjust(body) {
                api(url('/adjust'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.assign({ id: Number(id) }, body))
                }).then(function (res) { if (res.ok) replaceRow(tr, res.data); });
            }
            tr.querySelector('.nw-inc').addEventListener('click', function () { adjust({ delta: 1 }); });
            tr.querySelector('.nw-dec').addEventListener('click', function () { adjust({ delta: -1 }); });
            tr.querySelector('.nw-stock').addEventListener('change', function () { adjust({ stock: Number(this.value) }); });
            tr.querySelector('.nw-min').addEventListener('change', function () { adjust({ min_stock: Number(this.value) }); });
            tr.querySelector('.nw-del').addEventListener('click', function () {
                if (!confirm('¿Eliminar este SKU base?')) return;
                api(url('/items/' + id), { method: 'DELETE' }).then(function (res) { if (res.ok) tr.remove(); });
            });
        }

        function replaceRow(tr, it) {
            var tmp = document.createElement('tbody');
            tmp.innerHTML = rowHtml(it);
            var fresh = tmp.firstChild;
            tr.parentNode.replaceChild(fresh, tr);
            bindRow(fresh);
        }

        /* ---- Almacén ---- */
        var tbody = document.getElementById('nw-tbody');
        function loadItems() {
            var q = document.getElementById('nw-search').value.trim();
            tbody.innerHTML = '<tr><td colspan="8" class="nw-empty">Cargando…</td></tr>';
            api(url('/items', { search: q })).then(function (res) {
                var items = (res.data && res.data.items) || [];
                if (!items.length) { tbody.innerHTML = '<tr><td colspan="8" class="nw-empty">Sin SKU base. Usa "Generar desde catálogo" o añade uno.</td></tr>'; return; }
                tbody.innerHTML = items.map(rowHtml).join('');
                tbody.querySelectorAll('tr').forEach(bindRow);
            });
        }

        var searchTimer;
        document.getElementById('nw-search').addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadItems, 300);
        });

        document.getElementById('nw-new-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var body = {
                prenda: document.getElementById('nw-new-prenda').value.trim(),
                color:  document.getElementById('nw-new-color').value.trim(),
                talla:  document.getElementById('nw-new-talla').value.trim(),
                stock:  Number(document.getElementById('nw-new-stock').value) || 0,
                min_stock: Number(document.getElementById('nw-new-min').value) || 0
            };
            if (!body.prenda || !body.color || !body.talla) return;
            api(url('/items'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).then(function (res) {
                if (res.ok) {
                    document.getElementById('nw-new-form').reset();
                    document.getElementById('nw-new-stock').value = '0';
                    document.getElementById('nw-new-min').value = '0';
                    loadItems();
                }
            });
        });

        var genBtn = document.getElementById('nw-generate');
        genBtn.addEventListener('click', function () {
            genBtn.disabled = true;
            var original = genBtn.textContent;
            genBtn.textContent = 'Generando…';
            api(url('/generate'), { method: 'POST' }).then(function (res) {
                genBtn.disabled = false;
                genBtn.textContent = original;
                if (res.ok) {
                    alert('Creados: ' + res.data.created + ' · Omitidos (fuera del sistema): ' + res.data.skipped);
                    loadItems();
                }
            });
        });

        /* ---- Alertas ---- */
        function loadAlerts() {
            var body = document.getElementById('nw-alerts-tbody');
            body.innerHTML = '<tr><td colspan="8" class="nw-empty">Cargando…</td></tr>';
            api(url('/alerts')).then(function (res) {
                var items = (res.data && res.data.items) || [];
                var count = document.getElementById('nw-alert-count');
                if (items.length) { count.hidden = false; count.textContent = items.length; }
                else { count.hidden = true; }
                if (!items.length) { body.innerHTML = '<tr><td colspan="8" class="nw-empty">Sin faltantes. Todo el inventario está por encima del umbral.</td></tr>'; return; }
                body.innerHTML = items.map(rowHtml).join('');
                body.querySelectorAll('tr').forEach(bindRow);
            });
        }

        /* ---- Init ---- */
        loadItems();
        // Pre-cargar el conteo de alertas para el badge.
        loadAlerts();
        app.querySelector('.nw-view[data-view="alerts"]').hidden = true;
    })();
    </script>
    <?php
}
