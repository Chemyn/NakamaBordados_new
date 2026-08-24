<?php
/**
 * Plugin Name: Nakama Almacén (SKU Base)
 * Description: Inventario de materia prima compartida. El stock vive en la prenda lisa base (prenda+color+talla); muchas variaciones de diseño descuentan del mismo SKU base al pagarse el pedido. Panel de almacén y alertas de faltantes, con cascada de "agotado" a la tienda.
 * Version: 1.3.0
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'NAKAMA_WH_CAP', 'access_warehouse' );
define( 'NAKAMA_WH_PAGE', 'nakama-almacen' );
define( 'NAKAMA_WH_SCHEMA_VERSION', '1.3.0' );

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
function nakama_wh_catalog_maps_table() {
    global $wpdb;
    return $wpdb->prefix . 'nakama_catalog_sku_maps';
}

/** Instala o actualiza el esquema sin depender de desactivar/reactivar el plugin. */
function nakama_wh_install_schema() {
    global $wpdb;
    $table   = nakama_wh_table();
    $moves   = nakama_wh_moves_table();
    $maps    = nakama_wh_catalog_maps_table();
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
        origin VARCHAR(20) NOT NULL DEFAULT 'catalog',
        updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY (id),
        UNIQUE KEY sku_key (sku_key)
    ) {$charset};" );

    dbDelta( "CREATE TABLE {$maps} (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT(20) UNSIGNED NOT NULL,
        variation_id BIGINT(20) UNSIGNED NOT NULL,
        sku_key VARCHAR(191) NOT NULL,
        style VARCHAR(80) NOT NULL DEFAULT '',
        size VARCHAR(40) NOT NULL DEFAULT '',
        hidden_color VARCHAR(80) NOT NULL DEFAULT '',
        previous_override VARCHAR(191) NOT NULL DEFAULT '',
        previous_stock_status VARCHAR(20) NOT NULL DEFAULT 'instock',
        created_by BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY (id),
        UNIQUE KEY variation_id (variation_id),
        KEY product_id (product_id),
        KEY sku_key (sku_key)
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

    update_option( 'nakama_wh_schema_version', NAKAMA_WH_SCHEMA_VERSION );
    if ( function_exists( 'nakama_wh_merge_duplicates' ) ) {
        nakama_wh_merge_duplicates();
    }
}
register_activation_hook( __FILE__, 'nakama_wh_install_schema' );
add_action( 'init', function () {
    if ( get_option( 'nakama_wh_schema_version' ) !== NAKAMA_WH_SCHEMA_VERSION ) {
        nakama_wh_install_schema();
    }
}, 1 );

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
        'kaki' => 'Kaki', 'caqui' => 'Kaki', 'khaki' => 'Kaki', 'feet' => 'Kaki',
        'hueso' => 'Hueso', 'bone' => 'Hueso',
        'verde botella' => 'Verde botella', 'bottle green' => 'Verde botella',
        'morado' => 'Morado', 'morada' => 'Morado', 'purpura' => 'Morado', 'purple' => 'Morado',
        'naranja' => 'Naranja', 'orange' => 'Naranja',
        'cafe' => 'Café', 'marron' => 'Café', 'brown' => 'Café',
        'beige' => 'Beige',
        'vino' => 'Vino', 'wine' => 'Vino', 'burgundy' => 'Vino',
    );
    $map = apply_filters( 'nakama_wh_color_synonyms', $map );

    return isset( $map[ $norm ] ) ? $map[ $norm ] : $raw;
}

/* -------------------------------------------------------------------------
 * Orden del catálogo físico
 *
 * El almacén se recorre en el mismo orden en que están las prendas en el
 * anaquel, no alfabéticamente. Ordenar en SQL no sirve: los nombres reales
 * traen coletillas ("Sudadera Cuello Redondo", "T-shirt 100% Algodón Peinado")
 * y FIELD() exige valores exactos, así que el emparejamiento se hace en PHP
 * por palabra clave. Ordenar aquí, y no en cada cliente, deja alineados de una
 * vez la web, la app y el panel de wp-admin.
 * ---------------------------------------------------------------------- */

/** Normaliza para emparejar: sin acentos, mayúsculas y espacios colapsados. */
function nakama_wh_match_norm( $value ) {
    $value = strtoupper( remove_accents( trim( (string) $value ) ) );
    return preg_replace( '/\s+/', ' ', $value );
}

/** Posición de la talla por tamaño físico; las desconocidas van al final. */
function nakama_wh_size_index( $talla ) {
    $order = array(
        '2XS' => 0, 'XXS' => 0,
        'XS'  => 1,
        'S'   => 2,
        'M'   => 3,
        'L'   => 4,
        'XL'  => 5,
        '2XL' => 6, 'XXL' => 6,
        '3XL' => 7, 'XXXL' => 7,
    );
    $key = str_replace( ' ', '', nakama_wh_match_norm( $talla ) );

    return isset( $order[ $key ] ) ? $order[ $key ] : 99;
}

/**
 * Posición del grupo prenda+color (1-13); 99 para lo que no está en la lista.
 *
 * El orden de las comprobaciones importa: una prenda puede contener varias
 * palabras clave a la vez ("Oversize Acid Wash" o una sudadera descrita como
 * hoodie), y gana la primera que coincide. Por eso Acid Wash y Tank Top —que
 * agrupan todos sus colores— se evalúan antes que Oversize y T-shirt, y Hoodie
 * antes que Sudadera.
 */
function nakama_wh_group_priority( $prenda, $color ) {
    $p = nakama_wh_match_norm( $prenda );
    $c = nakama_wh_match_norm( nakama_wh_color_canonical( $color ) );

    if ( false !== strpos( $p, 'ACID WASH' ) ) {
        return 9;
    }
    if ( false !== strpos( $p, 'TANK TOP' ) ) {
        return 8;
    }
    if ( false !== strpos( $p, 'HOODIE' ) ) {
        if ( 'KAKI' === $c ) {
            return 11;
        }
        return 'NEGRO' === $c ? 13 : 99;
    }
    if ( false !== strpos( $p, 'OVERSIZE' ) ) {
        $pos = array( 'NEGRO' => 1, 'HUESO' => 2, 'BLANCO' => 3, 'VERDE' => 4 );
        return isset( $pos[ $c ] ) ? $pos[ $c ] : 99;
    }
    if ( false !== strpos( $p, 'T-SHIRT' ) || false !== strpos( $p, 'TSHIRT' ) ) {
        $pos = array( 'NEGRO' => 5, 'BLANCO' => 6, 'HUESO' => 7 );
        return isset( $pos[ $c ] ) ? $pos[ $c ] : 99;
    }
    if ( false !== strpos( $p, 'SUDADERA' ) ) {
        if ( 'KAKI' === $c ) {
            return 10;
        }
        return 'NEGRO' === $c ? 12 : 99;
    }

    return 99;
}

/**
 * Compara dos filas por el orden del anaquel. Es un comparador total (nunca
 * devuelve 0 salvo empate real) porque usort no garantiza estabilidad en PHP 7.
 */
function nakama_wh_compare_items( $a, $b ) {
    $ga = nakama_wh_group_priority( $a->prenda, $a->color );
    $gb = nakama_wh_group_priority( $b->prenda, $b->color );
    if ( $ga !== $gb ) {
        return $ga < $gb ? -1 : 1;
    }

    // Fuera de la lista se cae a alfabético por prenda; dentro, agrupar por
    // color evita intercalar colores talla a talla en Tank Top y Acid Wash.
    if ( 99 === $ga ) {
        $cmp = strcasecmp( $a->prenda, $b->prenda );
        if ( 0 !== $cmp ) {
            return $cmp;
        }
    }
    $cmp = strcasecmp( nakama_wh_color_canonical( $a->color ), nakama_wh_color_canonical( $b->color ) );
    if ( 0 !== $cmp ) {
        return $cmp;
    }

    $sa = nakama_wh_size_index( $a->talla );
    $sb = nakama_wh_size_index( $b->talla );
    if ( $sa !== $sb ) {
        return $sa < $sb ? -1 : 1;
    }

    return strcasecmp( $a->label, $b->label );
}

/** Ordena las filas por el orden del anaquel. */
function nakama_wh_sort_items( array &$rows ) {
    usort( $rows, 'nakama_wh_compare_items' );
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
            'origin'     => 'catalog',
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
    $maps  = nakama_wh_catalog_maps_table();
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
        if ( count( $group ) === 1 &&
             $group[0]->sku_key === $canon &&
             $group[0]->color === nakama_wh_color_canonical( $group[0]->color ) ) {
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
        $origin      = 'manual';
        foreach ( $group as $r ) {
            $total_stock += (int) $r->stock;
            $max_min      = max( $max_min, (int) $r->min_stock );
            if ( ! isset( $r->origin ) || 'manual' !== $r->origin ) {
                $origin = 'catalog';
            }
        }

        // Actualizar la superviviente a la forma canónica con el stock sumado.
        $wpdb->update( $table, array(
            'sku_key'    => $canon,
            'color'      => $canon_color,
            'label'      => nakama_wh_label( $survivor->prenda, $canon_color, $survivor->talla ),
            'stock'      => $total_stock,
            'min_stock'  => $max_min,
            'origin'     => $origin,
            'updated_at' => current_time( 'mysql' ),
        ), array( 'id' => (int) $survivor->id ) );

        // Borrar las demás filas del grupo y repuntar sus overrides al canónico.
        foreach ( $group as $r ) {
            if ( $r->sku_key !== $canon ) {
                $wpdb->update( $wpdb->postmeta,
                    array( 'meta_value' => $canon ),
                    array( 'meta_key' => '_nakama_base_sku', 'meta_value' => $r->sku_key )
                );
                $wpdb->update( $wpdb->postmeta,
                    array( 'meta_value' => $canon ),
                    array( 'meta_key' => '_nakama_wh_key', 'meta_value' => $r->sku_key )
                );
                $wpdb->update( $maps,
                    array( 'sku_key' => $canon, 'updated_at' => current_time( 'mysql' ) ),
                    array( 'sku_key' => $r->sku_key )
                );
            }
            if ( (int) $r->id === (int) $survivor->id ) {
                continue;
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

/** Las relaciones catálogo→SKU oculto solo pueden administrarlas administradores. */
function nakama_wh_admin_permission() {
    return current_user_can( 'manage_options' );
}

/** Añade el campo calculado 'status' (ok|low|out) a una fila. */
function nakama_wh_row_out( $row ) {
    $stock = (int) $row->stock;
    $min   = (int) $row->min_stock;
    $color = nakama_wh_color_canonical( $row->color );
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
        'color'     => $color,
        'talla'     => $row->talla,
        'label'     => nakama_wh_label( $row->prenda, $color, $row->talla ),
        'stock'     => $stock,
        'min_stock' => $min,
        'origin'    => isset( $row->origin ) ? $row->origin : 'catalog',
        'status'    => $status,
    );
}

add_action( 'rest_api_init', function () {
    $perm = 'nakama_wh_permission';

    // Chequeo de acceso para el frontend headless (JWT). __return_true + gate interno.
    register_rest_route( 'nakama/v1', '/warehouse/access', array(
        'methods'             => 'GET',
        'callback'            => function () {
            return new WP_REST_Response( array(
                'can'        => current_user_can( NAKAMA_WH_CAP ),
                'can_manage' => current_user_can( 'manage_options' ),
            ), 200 );
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

    register_rest_route( 'nakama/v1', '/warehouse/catalog-products', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_wh_rest_catalog_products',
        'permission_callback' => 'nakama_wh_admin_permission',
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/catalog-products/(?P<id>\d+)/variations', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_wh_rest_catalog_product_variations',
        'permission_callback' => 'nakama_wh_admin_permission',
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/manual-products', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'nakama_wh_rest_manual_products',
            'permission_callback' => 'nakama_wh_admin_permission',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'nakama_wh_rest_manual_product_save',
            'permission_callback' => 'nakama_wh_admin_permission',
        ),
    ) );
    register_rest_route( 'nakama/v1', '/warehouse/manual-products/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'nakama_wh_rest_manual_product_delete',
        'permission_callback' => 'nakama_wh_admin_permission',
    ) );
} );

/** Datos compactos de un producto para los selectores de administración. */
function nakama_wh_catalog_product_out( $product ) {
    global $wpdb;
    $maps = nakama_wh_catalog_maps_table();
    $image_id = $product->get_image_id();

    return array(
        'id'              => (int) $product->get_id(),
        'name'            => $product->get_name(),
        'slug'            => $product->get_slug(),
        'sku'             => $product->get_sku(),
        'image'           => $image_id ? (string) wp_get_attachment_image_url( $image_id, 'thumbnail' ) : '',
        'variation_count' => count( $product->get_children() ),
        'managed'         => (bool) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$maps} WHERE product_id = %d LIMIT 1",
            $product->get_id()
        ) ),
    );
}

/** Lee únicamente estilo y talla; el color de esta modalidad siempre es oculto. */
function nakama_wh_manual_variation_parts( $variation ) {
    $attrs  = nakama_wh_variation_attributes( $variation );
    $style  = trim( (string) $attrs['estilo'] );
    $size   = trim( (string) $attrs['talla'] );
    $public = trim( (string) $attrs['color'] );
    if ( '' === $style ) {
        $style = nakama_wh_parent_estilo( $variation->get_parent_id() );
    }

    $problem = '';
    if ( '' !== $public ) {
        $problem = 'Esta variación ya tiene un color público.';
    } elseif ( '' === $style || '' === $size ) {
        $problem = 'La variación necesita Estilo y Talla para generar su SKU.';
    }

    return array(
        'variation_id' => (int) $variation->get_id(),
        'style'        => $style,
        'size'         => $size,
        'public_color' => $public,
        'valid'        => '' === $problem,
        'problem'      => $problem,
    );
}

/** Devuelve el producto administrado y todas sus relaciones persistidas. */
function nakama_wh_manual_product_out( $product_id ) {
    global $wpdb;
    $maps = nakama_wh_catalog_maps_table();
    $rows = (array) $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$maps} WHERE product_id = %d ORDER BY id ASC",
        $product_id
    ) );
    if ( empty( $rows ) ) {
        return null;
    }

    $product = wc_get_product( $product_id );
    $base = $product ? nakama_wh_catalog_product_out( $product ) : array(
        'id'              => (int) $product_id,
        'name'            => 'Producto #' . (int) $product_id,
        'slug'            => '',
        'sku'             => '',
        'image'           => '',
        'variation_count' => count( $rows ),
        'managed'         => true,
    );
    $base['hidden_color'] = nakama_wh_color_canonical( $rows[0]->hidden_color );
    $base['created_at']   = $rows[0]->created_at;
    $base['variations']   = array();
    foreach ( $rows as $row ) {
        $stock_row = nakama_wh_get_row( $row->sku_key );
        $base['variations'][] = array(
            'variation_id' => (int) $row->variation_id,
            'sku_key'      => $row->sku_key,
            'style'        => $row->style,
            'size'         => $row->size,
            'stock'        => $stock_row ? (int) $stock_row->stock : null,
        );
    }
    return $base;
}

/** GET /warehouse/catalog-products?search= — búsqueda administrativa en Woo. */
function nakama_wh_rest_catalog_products( WP_REST_Request $request ) {
    global $wpdb;
    $search = trim( sanitize_text_field( (string) $request->get_param( 'search' ) ) );
    if ( strlen( $search ) < 2 ) {
        return new WP_REST_Response( array( 'items' => array() ), 200 );
    }

    $like = '%' . $wpdb->esc_like( $search ) . '%';
    $ids  = $wpdb->get_col( $wpdb->prepare(
        "SELECT DISTINCT p.ID
         FROM {$wpdb->posts} p
         LEFT JOIN {$wpdb->postmeta} sku ON sku.post_id = p.ID AND sku.meta_key = '_sku'
         WHERE p.post_type = 'product' AND p.post_status = 'publish'
           AND (p.post_title LIKE %s OR p.post_name LIKE %s OR sku.meta_value LIKE %s)
         ORDER BY p.post_title ASC LIMIT 20",
        $like,
        $like,
        $like
    ) );

    $items = array();
    foreach ( (array) $ids as $id ) {
        $product = wc_get_product( (int) $id );
        if ( $product && $product->is_type( 'variable' ) ) {
            $items[] = nakama_wh_catalog_product_out( $product );
        }
    }
    return new WP_REST_Response( array( 'items' => $items ), 200 );
}

/** GET /warehouse/catalog-products/{id}/variations — vista previa Estilo/Talla. */
function nakama_wh_rest_catalog_product_variations( WP_REST_Request $request ) {
    $product = wc_get_product( (int) $request['id'] );
    if ( ! $product || ! $product->is_type( 'variable' ) ) {
        return new WP_Error( 'not_variable', 'El producto no existe o no es variable.', array( 'status' => 404 ) );
    }

    $variations = array();
    foreach ( $product->get_children() as $variation_id ) {
        $variation = wc_get_product( (int) $variation_id );
        if ( $variation && in_array( $variation->get_status(), array( 'publish', 'private' ), true ) ) {
            $variations[] = nakama_wh_manual_variation_parts( $variation );
        }
    }
    return new WP_REST_Response( array(
        'product'    => nakama_wh_catalog_product_out( $product ),
        'variations' => $variations,
        'valid'      => ! empty( $variations ) && ! in_array( false, wp_list_pluck( $variations, 'valid' ), true ),
    ), 200 );
}

/** GET /warehouse/manual-products — relaciones visibles para web y wp-admin. */
function nakama_wh_rest_manual_products() {
    global $wpdb;
    $maps = nakama_wh_catalog_maps_table();
    $ids  = (array) $wpdb->get_col( "SELECT DISTINCT product_id FROM {$maps} ORDER BY created_at DESC" );
    $items = array();
    foreach ( $ids as $id ) {
        $item = nakama_wh_manual_product_out( (int) $id );
        if ( $item ) {
            $items[] = $item;
        }
    }
    return new WP_REST_Response( array( 'items' => $items ), 200 );
}

/** POST /warehouse/manual-products — crea todas las relaciones en una transacción. */
function nakama_wh_rest_manual_product_save( WP_REST_Request $request ) {
    global $wpdb;
    $product_id   = (int) $request->get_param( 'product_id' );
    $hidden_color = nakama_wh_color_canonical( sanitize_text_field( (string) $request->get_param( 'hidden_color' ) ) );
    $product      = wc_get_product( $product_id );
    $maps         = nakama_wh_catalog_maps_table();
    $table        = nakama_wh_table();

    if ( ! $product || ! $product->is_type( 'variable' ) ) {
        return new WP_Error( 'not_variable', 'Selecciona un producto variable válido.', array( 'status' => 400 ) );
    }
    if ( '' === trim( $hidden_color ) ) {
        return new WP_Error( 'missing_color', 'El color oculto es obligatorio.', array( 'status' => 400 ) );
    }
    $existing = $wpdb->get_var( $wpdb->prepare( "SELECT hidden_color FROM {$maps} WHERE product_id = %d LIMIT 1", $product_id ) );
    if ( null !== $existing ) {
        if ( nakama_wh_color_canonical( $existing ) === $hidden_color ) {
            return new WP_REST_Response( nakama_wh_manual_product_out( $product_id ), 200 );
        }
        return new WP_Error( 'already_managed', 'El producto ya está administrado. Elimínalo antes de cambiar su color oculto.', array( 'status' => 409 ) );
    }

    $prepared = array();
    foreach ( $product->get_children() as $variation_id ) {
        $variation = wc_get_product( (int) $variation_id );
        if ( ! $variation || ! in_array( $variation->get_status(), array( 'publish', 'private' ), true ) ) {
            continue;
        }
        $parts = nakama_wh_manual_variation_parts( $variation );
        if ( ! $parts['valid'] ) {
            return new WP_Error( 'invalid_variation', $parts['problem'], array(
                'status'       => 400,
                'variation_id' => (int) $variation_id,
            ) );
        }
        $parts['variation'] = $variation;
        $parts['sku_key']   = nakama_wh_key( $parts['style'], $hidden_color, $parts['size'] );
        $parts['previous_override'] = (string) get_post_meta( $variation_id, '_nakama_base_sku', true );
        if ( '' !== $parts['previous_override'] && $parts['previous_override'] !== $parts['sku_key'] ) {
            return new WP_Error( 'variation_has_override', 'Una variación ya está vinculada a otro SKU base. Revísala antes de continuar.', array(
                'status'       => 409,
                'variation_id' => (int) $variation_id,
            ) );
        }
        $prepared[] = $parts;
    }
    if ( empty( $prepared ) ) {
        return new WP_Error( 'no_variations', 'El producto no tiene variaciones publicadas para administrar.', array( 'status' => 400 ) );
    }

    $touched_ids = array();
    $wpdb->query( 'START TRANSACTION' );
    try {
        foreach ( $prepared as $parts ) {
            $variation    = $parts['variation'];
            $variation_id = (int) $parts['variation_id'];
            $sku_key      = $parts['sku_key'];
            $row          = nakama_wh_get_row( $sku_key );
            if ( ! $row ) {
                $inserted = $wpdb->insert( $table, array(
                    'sku_key'    => $sku_key,
                    'prenda'     => $parts['style'],
                    'color'      => $hidden_color,
                    'talla'      => $parts['size'],
                    'label'      => nakama_wh_label( $parts['style'], $hidden_color, $parts['size'] ),
                    'stock'      => 0,
                    'min_stock'  => 0,
                    'origin'     => 'manual',
                    'updated_at' => current_time( 'mysql' ),
                ) );
                if ( false === $inserted ) {
                    throw new RuntimeException( 'No se pudo crear el SKU base.' );
                }
                nakama_wh_log_move( $sku_key, 0, 'manual_seed' );
            }

            $inserted = $wpdb->insert( $maps, array(
                'product_id'           => $product_id,
                'variation_id'         => $variation_id,
                'sku_key'              => $sku_key,
                'style'                => $parts['style'],
                'size'                 => $parts['size'],
                'hidden_color'         => $hidden_color,
                'previous_override'    => $parts['previous_override'],
                'previous_stock_status'=> $variation->get_stock_status(),
                'created_by'           => get_current_user_id(),
                'created_at'           => current_time( 'mysql' ),
                'updated_at'           => current_time( 'mysql' ),
            ) );
            if ( false === $inserted ) {
                throw new RuntimeException( 'No se pudo relacionar una variación.' );
            }
            update_post_meta( $variation_id, '_nakama_base_sku', $sku_key );
            update_post_meta( $variation_id, '_nakama_wh_key', $sku_key );
            $touched_ids[] = $variation_id;
        }
        $wpdb->query( 'COMMIT' );
    } catch ( Throwable $error ) {
        $wpdb->query( 'ROLLBACK' );
        foreach ( $touched_ids as $variation_id ) {
            clean_post_cache( $variation_id );
        }
        nakama_wh_stock_map( true );
        return new WP_Error( 'mapping_failed', 'No se pudieron guardar las relaciones. Intenta de nuevo.', array( 'status' => 500 ) );
    }

    nakama_wh_stock_map( true );
    nakama_wh_sync_stock_status( array_values( array_unique( wp_list_pluck( $prepared, 'sku_key' ) ) ) );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
    return new WP_REST_Response( nakama_wh_manual_product_out( $product_id ), 201 );
}

/** Comprueba relaciones manuales, overrides explícitos y resoluciones automáticas. */
function nakama_wh_sku_has_variation_references( $sku_key ) {
    global $wpdb;
    $maps = nakama_wh_catalog_maps_table();
    if ( $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$maps} WHERE sku_key = %s LIMIT 1", $sku_key ) ) ) {
        return true;
    }
    if ( $wpdb->get_var( $wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_nakama_base_sku' AND meta_value = %s LIMIT 1",
        $sku_key
    ) ) ) {
        return true;
    }

    $ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product_variation' AND post_status IN ('publish','private')" );
    foreach ( (array) $ids as $variation_id ) {
        $variation = wc_get_product( (int) $variation_id );
        $resolved  = $variation ? nakama_wh_resolve_for_variation( $variation ) : null;
        if ( $resolved && $resolved['key'] === $sku_key ) {
            return true;
        }
    }
    return false;
}

/** DELETE /warehouse/manual-products/{id} — desvincula y limpia solo SKU huérfanos. */
function nakama_wh_rest_manual_product_delete( WP_REST_Request $request ) {
    global $wpdb;
    $product_id = (int) $request['id'];
    $maps       = nakama_wh_catalog_maps_table();
    $table      = nakama_wh_table();
    $rows       = (array) $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$maps} WHERE product_id = %d",
        $product_id
    ) );
    if ( empty( $rows ) ) {
        return new WP_Error( 'mapping_not_found', 'El producto no está administrado.', array( 'status' => 404 ) );
    }

    $keys = array_values( array_unique( wp_list_pluck( $rows, 'sku_key' ) ) );
    $wpdb->query( 'START TRANSACTION' );
    try {
        foreach ( $rows as $row ) {
            $variation_id = (int) $row->variation_id;
            if ( isset( $row->previous_override ) && '' !== $row->previous_override ) {
                update_post_meta( $variation_id, '_nakama_base_sku', $row->previous_override );
                update_post_meta( $variation_id, '_nakama_wh_key', $row->previous_override );
            } else {
                delete_post_meta( $variation_id, '_nakama_base_sku' );
                delete_post_meta( $variation_id, '_nakama_wh_key' );
            }
            $variation = wc_get_product( $variation_id );
            if ( $variation && in_array( $row->previous_stock_status, array( 'instock', 'outofstock', 'onbackorder' ), true ) ) {
                $variation->set_stock_status( $row->previous_stock_status );
                $variation->save();
            }
        }
        if ( false === $wpdb->delete( $maps, array( 'product_id' => $product_id ) ) ) {
            throw new RuntimeException( 'No se pudieron eliminar las relaciones.' );
        }

        $deleted_skus = array();
        foreach ( $keys as $sku_key ) {
            $row = nakama_wh_get_row( $sku_key );
            if ( $row && isset( $row->origin ) && 'manual' === $row->origin && ! nakama_wh_sku_has_variation_references( $sku_key ) ) {
                $wpdb->delete( $table, array( 'id' => (int) $row->id ) );
                $deleted_skus[] = $sku_key;
            }
        }
        $wpdb->query( 'COMMIT' );
    } catch ( Throwable $error ) {
        $wpdb->query( 'ROLLBACK' );
        return new WP_Error( 'delete_failed', 'No se pudo eliminar la relación. Intenta de nuevo.', array( 'status' => 500 ) );
    }

    nakama_wh_stock_map( true );
    if ( function_exists( 'nakama_products_bump_cache' ) ) {
        nakama_products_bump_cache();
    }
    return new WP_REST_Response( array(
        'deleted'      => true,
        'product_id'   => $product_id,
        'deleted_skus' => $deleted_skus,
    ), 200 );
}

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

    $sql  = "SELECT * FROM {$table} WHERE {$where}";
    $rows = (array) ( $args ? $wpdb->get_results( $wpdb->prepare( $sql, $args ) ) : $wpdb->get_results( $sql ) );

    nakama_wh_sort_items( $rows );

    $items = array_map( 'nakama_wh_row_out', $rows );
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
        'origin'     => $existing && isset( $existing->origin ) ? $existing->origin : 'catalog',
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
    $rows  = (array) $wpdb->get_results( "SELECT * FROM {$table} WHERE stock <= 0 OR (min_stock > 0 AND stock <= min_stock)" );

    // Lo más urgente primero; a igual faltante, el orden del anaquel.
    usort(
        $rows,
        function ( $a, $b ) {
            if ( (int) $a->stock !== (int) $b->stock ) {
                return (int) $a->stock < (int) $b->stock ? -1 : 1;
            }
            return nakama_wh_compare_items( $a, $b );
        }
    );

    $items = array_map( 'nakama_wh_row_out', $rows );
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
                    'origin'     => 'catalog',
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
                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                    <button class="nw-tab" data-tab="manual">Productos sin color</button>
                <?php endif; ?>
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

        <?php if ( current_user_can( 'manage_options' ) ) : ?>
        <section class="nw-view nw-manual" data-view="manual" hidden>
            <div class="nw-manual-hero">
                <div>
                    <p class="nw-kicker">Control interno · Solo administradores</p>
                    <h2>Productos sin color</h2>
                    <p>Selecciona un producto variable de WooCommerce. Estilo y Talla se toman del catálogo; el color que captures solo aparecerá en Almacén y Producción.</p>
                </div>
                <span>SKU<br>oculto</span>
            </div>

            <div id="nw-manual-notice" class="nw-manual-notice" role="alert" hidden></div>

            <form id="nw-manual-form" class="nw-manual-form">
                <div class="nw-manual-step">01</div>
                <div class="nw-manual-field nw-manual-search-wrap">
                    <label for="nw-manual-product-search">Buscar producto en WooCommerce</label>
                    <input type="search" id="nw-manual-product-search" placeholder="Nombre, slug o SKU…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="nw-manual-results">
                    <small>Escribe al menos 2 caracteres.</small>
                    <div id="nw-manual-results" class="nw-manual-results" role="listbox" hidden></div>
                </div>
                <div class="nw-manual-rule"></div>
                <div class="nw-manual-step">02</div>
                <div class="nw-manual-field">
                    <label for="nw-manual-color">Color oculto</label>
                    <input type="text" id="nw-manual-color" placeholder="Ej. Verde botella" disabled required>
                    <small>Se aplicará a todas las variaciones detectadas.</small>
                </div>
                <button type="submit" id="nw-manual-save" class="nw-btn nw-btn-primary" disabled>Crear SKU internos</button>
            </form>

            <div id="nw-manual-preview" class="nw-manual-preview" hidden></div>

            <div class="nw-manual-title">
                <div><p class="nw-kicker">Registro activo</p><h3>Productos administrados</h3></div>
                <b id="nw-manual-count">00</b>
            </div>
            <div id="nw-manual-list" class="nw-manual-list"><div class="nw-manual-empty">Cargando…</div></div>
        </section>
        <?php endif; ?>
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

    .nw-manual { max-width: 1240px; margin: 0 auto; }
    .nw-manual-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:26px 30px; color:#fff; background:#1A1F2B; border:3px solid #000; border-bottom:7px solid var(--nw-primary); box-shadow:5px 5px 0 #000; }
    .nw-manual-hero h2 { margin:0; font:600 clamp(2.7rem,6vw,4.8rem)/.82 'Teko',sans-serif; text-transform:uppercase; }
    .nw-manual-hero p:not(.nw-kicker) { max-width:760px; margin:10px 0 0; color:#e8e5dc; line-height:1.55; }
    .nw-manual-hero>span { flex:0 0 auto; width:88px; height:88px; display:grid; place-content:center; text-align:center; transform:rotate(3deg); color:#fff; background:var(--nw-primary); border:3px solid #fff; box-shadow:5px 5px 0 #000; font:700 1.5rem/.8 'Teko',sans-serif; text-transform:uppercase; }
    .nw-kicker { margin:0 0 7px; color:var(--nw-primary); font-size:.72rem; font-weight:900; letter-spacing:.15em; text-transform:uppercase; }
    .nw-manual-notice { margin-top:18px; padding:12px 15px; border:2px solid currentColor; font-weight:800; }
    .nw-manual-notice.ok { color:#14532d; background:#d7f5dd; }.nw-manual-notice.err { color:#8d191b; background:#fde2e1; }
    .nw-manual-form { display:grid; grid-template-columns:auto minmax(270px,1fr) 2px auto minmax(210px,.55fr) auto; gap:16px; align-items:end; margin-top:22px; padding:22px; background:#fff; border:3px solid #000; box-shadow:4px 4px 0 #000; }
    .nw-manual-step { align-self:start; padding-top:25px; color:var(--nw-primary); font:700 1.7rem/1 'Teko',sans-serif; }
    .nw-manual-rule { align-self:stretch; background:#000; }
    .nw-manual-field { position:relative; min-width:0; }.nw-manual-field label { display:block; margin-bottom:7px; font-size:.76rem; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .nw-manual-field input { width:100%; min-height:46px; padding:9px 12px; color:#111; background:#f7f4ed; border:2px solid #000; font-size:1rem; }
    .nw-manual-field input:focus { outline:3px solid rgba(227,0,15,.3); outline-offset:2px; }.nw-manual-field input:disabled { opacity:.55; }
    .nw-manual-field small { display:block; margin-top:6px; color:#666; font-size:.72rem; }
    .nw-manual-results { position:absolute; z-index:30; top:75px; left:0; right:0; max-height:320px; overflow:auto; padding:5px; background:#fff; border:3px solid #000; box-shadow:6px 6px 0 rgba(0,0,0,.25); }
    .nw-manual-result { width:100%; min-height:58px; display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center; padding:9px; text-align:left; color:#111; background:#fff; border:0; border-bottom:1px solid #ddd; cursor:pointer; }
    .nw-manual-result:hover:not(:disabled) { background:#fbe9e8; }.nw-manual-result:disabled { opacity:.5; cursor:not-allowed; }.nw-manual-result strong,.nw-manual-result small { display:block; }.nw-manual-result b { color:var(--nw-primary); font-size:.7rem; text-transform:uppercase; }
    .nw-manual-preview { margin-top:18px; padding:18px; background:#fff; border:3px solid #000; }
    .nw-manual-preview h3 { margin:0; font:600 1.8rem/1 'Teko',sans-serif; text-transform:uppercase; }.nw-manual-preview>p { margin:5px 0 14px; color:#666; }
    .nw-manual-variations { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }.nw-manual-variation { padding:10px; background:#f7f4ed; border:2px solid #000; }.nw-manual-variation.bad { background:#fde2e1; border-color:#8d191b; }.nw-manual-variation small,.nw-manual-variation strong,.nw-manual-variation span { display:block; }.nw-manual-variation small { color:#666; font-size:.66rem; }.nw-manual-variation strong { margin:3px 0; }
    .nw-manual-title { display:flex; align-items:end; justify-content:space-between; margin:38px 0 13px; padding-bottom:8px; border-bottom:5px solid #000; }.nw-manual-title h3 { margin:0; font:600 2.3rem/.9 'Teko',sans-serif; text-transform:uppercase; }.nw-manual-title>b { color:var(--nw-primary); font:700 2.4rem/.8 'Teko',sans-serif; }
    .nw-manual-list { display:grid; gap:12px; }.nw-manual-card { display:flex; align-items:center; gap:16px; padding:14px; background:#fff; border:3px solid #000; box-shadow:4px 4px 0 rgba(0,0,0,.22); }.nw-manual-card-main { flex:1; min-width:0; }.nw-manual-card small { color:#666; font-size:.7rem; text-transform:uppercase; }.nw-manual-card h4 { margin:2px 0 8px; font:600 1.55rem/1 'Teko',sans-serif; text-transform:uppercase; }.nw-manual-tag { display:inline-block; margin-right:6px; padding:3px 8px; background:#f7f4ed; border:1px solid #000; font-size:.75rem; font-weight:800; }.nw-manual-card p { overflow:hidden; margin:8px 0 0; color:#666; font-size:.75rem; text-overflow:ellipsis; white-space:nowrap; }.nw-manual-remove { min-height:44px; padding:8px 12px; color:#8d191b; background:#fff; border:2px solid #8d191b; font-weight:800; cursor:pointer; }.nw-manual-remove:hover { color:#fff; background:#8d191b; }
    .nw-manual-empty { padding:34px; text-align:center; color:#666; background:#fff; border:3px dashed #000; }
    @media (max-width:980px) { .nw-manual-form { grid-template-columns:auto 1fr; }.nw-manual-rule { display:none; }.nw-manual-form>.nw-btn { grid-column:2; } }
    @media (max-width:640px) { .nw-tabs { width:100%; overflow:auto; }.nw-tab { flex:0 0 auto; }.nw-manual-hero { align-items:flex-start; padding:22px 17px; }.nw-manual-hero>span { width:62px; height:62px; font-size:1.05rem; }.nw-manual-form { grid-template-columns:1fr; padding:16px; }.nw-manual-step { display:none; }.nw-manual-form>.nw-btn { grid-column:1; }.nw-manual-card { flex-wrap:wrap; }.nw-manual-card-main { width:100%; }.nw-manual-remove { width:100%; } }
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

        /* ---- Productos sin color (solo existe para administradores) ---- */
        var manualSearch = document.getElementById('nw-manual-product-search');
        var manualSelected = null;
        var manualSearchTimer;

        function manualNotice(text, bad) {
            var node = document.getElementById('nw-manual-notice');
            if (!node) return;
            node.textContent = text || '';
            node.hidden = !text;
            node.className = 'nw-manual-notice ' + (bad ? 'err' : 'ok');
        }

        function manualCard(item) {
            var details = (item.variations || []).map(function (v) { return esc(v.style) + ' / ' + esc(v.size); }).join(' · ');
            return '<article class="nw-manual-card" data-product-id="' + item.id + '">' +
                '<div class="nw-manual-card-main"><small>#' + item.id + ' · ' + esc(item.slug) + '</small>' +
                '<h4>' + esc(item.name) + '</h4>' +
                '<span class="nw-manual-tag">● ' + esc(item.hidden_color) + '</span>' +
                '<span class="nw-manual-tag">' + (item.variations || []).length + ' SKU internos</span>' +
                '<p>' + details + '</p></div>' +
                '<button type="button" class="nw-manual-remove">Dejar de administrar</button></article>';
        }

        function loadManualProducts() {
            var list = document.getElementById('nw-manual-list');
            if (!list) return;
            list.innerHTML = '<div class="nw-manual-empty">Cargando…</div>';
            api(url('/manual-products')).then(function (res) {
                var items = (res.data && res.data.items) || [];
                document.getElementById('nw-manual-count').textContent = String(items.length).padStart(2, '0');
                list.innerHTML = items.length ? items.map(manualCard).join('') : '<div class="nw-manual-empty">Aún no hay productos con color oculto.</div>';
                list.querySelectorAll('.nw-manual-card').forEach(function (card) {
                    card.querySelector('.nw-manual-remove').addEventListener('click', function () {
                        var productId = Number(card.dataset.productId);
                        var name = card.querySelector('h4').textContent;
                        if (!confirm('¿Dejar de administrar “' + name + '”?\n\nEl historial se conservará y solo se borrarán SKU manuales sin referencias.')) return;
                        this.disabled = true;
                        this.textContent = 'Eliminando…';
                        api(url('/manual-products/' + productId), { method: 'DELETE' }).then(function (deleted) {
                            if (!deleted.ok) {
                                manualNotice((deleted.data && deleted.data.message) || 'No se pudo eliminar.', true);
                                loadManualProducts();
                                return;
                            }
                            manualNotice(name + ' dejó de usar el color oculto.', false);
                            loadManualProducts();
                            loadItems();
                        });
                    });
                });
            });
        }

        function renderManualPreview(data) {
            var preview = document.getElementById('nw-manual-preview');
            var variations = data.variations || [];
            preview.hidden = false;
            preview.innerHTML = '<h3>' + esc(data.product.name) + '</h3>' +
                '<p>#' + data.product.id + ' · ' + esc(data.product.slug) + ' · ' + variations.length + ' variaciones</p>' +
                '<div class="nw-manual-variations">' + variations.map(function (v) {
                    return '<div class="nw-manual-variation ' + (v.valid ? '' : 'bad') + '"><small>VAR #' + v.variation_id + '</small>' +
                        '<strong>' + esc(v.style || 'Sin estilo') + '</strong><span>Talla ' + esc(v.size || '—') + '</span>' +
                        (v.problem ? '<small>' + esc(v.problem) + '</small>' : '') + '</div>';
                }).join('') + '</div>';
            document.getElementById('nw-manual-color').disabled = !data.valid;
            document.getElementById('nw-manual-save').disabled = !data.valid || !document.getElementById('nw-manual-color').value.trim();
            if (!data.valid) manualNotice('Revisa las variaciones marcadas antes de crear los SKU.', true);
        }

        function selectManualProduct(productId, productName) {
            manualSearch.value = productName;
            document.getElementById('nw-manual-results').hidden = true;
            manualSearch.setAttribute('aria-expanded', 'false');
            document.getElementById('nw-manual-preview').hidden = false;
            document.getElementById('nw-manual-preview').innerHTML = 'Leyendo variaciones…';
            api(url('/catalog-products/' + productId + '/variations')).then(function (res) {
                if (!res.ok) {
                    manualSelected = null;
                    manualNotice((res.data && res.data.message) || 'No se pudieron leer las variaciones.', true);
                    return;
                }
                manualSelected = res.data;
                manualNotice('', false);
                renderManualPreview(res.data);
                document.getElementById('nw-manual-color').focus();
            });
        }

        if (manualSearch) {
            manualSearch.addEventListener('input', function () {
                clearTimeout(manualSearchTimer);
                manualSelected = null;
                document.getElementById('nw-manual-color').disabled = true;
                document.getElementById('nw-manual-save').disabled = true;
                document.getElementById('nw-manual-preview').hidden = true;
                var q = this.value.trim();
                var results = document.getElementById('nw-manual-results');
                if (q.length < 2) { results.hidden = true; this.setAttribute('aria-expanded', 'false'); return; }
                manualSearchTimer = setTimeout(function () {
                    results.hidden = false;
                    results.innerHTML = '<div class="nw-manual-empty">Buscando…</div>';
                    manualSearch.setAttribute('aria-expanded', 'true');
                    api(url('/catalog-products', { search: q })).then(function (res) {
                        var products = (res.data && res.data.items) || [];
                        if (!products.length) {
                            results.innerHTML = '<div class="nw-manual-empty">Sin coincidencias. Prueba con el slug completo o el SKU.</div>';
                            return;
                        }
                        results.innerHTML = products.map(function (product) {
                            return '<button type="button" class="nw-manual-result" data-id="' + product.id + '" data-name="' + encodeURIComponent(product.name) + '" ' + (product.managed ? 'disabled' : '') + '>' +
                                '<span><strong>' + esc(product.name) + '</strong><small>' + esc(product.slug) + ' · ' + product.variation_count + ' variaciones</small></span>' +
                                '<b>' + (product.managed ? 'Ya administrado' : 'Elegir') + '</b></button>';
                        }).join('');
                        results.querySelectorAll('.nw-manual-result:not(:disabled)').forEach(function (button) {
                            button.addEventListener('click', function () { selectManualProduct(Number(this.dataset.id), decodeURIComponent(this.dataset.name)); });
                        });
                    });
                }, 280);
            });

            document.getElementById('nw-manual-color').addEventListener('input', function () {
                document.getElementById('nw-manual-save').disabled = !manualSelected || !manualSelected.valid || !this.value.trim();
            });

            document.getElementById('nw-manual-form').addEventListener('submit', function (event) {
                event.preventDefault();
                var color = document.getElementById('nw-manual-color').value.trim();
                if (!manualSelected || !manualSelected.valid || !color) {
                    manualNotice('Selecciona un producto compatible y escribe el color oculto.', true);
                    return;
                }
                var save = document.getElementById('nw-manual-save');
                save.disabled = true;
                save.textContent = 'Creando SKU…';
                api(url('/manual-products'), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: manualSelected.product.id, hidden_color: color })
                }).then(function (res) {
                    save.textContent = 'Crear SKU internos';
                    if (!res.ok) {
                        save.disabled = false;
                        manualNotice((res.data && res.data.message) || 'No se pudo guardar.', true);
                        return;
                    }
                    manualNotice(res.data.name + ' quedó vinculado a ' + res.data.variations.length + ' SKU base.', false);
                    manualSelected = null;
                    manualSearch.value = '';
                    document.getElementById('nw-manual-color').value = '';
                    document.getElementById('nw-manual-color').disabled = true;
                    document.getElementById('nw-manual-preview').hidden = true;
                    loadManualProducts();
                    loadItems();
                });
            });
            loadManualProducts();
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
