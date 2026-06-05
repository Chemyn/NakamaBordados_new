<?php
/**
 * Plugin Name: Nakama Admin Theme
 * Description: Personaliza el panel de administración de WordPress con el estilo visual (Manga/Pirata) de Nakama Bordados.
 * Version: 1.0
 * Author: Nakama
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action('admin_enqueue_scripts', 'nakama_admin_styles');
add_action('login_enqueue_scripts', 'nakama_admin_styles');

function nakama_admin_styles() {
    echo '<style>
        :root {
            --nk-primary: #FF3B30;
            --nk-bg: #f4f1ea;
            --nk-border: #1a1a1a;
        }
        body.wp-admin, body.login {
            background-color: var(--nk-bg) !important;
            background-image: radial-gradient(#d5d1c8 1px, transparent 1px) !important;
            background-size: 20px 20px !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        }
        #wpadminbar {
            background: #1a1a1a !important;
            border-bottom: 2px solid var(--nk-primary) !important;
        }
        #adminmenu, #adminmenuback, #adminmenuwrap {
            background-color: #fff !important;
            border-right: 3px solid var(--nk-border) !important;
        }
        /* Iconos: Forzar contraste en todos los estados */
        #adminmenu div.wp-menu-image:before, 
        #adminmenu div.wp-menu-image svg path,
        #adminmenu li.menu-top:hover div.wp-menu-image:before,
        #adminmenu li.opensub div.wp-menu-image:before {
            color: #1a1a1a !important;
            fill: #1a1a1a !important;
            opacity: 1 !important;
        }
        #adminmenu a {
            color: #1a1a1a !important;
            font-weight: 700 !important;
        }
        
        /* Submenús: Estilo Nakama */
        #adminmenu .wp-submenu,
        #adminmenu .wp-submenu-wrap,
        #adminmenu .wp-submenu ul {
            background-color: #fff !important;
            border-left: 1px solid #eee !important;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.05) !important;
        }
        #adminmenu .wp-submenu a {
            color: #444 !important;
            font-weight: 600 !important;
            padding: 8px 12px !important;
        }
        #adminmenu .wp-submenu a:hover {
            color: var(--nk-primary) !important;
            background: #fff5f5 !important;
        }

        #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu,
        #adminmenu li.current a.menu-top,
        #adminmenu .wp-submenu li.current a {
            background: var(--nk-primary) !important;
            color: #fff !important;
        }

        /* Forzar iconos BLANCOS solo cuando el fondo es ROJO (activo) */
        #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu div.wp-menu-image:before,
        #adminmenu li.current a.menu-top div.wp-menu-image:before,
        #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu svg path,
        #adminmenu li.current a.menu-top svg path {
            color: #fff !important;
            fill: #fff !important;
        }

        /* Ajustes Responsivos (Mobile) */
        @media screen and (max-width: 782px) {
            #adminmenu {
                border-right: none !important;
                border-bottom: 3px solid var(--nk-border) !important;
            }
            .wp-responsive-open #wpadminbar #wp-admin-bar-menu-toggle a {
                background: var(--nk-primary) !important;
            }
            #adminmenu li.menu-top {
                border-bottom: 1px solid #eee !important;
            }
            #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu {
                margin: 0 !important;
                border-radius: 0 !important;
            }
        }
        .wp-core-ui .button-primary {
            background: var(--nk-primary) !important;
            border-color: #000 !important;
            border-radius: 0 !important;
            box-shadow: 3px 3px 0px #000 !important;
            color: #fff !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            transition: all 0.2s;
        }
        .wp-core-ui .button-primary:hover {
            transform: translate(2px, 2px);
            box-shadow: 1px 1px 0px #000 !important;
        }
        .postbox {
            border: 3px solid #000 !important;
            border-radius: 0 !important;
            box-shadow: 4px 4px 0px #000 !important;
        }
        .login form {
            border: 4px solid #000 !important;
            box-shadow: 8px 8px 0px #000 !important;
            border-radius: 0 !important;
        }
        .login h1 a {
            background-image: url("https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png") !important;
            background-size: contain !important;
            width: 100% !important;
        }
    </style>';
}
