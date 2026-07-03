<?php
/**
 * Plugin Name: Nakama Hero Manager
 * Description: Editor del video/imagen del "hero" que se muestra en la portada (y opcionalmente por página). Expone la configuración vía REST para el frontend Next.js.
 * Version: 1.0
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Nombre de la opción única donde se guarda toda la configuración (JSON serializado por WP).
 */
if ( ! defined( 'NAKAMA_HERO_OPTION' ) ) {
    define( 'NAKAMA_HERO_OPTION', 'nakama_hero_config' );
}

/**
 * Devuelve la configuración por defecto (fallback) con los valores actuales del sitio.
 * Los .webm/.mp4 de la portada son los que hoy están hardcodeados en ScrollytellingHero.tsx.
 *
 * @return array
 */
function nakama_hero_default_config() {
    return array(
        // Portada (homepage) — video full-bleed, height 90vh.
        'home' => array(
            'webm' => 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.webm',
            'mp4'  => 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.mp4',
            'url'  => '', // Fallback de URL plana (opcional).
        ),
        // Override global opcional para todas las páginas con banda nk-store-hero.
        'all_pages' => array(
            'image' => '',
            'video' => '',
        ),
        // Heroes por página (opcional). Cada uno acepta imagen o video.
        'pages' => array(
            'store'                    => array( 'image' => '', 'video' => '' ),
            'faq'                      => array( 'image' => '', 'video' => '' ),
            'guia-de-tallas'           => array( 'image' => '', 'video' => '' ),
            'terminos-y-condiciones'   => array( 'image' => '', 'video' => '' ),
            'aviso-de-privacidad'      => array( 'image' => '', 'video' => '' ),
        ),
    );
}

/**
 * Obtiene la configuración guardada mezclada sobre los valores por defecto.
 *
 * @return array
 */
function nakama_hero_get_config() {
    $defaults = nakama_hero_default_config();
    $stored   = get_option( NAKAMA_HERO_OPTION, array() );

    if ( is_string( $stored ) ) {
        $decoded = json_decode( $stored, true );
        $stored  = is_array( $decoded ) ? $decoded : array();
    }

    if ( ! is_array( $stored ) ) {
        $stored = array();
    }

    // Merge recursivo simple: lo guardado gana, pero las llaves ausentes conservan el default.
    return nakama_hero_merge_config( $defaults, $stored );
}

/**
 * Merge recursivo de la config guardada sobre los defaults.
 *
 * @param array $defaults
 * @param array $override
 * @return array
 */
function nakama_hero_merge_config( $defaults, $override ) {
    $result = $defaults;
    foreach ( $override as $key => $value ) {
        if ( is_array( $value ) && isset( $result[ $key ] ) && is_array( $result[ $key ] ) ) {
            $result[ $key ] = nakama_hero_merge_config( $result[ $key ], $value );
        } else {
            $result[ $key ] = $value;
        }
    }
    return $result;
}

/* -------------------------------------------------------------------------
 * 1. REST API PÚBLICA
 * URL: https://nakamabordados.com/wp-json/nakama/v1/hero-config
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
    register_rest_route( 'nakama/v1', '/hero-config', array(
        'methods'             => 'GET',
        'callback'            => 'nakama_hero_rest_get',
        'permission_callback' => '__return_true', // Config pública, no sensible (solo URLs de display).
    ) );
} );

/**
 * Handler REST: devuelve la configuración del hero como JSON.
 *
 * @return WP_REST_Response
 */
function nakama_hero_rest_get() {
    $response_obj = rest_ensure_response( nakama_hero_get_config() );
    // Permitir consulta desde el entorno Next.js (local o cualquier origen).
    $response_obj->header( 'Access-Control-Allow-Origin', '*' );
    $response_obj->header( 'Access-Control-Allow-Methods', 'GET' );
    return $response_obj;
}

/* -------------------------------------------------------------------------
 * 2. MENÚ DE ADMINISTRACIÓN (solo administradores)
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
    add_menu_page(
        'Nakama Hero',            // Título de la página.
        'Nakama Hero',            // Título del menú.
        'manage_options',         // Capability: solo admins.
        'nakama-hero',            // Slug.
        'nakama_hero_render_admin_page',
        'dashicons-format-video', // Icono.
        59
    );
} );

/**
 * Encola wp.media (Media Library) solo en la página de este plugin.
 *
 * @param string $hook
 */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    if ( 'toplevel_page_nakama-hero' !== $hook ) {
        return;
    }
    wp_enqueue_media();
} );

/**
 * Procesa el guardado del formulario (POST) de forma segura.
 */
function nakama_hero_handle_save() {
    if ( ! isset( $_POST['nakama_hero_submit'] ) ) {
        return;
    }

    // Seguridad: nonce + capability.
    check_admin_referer( 'nakama_hero_save', 'nakama_hero_nonce' );
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'No tienes permisos para hacer esto.', 'nakama' ) );
    }

    $config = array(
        'home' => array(
            'webm' => isset( $_POST['home_webm'] ) ? esc_url_raw( wp_unslash( $_POST['home_webm'] ) ) : '',
            'mp4'  => isset( $_POST['home_mp4'] ) ? esc_url_raw( wp_unslash( $_POST['home_mp4'] ) ) : '',
            'url'  => isset( $_POST['home_url'] ) ? esc_url_raw( wp_unslash( $_POST['home_url'] ) ) : '',
        ),
        'all_pages' => array(
            'image' => isset( $_POST['all_pages_image'] ) ? esc_url_raw( wp_unslash( $_POST['all_pages_image'] ) ) : '',
            'video' => isset( $_POST['all_pages_video'] ) ? esc_url_raw( wp_unslash( $_POST['all_pages_video'] ) ) : '',
        ),
        'pages' => array(),
    );

    $page_keys = array( 'store', 'faq', 'guia-de-tallas', 'terminos-y-condiciones', 'aviso-de-privacidad' );
    foreach ( $page_keys as $key ) {
        $image_field = 'page_' . str_replace( '-', '_', $key ) . '_image';
        $video_field = 'page_' . str_replace( '-', '_', $key ) . '_video';
        $config['pages'][ $key ] = array(
            'image' => isset( $_POST[ $image_field ] ) ? esc_url_raw( wp_unslash( $_POST[ $image_field ] ) ) : '',
            'video' => isset( $_POST[ $video_field ] ) ? esc_url_raw( wp_unslash( $_POST[ $video_field ] ) ) : '',
        );
    }

    update_option( NAKAMA_HERO_OPTION, wp_json_encode( $config ) );

    add_settings_error( 'nakama_hero', 'saved', esc_html__( 'Configuración del hero guardada.', 'nakama' ), 'updated' );
}

/**
 * Renderiza un campo con botón de Media Library + input de URL.
 *
 * @param string $name     Nombre del input.
 * @param string $value    Valor actual.
 * @param string $label    Etiqueta visible.
 * @param string $mimetype 'video' | 'image' — filtro de la librería.
 */
function nakama_hero_media_field( $name, $value, $label, $mimetype = 'video' ) {
    ?>
    <p style="margin:0 0 16px;">
        <label for="<?php echo esc_attr( $name ); ?>" style="display:block;font-weight:600;margin-bottom:4px;">
            <?php echo esc_html( $label ); ?>
        </label>
        <input
            type="url"
            id="<?php echo esc_attr( $name ); ?>"
            name="<?php echo esc_attr( $name ); ?>"
            value="<?php echo esc_attr( $value ); ?>"
            class="regular-text nk-hero-url"
            placeholder="https://..."
            style="width:60%;max-width:640px;"
        />
        <button
            type="button"
            class="button nk-hero-media-btn"
            data-target="<?php echo esc_attr( $name ); ?>"
            data-type="<?php echo esc_attr( $mimetype ); ?>"
        >
            <?php esc_html_e( 'Elegir / Subir', 'nakama' ); ?>
        </button>
    </p>
    <?php
}

/**
 * Renderiza la página de administración.
 */
function nakama_hero_render_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    nakama_hero_handle_save();

    $config = nakama_hero_get_config();
    settings_errors( 'nakama_hero' );
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'Nakama Hero', 'nakama' ); ?></h1>
        <p><?php esc_html_e( 'Edita el video que se muestra en el hero de la portada. Los cambios se reflejan en el sitio Next.js a través del endpoint REST público.', 'nakama' ); ?></p>

        <form method="post" action="">
            <?php wp_nonce_field( 'nakama_hero_save', 'nakama_hero_nonce' ); ?>

            <h2><?php esc_html_e( 'Hero de la Portada (Homepage)', 'nakama' ); ?></h2>
            <div style="background:#f6f7f7;border-left:4px solid #2271b1;padding:12px 16px;margin:0 0 16px;max-width:820px;">
                <strong><?php esc_html_e( 'Tamaño actual:', 'nakama' ); ?></strong>
                <?php esc_html_e( 'video full-bleed (ancho 100%), alto 90vh, recortado con object-fit: cover y opacidad 0.7. Sube un video horizontal de alta resolución para mejores resultados.', 'nakama' ); ?>
            </div>

            <?php
            nakama_hero_media_field( 'home_webm', $config['home']['webm'], __( 'Video .webm (recomendado, más ligero)', 'nakama' ), 'video' );
            nakama_hero_media_field( 'home_mp4', $config['home']['mp4'], __( 'Video .mp4 (respaldo de compatibilidad)', 'nakama' ), 'video' );
            nakama_hero_media_field( 'home_url', $config['home']['url'], __( 'URL plana (fallback opcional, cualquier formato)', 'nakama' ), 'video' );
            ?>

            <hr style="margin:32px 0;" />

            <h2><?php esc_html_e( 'Opcional — Heroes por página', 'nakama' ); ?></h2>
            <div style="background:#fcf9e8;border-left:4px solid #dba617;padding:12px 16px;margin:0 0 16px;max-width:820px;">
                <?php esc_html_e( 'Estos campos aceptan URLs de imagen o video para el hero de cada página. La banda actual (nk-store-hero) es azul marino con padding 120px 24px 80px — respeta ese tamaño al elegir la imagen. Nota: por ahora solo la portada renderiza dinámicamente en Next.js; estas llaves quedan disponibles para uso futuro.', 'nakama' ); ?>
            </div>

            <h3><?php esc_html_e( 'Override global (todas las páginas)', 'nakama' ); ?></h3>
            <?php
            nakama_hero_media_field( 'all_pages_image', $config['all_pages']['image'], __( 'Imagen para todas las páginas', 'nakama' ), 'image' );
            nakama_hero_media_field( 'all_pages_video', $config['all_pages']['video'], __( 'Video para todas las páginas', 'nakama' ), 'video' );

            $page_labels = array(
                'store'                  => __( 'Tienda (store)', 'nakama' ),
                'faq'                    => __( 'Preguntas frecuentes (faq)', 'nakama' ),
                'guia-de-tallas'         => __( 'Guía de tallas (guia-de-tallas)', 'nakama' ),
                'terminos-y-condiciones' => __( 'Términos y condiciones (terminos-y-condiciones)', 'nakama' ),
                'aviso-de-privacidad'    => __( 'Aviso de privacidad (aviso-de-privacidad)', 'nakama' ),
            );

            foreach ( $page_labels as $key => $label ) {
                $image_field = 'page_' . str_replace( '-', '_', $key ) . '_image';
                $video_field = 'page_' . str_replace( '-', '_', $key ) . '_video';
                echo '<h3>' . esc_html( $label ) . '</h3>';
                nakama_hero_media_field( $image_field, $config['pages'][ $key ]['image'], __( 'Imagen', 'nakama' ), 'image' );
                nakama_hero_media_field( $video_field, $config['pages'][ $key ]['video'], __( 'Video', 'nakama' ), 'video' );
            }
            ?>

            <p style="margin-top:24px;">
                <button type="submit" name="nakama_hero_submit" value="1" class="button button-primary button-large">
                    <?php esc_html_e( 'Guardar configuración', 'nakama' ); ?>
                </button>
            </p>
        </form>

        <hr style="margin:32px 0;" />
        <p>
            <strong><?php esc_html_e( 'Endpoint REST público:', 'nakama' ); ?></strong>
            <code><?php echo esc_html( esc_url_raw( rest_url( 'nakama/v1/hero-config' ) ) ); ?></code>
        </p>
    </div>

    <script>
    ( function () {
        document.querySelectorAll( '.nk-hero-media-btn' ).forEach( function ( btn ) {
            btn.addEventListener( 'click', function ( e ) {
                e.preventDefault();
                var targetId = btn.getAttribute( 'data-target' );
                var type = btn.getAttribute( 'data-type' ) || 'video';
                var input = document.getElementById( targetId );
                if ( ! window.wp || ! window.wp.media ) {
                    return;
                }
                var frame = wp.media( {
                    title: 'Selecciona o sube un archivo',
                    button: { text: 'Usar este archivo' },
                    library: { type: type },
                    multiple: false
                } );
                frame.on( 'select', function () {
                    var attachment = frame.state().get( 'selection' ).first().toJSON();
                    if ( input && attachment && attachment.url ) {
                        input.value = attachment.url;
                    }
                } );
                frame.open();
            } );
        } );
    } )();
    </script>
    <?php
}
