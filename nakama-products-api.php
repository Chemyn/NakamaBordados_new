<?php
/**
 * Plugin Name: Nakama Products API
 * Description: API REST pública y RÁPIDA de productos (WooCommerce/$wpdb directo, sin WPGraphQL) para el frontend estático de Next.js.
 * Version: 1.5
 * Author: Nakama
 */

if (!defined('ABSPATH')) {
    exit; // Salir si se accede directamente.
}

// Evitar errores fatales si WooCommerce no está activo
if (!class_exists('WooCommerce') && !in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    return;
}

/**
 * ATRIBUTOS DE VARIACIÓN DE ESTA TIENDA
 * WooCommerce guarda los atributos globales como taxonomías con prefijo `pa_`.
 * El frontend espera las claves capitalizadas (Color / Estilo / Talla).
 * Este mapa traduce las taxonomías internas -> claves que consume el TS.
 */
function nakama_products_attribute_key_map()
{
    return array(
        'pa_color' => 'Color',
        'pa_estilo' => 'Estilo',
        'pa_talla' => 'Talla',
    );
}

/**
 * Convierte el nombre técnico de un atributo (ej. "pa_color", "attribute_pa_color",
 * "Color") a la clave capitalizada que espera el frontend.
 */
function nakama_products_normalize_attribute_key($raw_key)
{
    $map = nakama_products_attribute_key_map();

    // Normalizar: quitar prefijo "attribute_" que usan las meta de variación.
    $key = str_replace('attribute_', '', (string) $raw_key);
    $key = strtolower($key);

    if (isset($map[$key])) {
        return $map[$key];
    }

    // Atributo no global o personalizado: capitalizar de forma legible.
    $clean = str_replace('pa_', '', $key);
    $clean = str_replace(array('-', '_'), ' ', $clean);
    return ucwords($clean);
}

/**
 * Añade cabeceras CORS estándar a una respuesta REST (frontend estático).
 */
function nakama_products_add_cors($response)
{
    $response->header('Access-Control-Allow-Origin', '*');
    $response->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Evitar que LiteSpeed cachee respuestas del API: una respuesta vacía
    // cacheada dejaba categorías enteras "sin productos" hasta purgar.
    $response->header('X-LiteSpeed-Cache-Control', 'no-cache');
    $response->header('Cache-Control', 'no-cache, must-revalidate, max-age=0');
    return $response;
}

/**
 * Handler del preflight OPTIONS (CORS) compartido por los endpoints públicos.
 */
function nakama_products_preflight()
{
    return nakama_products_add_cors(rest_ensure_response(null));
}

// ============================================================================
// REGISTRO DE RUTAS REST
// ============================================================================
add_action('rest_api_init', function () {

    // 1) Listado / búsqueda / paginación de productos.
    //    URL: https://nakamabordados.com/wp-json/nakama/v1/products
    register_rest_route('nakama/v1', '/products', array(
        array(
            'methods' => 'GET',
            'callback' => 'nakama_products_list',
            'permission_callback' => '__return_true', // Lectura pública.
        ),
        array(
            'methods' => 'OPTIONS',
            'callback' => 'nakama_products_preflight',
            'permission_callback' => '__return_true',
        ),
    ));

    // 2) Producto único (por slug), con variaciones.
    //    URL: https://nakamabordados.com/wp-json/nakama/v1/product?slug=<slug>
    register_rest_route('nakama/v1', '/product', array(
        array(
            'methods' => 'GET',
            'callback' => 'nakama_products_single',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'OPTIONS',
            'callback' => 'nakama_products_preflight',
            'permission_callback' => '__return_true',
        ),
    ));

    // 3) Lista ligera de TODOS los slugs publicados (para generar rutas en build).
    //    URL: https://nakamabordados.com/wp-json/nakama/v1/product-slugs
    register_rest_route('nakama/v1', '/product-slugs', array(
        array(
            'methods' => 'GET',
            'callback' => 'nakama_products_slugs',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'OPTIONS',
            'callback' => 'nakama_products_preflight',
            'permission_callback' => '__return_true',
        ),
    ));

    // 4) Modo Mantenimiento GET/POST/OPTIONS
    register_rest_route('nakama/v1', '/maintenance', array(
        array(
            'methods' => 'GET',
            'callback' => 'nakama_get_maintenance_status',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'POST',
            'callback' => 'nakama_set_maintenance_status',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ),
        array(
            'methods' => 'OPTIONS',
            'callback' => 'nakama_products_preflight',
            'permission_callback' => '__return_true',
        ),
    ));

    // 5) Folio de cotización incremental
    register_rest_route('nakama/v1', '/next-folio', array(
        array(
            'methods' => array('GET', 'POST'),
            'callback' => 'nakama_products_get_next_folio',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'OPTIONS',
            'callback' => 'nakama_products_preflight',
            'permission_callback' => '__return_true',
        ),
    ));
});

function nakama_products_get_next_folio()
{
    $current_folio = get_option('nakama_quote_folio_counter', 1000);
    $next_folio = $current_folio + 1;
    update_option('nakama_quote_folio_counter', $next_folio);
    
    $response = rest_ensure_response(array(
        'success' => true,
        'folio' => $next_folio,
        'formatted' => 'NK-' . $next_folio
    ));
    return nakama_products_add_cors($response);
}

// ============================================================================
// CONSTRUCTORES DE OBJETOS (mapean WC_Product -> shape del frontend)
// ============================================================================

/**
 * Construye un objeto Variation a partir de un WC_Product_Variation.
 * Coincide con el tipo `Variation` de src/types/product.ts.
 */
function nakama_products_build_variation($variation)
{
    if (!$variation instanceof WC_Product) {
        return null;
    }

    $variation_id = $variation->get_id();

    // SKU: usar el de WC o generar uno estable "WP-VAR-<id>".
    $sku = $variation->get_sku();
    if (empty($sku)) {
        $sku = 'WP-VAR-' . $variation_id;
    }

    // Precio numérico actual (WC ya resuelve oferta vs regular en get_price()).
    $price = (float) $variation->get_price();

    // Imagen específica de la variación (si tiene), si no [].
    $images = array();
    $image_id = $variation->get_image_id();
    if ($image_id) {
        $url = wp_get_attachment_url($image_id);
        if ($url) {
            $images[] = $url;
        }
    }

    // Atributos: get_attributes() devuelve [ 'pa_color' => 'rojo', ... ] (valores = slug del término).
    $attributes = array();
    foreach ($variation->get_attributes() as $attr_key => $attr_value) {
        if ('' === $attr_value || null === $attr_value) {
            continue;
        }

        $label_key = nakama_products_normalize_attribute_key($attr_key);

        // Si es taxonomía global, convertir el slug del término a su nombre legible.
        $display_value = $attr_value;
        if (taxonomy_exists($attr_key)) {
            $term = get_term_by('slug', $attr_value, $attr_key);
            if ($term && !is_wp_error($term)) {
                $display_value = $term->name;
            }
        }

        $attributes[$label_key] = wp_specialchars_decode($display_value);
    }

    // Stock: cantidad o 0.
    $stock = $variation->get_stock_quantity();
    $stock = (null === $stock) ? 0 : (int) $stock;

    return array(
        'id' => (string) $variation_id,
        'databaseId' => (int) $variation_id,
        'sku' => $sku,
        'price' => $price,
        'images' => $images,
        'attributes' => (object) $attributes, // objeto JSON, no array, incluso vacío.
        'stock' => $stock,
    );
}

/**
 * Construye un objeto Product completo a partir de un WC_Product.
 * Coincide con el tipo `Product` de src/types/product.ts.
 */
function nakama_products_build_product($product)
{
    if (!$product instanceof WC_Product) {
        return null;
    }

    $database_id = $product->get_id();

    // id = slug (post_name); identificador primario usado en /product/<id>.
    $slug = $product->get_slug();

    // SKU: WC o "WP-<id>".
    $sku = $product->get_sku();
    if (empty($sku)) {
        $sku = 'WP-' . $database_id;
    }

    // Precio numérico actual (oferta si aplica, si no regular).
    $price = (float) $product->get_price();

    // Categorías -> array de SLUGS.
    $categories = wp_get_post_terms($database_id, 'product_cat', array('fields' => 'slugs'));
    if (is_wp_error($categories)) {
        $categories = array();
    }

    // Tags -> array de NOMBRES.
    $tags = wp_get_post_terms($database_id, 'product_tag', array('fields' => 'names'));
    if (is_wp_error($tags)) {
        $tags = array();
    }

    // Imágenes: destacada primero, luego galería.
    $images = array();
    $featured_id = $product->get_image_id();
    if ($featured_id) {
        $url = wp_get_attachment_url($featured_id);
        if ($url) {
            $images[] = $url;
        }
    }
    foreach ($product->get_gallery_image_ids() as $gallery_id) {
        $url = wp_get_attachment_url($gallery_id);
        if ($url) {
            $images[] = $url;
        }
    }

    // Tipo: 'variable' o 'simple' (cualquier otro tipo se trata como simple para el frontend).
    $type = $product->is_type('variable') ? 'variable' : 'simple';

    // Variaciones: [] para simples; para variables recorrer los hijos.
    $variations = array();
    if ('variable' === $type) {
        foreach ($product->get_children() as $child_id) {
            $child = wc_get_product($child_id);
            $built = nakama_products_build_variation($child);
            if ($built) {
                $variations[] = $built;
            }
        }
    }

    // Rating: promedio de WC o 5 si no hay reseñas.
    $rating = (float) $product->get_average_rating();
    if ($rating <= 0) {
        $rating = 5;
    }

    // Ventas: total_sales o número pseudoaleatorio estable entre 1 y 10 (basado en el ID de la base de datos).
    $sales_count = (int) $product->get_total_sales();
    if ($sales_count <= 0) {
        $sales_count = (($database_id * 7) % 10) + 1;
    }

    return array(
        'id' => (string) $slug,
        'databaseId' => (int) $database_id,
        'name' => wp_specialchars_decode($product->get_name()),
        'sku' => $sku,
        'price' => $price,
        'description' => $product->get_description(), // HTML permitido.
        'categories' => array_values($categories),
        'tags' => array_values($tags),
        'images' => $images,
        'type' => $type,
        'variations' => $variations,
        'rating' => $rating,
        'salesCount' => $sales_count,
    );
}

// ============================================================================
// 1) HANDLER: LISTADO / BÚSQUEDA / PAGINACIÓN
// ============================================================================
function nakama_products_list($request)
{
    // Sanitizar parámetros de entrada.
    $limit = absint($request->get_param('limit'));
    $offset = absint($request->get_param('offset'));
    $category = sanitize_text_field((string) $request->get_param('category'));
    $tag = sanitize_text_field((string) $request->get_param('tag'));
    $search = sanitize_text_field((string) $request->get_param('search'));
    $orderby = sanitize_text_field((string) $request->get_param('orderby'));

    if ($limit <= 0) {
        $limit = 20; // Por defecto.
    }
    // offset ya es >= 0 gracias a absint().

    // Construir argumentos para wc_get_products (devuelve precios/variaciones correctos).
    // Pedimos limit+1 para saber si hay página siguiente sin un COUNT extra.
    $args = array(
        'status' => 'publish',
        'limit' => $limit + 1,
        'offset' => $offset,
        'orderby' => 'date',
        'order' => 'DESC',
        'return' => 'objects',
    );

    // orderby=sales: más vendidos primero (contador total_sales de WooCommerce).
    if ('sales' === $orderby) {
        $args['orderby'] = 'meta_value_num';
        $args['meta_key'] = 'total_sales';
        $args['order'] = 'DESC';
    }

    // Filtro por categoría (slug). WC 'category' acepta slugs e incluye hijos por defecto.
    if (!empty($category)) {
        $args['category'] = array($category);
    }

    // Filtro por tag (slug).
    if (!empty($tag)) {
        $args['tag'] = array($tag);
    }

    // Búsqueda de texto en título/contenido.
    if (!empty($search)) {
        $args['s'] = $search;
    }

    $wc_products = wc_get_products($args);
    if (!is_array($wc_products)) {
        $wc_products = array();
    }

    // Determinar si hay página siguiente (obtuvimos más de $limit).
    $has_next_page = count($wc_products) > $limit;
    if ($has_next_page) {
        // Descartar el elemento extra usado solo para la detección.
        $wc_products = array_slice($wc_products, 0, $limit);
    }

    // Mapear al shape del frontend.
    $products = array();
    foreach ($wc_products as $wc_product) {
        $built = nakama_products_build_product($wc_product);
        if ($built) {
            $products[] = $built;
        }
    }

    // Paginación basada en offset. endCursor = String(offset+limit) si hay más, si no null.
    $end_cursor = $has_next_page ? (string) ($offset + $limit) : null;

    // categories/tags solo se incluyen cuando hay `search` y es la primera página (offset 0).
    $categories = array();
    $tags = array();
    if (!empty($search) && 0 === $offset) {
        $categories = nakama_products_search_categories($search);
        $tags = nakama_products_search_tags($search);
    }

    $response = rest_ensure_response(array(
        'products' => $products,
        'pageInfo' => array(
            'hasNextPage' => (bool) $has_next_page,
            'endCursor' => $end_cursor,
        ),
        'categories' => $categories,
        'tags' => $tags,
    ));

    return nakama_products_add_cors($response);
}

/**
 * Categorías (product_cat) cuyo nombre coincide con la búsqueda.
 * Shape WPCategory = { id, name, slug, parentSlug }.
 */
function nakama_products_search_categories($search)
{
    $terms = get_terms(array(
        'taxonomy' => 'product_cat',
        'hide_empty' => false,
        'search' => $search,
        'number' => 20,
    ));

    if (is_wp_error($terms) || empty($terms)) {
        return array();
    }

    $out = array();
    foreach ($terms as $term) {
        // Resolver el slug del padre (o null si es raíz).
        $parent_slug = null;
        if ($term->parent) {
            $parent = get_term($term->parent, 'product_cat');
            if ($parent && !is_wp_error($parent)) {
                $parent_slug = $parent->slug;
            }
        }

        $out[] = array(
            'id' => (int) $term->term_id,
            'name' => $term->name,
            'slug' => $term->slug,
            'parentSlug' => $parent_slug,
        );
    }

    return $out;
}

/**
 * Tags (product_tag) cuyo nombre coincide con la búsqueda.
 * Shape WPTag = { databaseId, name, slug }.
 */
function nakama_products_search_tags($search)
{
    $terms = get_terms(array(
        'taxonomy' => 'product_tag',
        'hide_empty' => false,
        'search' => $search,
        'number' => 20,
    ));

    if (is_wp_error($terms) || empty($terms)) {
        return array();
    }

    $out = array();
    foreach ($terms as $term) {
        $out[] = array(
            'databaseId' => (int) $term->term_id,
            'name' => $term->name,
            'slug' => $term->slug,
        );
    }

    return $out;
}

// ============================================================================
// 2) HANDLER: PRODUCTO ÚNICO POR SLUG
// ============================================================================
function nakama_products_single($request)
{
    $slug = sanitize_title((string) $request->get_param('slug'));

    if (empty($slug)) {
        return new WP_Error('missing_slug', 'El parámetro slug es requerido', array('status' => 400));
    }

    // Buscar el post por su post_name (slug) dentro del tipo 'product'.
    $post = get_page_by_path($slug, OBJECT, 'product');

    if (!$post || 'publish' !== $post->post_status) {
        return new WP_Error('not_found', 'Producto no encontrado', array('status' => 404));
    }

    $product = wc_get_product($post->ID);
    if (!$product) {
        return new WP_Error('not_found', 'Producto no encontrado', array('status' => 404));
    }

    $built = nakama_products_build_product($product);
    if (!$built) {
        return new WP_Error('not_found', 'Producto no encontrado', array('status' => 404));
    }

    return nakama_products_add_cors(rest_ensure_response($built));
}

// ============================================================================
// 3) HANDLER: LISTA DE SLUGS (rápida, $wpdb directo)
// ============================================================================
function nakama_products_slugs($request)
{
    global $wpdb;

    // Una sola consulta directa a wp_posts por velocidad (se llama en build time).
    $slugs = $wpdb->get_col(
        $wpdb->prepare(
            "SELECT post_name FROM {$wpdb->posts}
             WHERE post_type = %s AND post_status = %s AND post_name != ''",
            'product',
            'publish'
        )
    );

    if (!is_array($slugs)) {
        $slugs = array();
    }

    return nakama_products_add_cors(rest_ensure_response(array(
        'slugs' => array_values($slugs),
    )));
}

// ============================================================================
// 4) HANDLER: MODO MANTENIMIENTO
// ============================================================================
function nakama_get_maintenance_status()
{
    $enabled = get_option('nakama_maintenance_mode', 'off') === 'on';

    $message = get_option('nakama_maintenance_message', 'Estamos preparando nuevos diseños increíbles para ti. ¡Volvemos muy pronto!');
    $image = get_option('nakama_maintenance_image', 'https://nakamabordados.com/wp-content/uploads/2026/05/OPCR05-1.avif');
    $facebook = get_option('nakama_maintenance_fb', 'https://www.facebook.com/Nakamabordados');
    $instagram = get_option('nakama_maintenance_ig', 'https://www.instagram.com/nakama_bordados/');
    $tiktok = get_option('nakama_maintenance_tt', 'https://www.tiktok.com/@nakamabordados');

    return nakama_products_add_cors(rest_ensure_response(array(
        'maintenanceMode' => $enabled,
        'message' => $message,
        'image' => $image,
        'socialLinks' => array(
            'facebook' => $facebook,
            'instagram' => $instagram,
            'tiktok' => $tiktok,
        ),
    )));
}

function nakama_set_maintenance_status($request)
{
    $params = $request->get_json_params();
    $enabled = isset($params['enabled']) ? (bool) $params['enabled'] : false;

    update_option('nakama_maintenance_mode', $enabled ? 'on' : 'off');

    return nakama_products_add_cors(rest_ensure_response(array(
        'success' => true,
        'maintenanceMode' => $enabled,
    )));
}

// Bypassear el chequeo de nonce de WordPress solo para el endpoint de mantenimiento
add_filter('rest_authentication_errors', function ($result) {
    if (is_wp_error($result) && $result->get_error_code() === 'rest_cookie_invalid_nonce') {
        if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/nakama/v1/maintenance') !== false) {
            return null; // Bypassear error de nonce
        }
    }
    return $result;
}, 99);
