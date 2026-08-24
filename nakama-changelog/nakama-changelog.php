<?php
/**
 * Plugin Name: Nakama Changelog
 * Description: Historial de cambios de Nakama en el Escritorio de WordPress y en una página exclusiva para administradores.
 * Version: 1.1.0
 * Author: Nakama Bordados
 * Requires PHP: 7.4
 * Text Domain: nakama-changelog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
define( 'NAKAMA_CHANGELOG_VERSION', '1.1.0' );
define( 'NAKAMA_CHANGELOG_PAGE', 'nakama-changelog' );

/**
 * Convierte una fecha ISO en el identificador público de una actualización.
 *
 * @param string $date Fecha en formato YYYY-MM-DD.
 * @return string
 */
function nakama_changelog_release_id( $date ) {
	return 'NK-' . $date;
}

/**
 * Fuente única del historial. El elemento más reciente siempre va primero.
 *
 * @return array<int, array<string, mixed>>
 */
function nakama_changelog_entries() {
	return array(
		array(
			'id'           => nakama_changelog_release_id( '2026-08-24' ),
			'date'         => '2026-08-24',
			'date_display' => '24 de agosto de 2026',
			'title'        => 'SKU internos y colores consistentes',
			'summary'      => 'Almacén y Producción ahora reconocen productos sin selector público de color, con un flujo administrativo seguro y los mismos nombres en español en web y app.',
			'groups'       => array(
				array(
					'icon'  => 'dashicons-archive',
					'label' => 'Almacén',
					'items' => array(
						'Los administradores pueden buscar un producto de WooCommerce, tomar automáticamente sus estilos y tallas, y asignar un color oculto a todas sus variaciones.',
						'Los nuevos SKU internos aparecen en el inventario sin agregar un selector de color al producto público.',
						'Al dejar de administrar un producto, se conserva el historial y solo se eliminan los SKU manuales que ya no tengan variaciones relacionadas.',
					),
				),
				array(
					'icon'  => 'dashicons-hammer',
					'label' => 'Producción',
					'items' => array(
						'Las órdenes sin color público muestran el color operativo configurado en Almacén.',
						'Bone, Feet, Black, White y Pink se presentan como Hueso, Kaki, Negro, Blanco y Rosa; Bottle Green se muestra como Verde botella.',
					),
				),
				array(
					'icon'  => 'dashicons-smartphone',
					'label' => 'APK de Producción',
					'items' => array(
						'La aplicación recibe por OTA las traducciones de colores y muestra automáticamente los SKU internos disponibles en Almacén.',
					),
				),
				array(
					'icon'  => 'dashicons-admin-plugins',
					'label' => 'Versiones',
					'items' => array(
						'Nakama Almacén se actualiza a 1.3.0, Nakama Panel de Producción a 2.1.0 y Nakama Changelog a 1.1.0.',
					),
				),
			),
		),
		array(
			'id'           => nakama_changelog_release_id( '2026-08-22' ),
			'date'         => '2026-08-22',
			'date_display' => '22 de agosto de 2026',
			'title'        => 'Cuenta, pagos y catálogo más confiables',
			'summary'      => 'Mejoramos la experiencia del cliente y alineamos las operaciones de tienda, promociones y Meta con los datos reales de WordPress.',
			'groups'       => array(
				array(
					'icon'  => 'dashicons-smartphone',
					'label' => 'Mi Cuenta',
					'items' => array(
						'En móvil, Resumen deja de repetir los accesos que ya están disponibles en la navegación principal.',
						'El inicio de sesión incorpora un acceso seguro para restablecer una contraseña olvidada.',
					),
				),
				array(
					'icon'  => 'dashicons-cart',
					'label' => 'Cotizaciones y pagos',
					'items' => array(
						'Las acciones de pago solo aparecen cuando el servidor confirma que la cotización es elegible.',
						'La cuenta mantiene compatibilidad mientras el campo GraphQL de elegibilidad se publica en todos los entornos.',
					),
				),
				array(
					'icon'  => 'dashicons-products',
					'label' => 'Catálogo y Meta',
					'items' => array(
						'El catálogo publica cada variación comprable con su propio ID, imagen, precio y existencias efectivas.',
						'Los eventos del Pixel usan los mismos IDs y agrupaciones que el catálogo de Meta.',
					),
				),
				array(
					'icon'  => 'dashicons-tickets-alt',
					'label' => 'Promociones',
					'items' => array(
						'Los productos asignados directamente a la categoría lisas quedan fuera de descuentos, envío gratis y meses sin intereses.',
						'Los mensajes promocionales se ocultan cuando el carrito no contiene productos elegibles.',
					),
				),
				array(
					'icon'  => 'dashicons-backup',
					'label' => 'Administración',
					'items' => array(
						'El Escritorio incorpora el sistema de cambios NK para que los administradores consulten cada actualización.',
					),
				),
			),
		),
	);
}

/** Registra la página de historial exclusiva para administradores. */
function nakama_changelog_register_page() {
	add_menu_page(
		'Cambios Nakama',
		'Cambios NK',
		'manage_options',
		NAKAMA_CHANGELOG_PAGE,
		'nakama_changelog_render_page',
		'dashicons-backup',
		58
	);
}
add_action( 'admin_menu', 'nakama_changelog_register_page' );

/**
 * Carga el diseño solo en el historial y en el Escritorio que contiene su widget.
 *
 * @param string $hook_suffix Identificador de la pantalla de administración.
 */
function nakama_changelog_enqueue_styles( $hook_suffix ) {
	$allowed_screens = array( 'index.php', 'toplevel_page_' . NAKAMA_CHANGELOG_PAGE );
	if ( ! current_user_can( 'manage_options' ) || ! in_array( $hook_suffix, $allowed_screens, true ) ) {
		return;
	}

	wp_enqueue_style(
		'nakama-changelog-admin',
		plugin_dir_url( __FILE__ ) . 'assets/admin.css',
		array(),
		NAKAMA_CHANGELOG_VERSION
	);
}
add_action( 'admin_enqueue_scripts', 'nakama_changelog_enqueue_styles' );

/** Añade un resumen de la actualización más reciente al Escritorio. */
function nakama_changelog_register_dashboard_widget() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	wp_add_dashboard_widget(
		'nakama_changelog_dashboard_widget',
		'Últimos cambios Nakama',
		'nakama_changelog_render_dashboard_widget'
	);
}
add_action( 'wp_dashboard_setup', 'nakama_changelog_register_dashboard_widget' );

/** Renderiza el resumen del Escritorio. */
function nakama_changelog_render_dashboard_widget() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$entries = nakama_changelog_entries();
	$latest  = reset( $entries );
	if ( ! $latest ) {
		return;
	}
	?>
	<div class="nk-changelog-widget">
		<div class="nk-changelog-widget__meta">
			<span class="nk-changelog-release-id"><?php echo esc_html( $latest['id'] ); ?></span>
			<time datetime="<?php echo esc_attr( $latest['date'] ); ?>"><?php echo esc_html( $latest['date_display'] ); ?></time>
		</div>
		<h3><?php echo esc_html( $latest['title'] ); ?></h3>
		<p><?php echo esc_html( $latest['summary'] ); ?></p>
		<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=' . NAKAMA_CHANGELOG_PAGE ) ); ?>">
			Ver historial completo
		</a>
	</div>
	<?php
}

/** Renderiza la página completa del historial. */
function nakama_changelog_render_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'No tienes permiso para consultar el historial de cambios.', 'nakama-changelog' ) );
	}

	$entries = nakama_changelog_entries();
	?>
	<div class="wrap nk-changelog">
		<section class="nk-changelog-hero" aria-labelledby="nk-changelog-title">
			<img
				class="nk-changelog-hero__art"
				src="<?php echo esc_url( plugin_dir_url( __FILE__ ) . 'assets/nakama-changelog-hero.png' ); ?>"
				alt=""
			/>
			<div class="nk-changelog-hero__content">
				<span class="nk-changelog-eyebrow">Bitácora de producto</span>
				<h1 id="nk-changelog-title">Cambios Nakama</h1>
				<p>El registro oficial de mejoras publicadas en la tienda y sus herramientas operativas.</p>
				<span class="nk-changelog-format">Sistema: NK + fecha</span>
			</div>
		</section>

		<div class="nk-changelog-intro">
			<div>
				<span class="dashicons dashicons-visibility" aria-hidden="true"></span>
			</div>
			<p>Cada bloque resume cambios visibles y operativos. El identificador usa el formato <strong>NK-AAAA-MM-DD</strong> para facilitar soporte, validación y seguimiento.</p>
		</div>

		<div class="nk-changelog-timeline">
			<?php foreach ( $entries as $entry ) : ?>
				<article class="nk-changelog-entry" aria-labelledby="<?php echo esc_attr( strtolower( $entry['id'] ) ); ?>">
					<header class="nk-changelog-entry__header">
						<div>
							<span class="nk-changelog-release-id"><?php echo esc_html( $entry['id'] ); ?></span>
							<time datetime="<?php echo esc_attr( $entry['date'] ); ?>"><?php echo esc_html( $entry['date_display'] ); ?></time>
						</div>
						<span class="nk-changelog-entry__status">Publicado</span>
					</header>

					<div class="nk-changelog-entry__body">
						<h2 id="<?php echo esc_attr( strtolower( $entry['id'] ) ); ?>"><?php echo esc_html( $entry['title'] ); ?></h2>
						<p class="nk-changelog-entry__summary"><?php echo esc_html( $entry['summary'] ); ?></p>

						<div class="nk-changelog-groups">
							<?php foreach ( $entry['groups'] as $group ) : ?>
								<section class="nk-changelog-group">
									<div class="nk-changelog-group__title">
										<span class="dashicons <?php echo esc_attr( $group['icon'] ); ?>" aria-hidden="true"></span>
										<h3><?php echo esc_html( $group['label'] ); ?></h3>
									</div>
									<ul>
										<?php foreach ( $group['items'] as $item ) : ?>
											<li><?php echo esc_html( $item ); ?></li>
										<?php endforeach; ?>
									</ul>
								</section>
							<?php endforeach; ?>
						</div>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
}
