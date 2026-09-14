<?php
/**
 * Plugin Name: Nakama Changelog
 * Description: Historial de cambios de Nakama en el Escritorio de WordPress y en una página exclusiva para administradores.
 * Version: 1.3.0
 * Author: Nakama Bordados
 * Requires PHP: 7.4
 * Text Domain: nakama-changelog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
define( 'NAKAMA_CHANGELOG_VERSION', '1.3.0' );
define( 'NAKAMA_CHANGELOG_PAGE', 'nakama-changelog' );
define( 'NAKAMA_CHANGELOG_GIT_API', 'https://api.github.com/repos/Chemyn/NakamaBordados_new/commits' );
define( 'NAKAMA_CHANGELOG_GIT_CACHE', 'nakama_changelog_git_commits_v2' );
define( 'NAKAMA_CHANGELOG_GIT_SNAPSHOT', 'nakama_changelog_git_snapshot' );
define( 'NAKAMA_CHANGELOG_GIT_LAST_SYNC', 'nakama_changelog_git_last_sync' );
define( 'NAKAMA_CHANGELOG_GIT_START', '2026-08-22T00:00:00Z' );
define( 'NAKAMA_CHANGELOG_RICH_START_SHA', '8083ed43b722808eb0c2c7c37f8e642413e3bae2' );
define( 'NAKAMA_CHANGELOG_RICH_START_AT', '2026-09-14T19:42:46Z' );

/**
 * Convierte una fecha ISO en el identificador público de una actualización.
 *
 * @param string $date Fecha en formato YYYY-MM-DD.
 * @return string
 */
function nakama_changelog_release_id( $date ) {
	return 'NK-' . $date;
}

/** Identificador único para una ficha generada por un commit. */
function nakama_changelog_commit_release_id( $date, $sha ) {
	return nakama_changelog_release_id( $date ) . '-' . substr( $sha, 0, 7 );
}

/**
 * Fuente única del historial. El elemento más reciente siempre va primero.
 *
 * @return array<int, array<string, mixed>>
 */
function nakama_changelog_local_entries() {
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
						'Nakama Almacén se actualiza a 1.3.0, Nakama Panel de Producción a 2.1.0 y Nakama Changelog a 1.2.0.',
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

/** Fecha legible estable en español sin depender del idioma configurado en WP. */
function nakama_changelog_date_display( $date ) {
	$parts  = array_map( 'intval', explode( '-', (string) $date ) );
	$months = array(
		1 => 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
		'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
	);
	if ( 3 !== count( $parts ) || ! isset( $months[ $parts[1] ] ) ) {
		return (string) $date;
	}
	return sprintf( '%d de %s de %d', $parts[2], $months[ $parts[1] ], $parts[0] );
}

/** Separa el tipo, el área y el título legible de un conventional commit. */
function nakama_changelog_commit_subject( $message ) {
	$lines      = preg_split( '/\R/', trim( (string) $message ) );
	$first_line = '';
	foreach ( (array) $lines as $line ) {
		$line = trim( wp_strip_all_tags( (string) $line ) );
		if ( '' !== $line ) {
			$first_line = $line;
			break;
		}
	}

	$type  = '';
	$scope = '';
	$title = $first_line;
	if ( preg_match( '/^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/iu', $first_line, $match ) ) {
		$type  = strtolower( $match[1] );
		$scope = isset( $match[2] ) ? strtolower( $match[2] ) : '';
		$title = $match[3];
	}

	$title = sanitize_text_field( $title );
	if ( '' === $title ) {
		$title = 'Actualización del proyecto';
	}

	return array(
		'type'  => $type,
		'scope' => $scope,
		'title' => ucfirst( $title ),
	);
}

/** Obtiene los párrafos editoriales del cuerpo anterior a los bloques NK. */
function nakama_changelog_commit_paragraphs( $message ) {
	$lines        = preg_split( '/\R/', trim( (string) $message ) );
	$seen_subject = false;
	$current      = array();
	$paragraphs   = array();

	foreach ( (array) $lines as $line ) {
		$line = trim( wp_strip_all_tags( (string) $line ) );
		if ( ! $seen_subject ) {
			if ( '' !== $line ) {
				$seen_subject = true;
			}
			continue;
		}
		if ( in_array( strtoupper( $line ), array( 'NK-RELEASE:', 'NK-CHANGELOG:' ), true ) ) {
			break;
		}
		if ( '' === $line ) {
			if ( $current ) {
				$paragraphs[] = sanitize_text_field( implode( ' ', $current ) );
				$current = array();
			}
			continue;
		}
		$current[] = $line;
	}

	if ( $current ) {
		$paragraphs[] = sanitize_text_field( implode( ' ', $current ) );
	}

	return array_values( array_filter( array_unique( $paragraphs ) ) );
}

/** Asigna un nombre e icono consistentes a cada área editorial. */
function nakama_changelog_group_presentation( $label = '', $scope = '', $type = '' ) {
	$presentations = array(
		'mi-cuenta'          => array( 'Mi Cuenta', 'dashicons-admin-users' ),
		'account'            => array( 'Mi Cuenta', 'dashicons-admin-users' ),
		'cuenta'             => array( 'Mi Cuenta', 'dashicons-admin-users' ),
		'checkout'           => array( 'Checkout y pagos', 'dashicons-cart' ),
		'pagos'              => array( 'Checkout y pagos', 'dashicons-cart' ),
		'produccion'         => array( 'Producción', 'dashicons-hammer' ),
		'production'         => array( 'Producción', 'dashicons-hammer' ),
		'almacen'            => array( 'Almacén', 'dashicons-archive' ),
		'warehouse'          => array( 'Almacén', 'dashicons-archive' ),
		'sesion-y-seguridad' => array( 'Sesión y seguridad', 'dashicons-lock' ),
		'auth'               => array( 'Sesión y seguridad', 'dashicons-lock' ),
		'session'            => array( 'Sesión y seguridad', 'dashicons-lock' ),
		'catalogo'           => array( 'Catálogo', 'dashicons-products' ),
		'productos'          => array( 'Catálogo', 'dashicons-products' ),
		'cambios-nk'         => array( 'Cambios NK', 'dashicons-backup' ),
		'changelog'          => array( 'Cambios NK', 'dashicons-backup' ),
		'pruebas-y-calidad'  => array( 'Pruebas y calidad', 'dashicons-yes-alt' ),
		'tests'              => array( 'Pruebas y calidad', 'dashicons-yes-alt' ),
	);
	$type_defaults = array(
		'fix'      => array( 'Correcciones', 'dashicons-admin-tools' ),
		'feat'     => array( 'Nuevas funciones', 'dashicons-star-filled' ),
		'perf'     => array( 'Rendimiento', 'dashicons-performance' ),
		'test'     => array( 'Pruebas y calidad', 'dashicons-yes-alt' ),
		'docs'     => array( 'Documentación', 'dashicons-media-document' ),
		'build'    => array( 'Versiones', 'dashicons-admin-plugins' ),
		'ci'       => array( 'Automatización', 'dashicons-controls-repeat' ),
		'refactor' => array( 'Mejoras internas', 'dashicons-admin-tools' ),
		'chore'    => array( 'Mantenimiento', 'dashicons-admin-generic' ),
	);

	$explicit_label = sanitize_text_field( $label );
	$key_source     = '' !== $explicit_label ? $explicit_label : $scope;
	$key            = sanitize_title( $key_source );
	if ( isset( $presentations[ $key ] ) ) {
		return array(
			'label' => '' !== $explicit_label ? $explicit_label : $presentations[ $key ][0],
			'icon'  => $presentations[ $key ][1],
		);
	}
	if ( '' !== $explicit_label ) {
		return array( 'label' => $explicit_label, 'icon' => 'dashicons-admin-generic' );
	}
	if ( isset( $type_defaults[ $type ] ) ) {
		return array( 'label' => $type_defaults[ $type ][0], 'icon' => $type_defaults[ $type ][1] );
	}
	return array( 'label' => 'Proyecto', 'icon' => 'dashicons-admin-generic' );
}

/**
 * Convierte NK-RELEASE en una ficha y genera un fallback presentable si falta.
 *
 * NK-RELEASE:
 * Resumen: Explicación breve para administradores.
 * Grupo: Mi Cuenta
 * - Cambio visible y verificable.
 */
function nakama_changelog_release_metadata( $message ) {
	$subject       = nakama_changelog_commit_subject( $message );
	$paragraphs    = nakama_changelog_commit_paragraphs( $message );
	$fallback      = $paragraphs ? array_shift( $paragraphs ) : 'La actualización ya está disponible para los administradores.';
	$summary       = '';
	$groups        = array();
	$current_group = -1;
	$inside        = false;
	$lines         = preg_split( '/\R/', trim( (string) $message ) );

	foreach ( (array) $lines as $line ) {
		$line = trim( wp_strip_all_tags( (string) $line ) );
		if ( 'NK-RELEASE:' === strtoupper( $line ) ) {
			$inside = true;
			continue;
		}
		if ( ! $inside ) {
			continue;
		}
		if ( preg_match( '/^Resumen:\s*(.+)$/iu', $line, $match ) ) {
			$summary = sanitize_text_field( $match[1] );
			continue;
		}
		if ( preg_match( '/^Grupo:\s*(.+)$/iu', $line, $match ) ) {
			$presentation = nakama_changelog_group_presentation( $match[1], $subject['scope'], $subject['type'] );
			$groups[] = array(
				'icon'  => $presentation['icon'],
				'label' => $presentation['label'],
				'items' => array(),
			);
			$current_group = count( $groups ) - 1;
			continue;
		}
		if ( preg_match( '/^[-*]\s+(.+)$/u', $line, $match ) ) {
			if ( $current_group < 0 ) {
				$presentation = nakama_changelog_group_presentation( '', $subject['scope'], $subject['type'] );
				$groups[] = array(
					'icon'  => $presentation['icon'],
					'label' => $presentation['label'],
					'items' => array(),
				);
				$current_group = 0;
			}
			$groups[ $current_group ]['items'][] = sanitize_text_field( $match[1] );
		}
	}

	$groups = array_values( array_filter( $groups, function ( $group ) {
		return ! empty( $group['items'] );
	} ) );
	if ( ! $groups ) {
		$presentation = nakama_changelog_group_presentation( '', $subject['scope'], $subject['type'] );
		$groups[] = array(
			'icon'  => $presentation['icon'],
			'label' => $presentation['label'],
			'items' => $paragraphs ? $paragraphs : array( $fallback ),
		);
	}

	return array(
		'title'   => $subject['title'],
		'summary' => '' !== $summary ? $summary : $fallback,
		'groups'  => $groups,
	);
}

/** Solo los commits posteriores a 8083ed4 usan una ficha independiente. */
function nakama_changelog_is_rich_commit( $commit ) {
	if ( ! is_array( $commit ) || empty( $commit['sha'] ) || NAKAMA_CHANGELOG_RICH_START_SHA === $commit['sha'] ) {
		return false;
	}
	$stamp  = ! empty( $commit['timestamp'] ) ? strtotime( $commit['timestamp'] ) : false;
	$cutoff = strtotime( NAKAMA_CHANGELOG_RICH_START_AT );
	return $stamp && $cutoff && $stamp > $cutoff;
}

/** Construye la entrada completa de un único commit. */
function nakama_changelog_git_entry( $commit ) {
	$metadata = nakama_changelog_release_metadata( $commit['message'] );
	return array(
		'id'           => nakama_changelog_commit_release_id( $commit['date'], $commit['sha'] ),
		'date'         => $commit['date'],
		'date_display' => nakama_changelog_date_display( $commit['date'] ),
		'timestamp'    => $commit['timestamp'],
		'title'        => $metadata['title'],
		'summary'      => $metadata['summary'],
		'groups'       => $metadata['groups'],
		'source_sha'   => $commit['sha'],
		'source_url'   => isset( $commit['url'] ) ? $commit['url'] : '',
	);
}

/**
 * Convierte un mensaje Git en notas para administradores.
 *
 * Un commit puede incluir notas explícitas:
 * NK-CHANGELOG:
 * - Cambio visible uno.
 * - Cambio visible dos.
 *
 * Sin ese bloque se utiliza y humaniza el encabezado conventional-commit.
 */
function nakama_changelog_commit_items( $message ) {
	$lines       = preg_split( '/\R/', trim( (string) $message ) );
	$inside      = false;
	$explicit    = array();
	$first_line  = '';

	foreach ( (array) $lines as $line ) {
		$line = trim( wp_strip_all_tags( (string) $line ) );
		if ( '' === $first_line && '' !== $line ) {
			$first_line = $line;
		}
		if ( 'NK-CHANGELOG:' === strtoupper( $line ) ) {
			$inside = true;
			continue;
		}
		if ( $inside && preg_match( '/^[-*]\s+(.+)$/u', $line, $match ) ) {
			$explicit[] = sanitize_text_field( $match[1] );
		}
	}

	if ( $explicit ) {
		return array_values( array_unique( $explicit ) );
	}
	if ( '' === $first_line ) {
		return array();
	}

	$labels = array(
		'feat'     => 'Nueva función',
		'fix'      => 'Corrección',
		'refactor' => 'Mejora técnica',
		'perf'     => 'Rendimiento',
		'docs'     => 'Documentación',
		'test'     => 'Pruebas',
		'build'    => 'Compilación',
		'ci'       => 'Automatización',
		'chore'    => 'Mantenimiento',
	);
	$label = 'Cambio';
	$text  = $first_line;
	if ( preg_match( '/^([a-z]+)(?:\([^)]*\))?!?:\s*(.+)$/i', $first_line, $match ) ) {
		$type  = strtolower( $match[1] );
		$label = isset( $labels[ $type ] ) ? $labels[ $type ] : 'Cambio';
		$text  = $match[2];
	}

	return array( $label . ': ' . sanitize_text_field( $text ) );
}

/** Última copia válida de GitHub; evita que una caída borre el historial. */
function nakama_changelog_git_snapshot() {
	$snapshot = get_option( NAKAMA_CHANGELOG_GIT_SNAPSHOT, array() );
	return is_array( $snapshot ) ? $snapshot : array();
}

/**
 * Descarga los commits recientes de main y los fusiona con el snapshot local.
 * La API es pública: deliberadamente no se envía ni almacena ningún token.
 */
function nakama_changelog_git_commits( $force = false ) {
	if ( ! $force ) {
		$cached = get_transient( NAKAMA_CHANGELOG_GIT_CACHE );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}
	}

	$url = add_query_arg(
		array(
			'sha'      => 'main',
			'per_page' => 50,
		),
		NAKAMA_CHANGELOG_GIT_API
	);
	$response = wp_remote_get(
		$url,
		array(
			'timeout'             => 7,
			'redirection'         => 2,
			'limit_response_size' => 2 * MB_IN_BYTES,
			'headers'             => array(
				'Accept'               => 'application/vnd.github+json',
				'X-GitHub-Api-Version' => '2022-11-28',
				'User-Agent'           => 'Nakama-Changelog/' . NAKAMA_CHANGELOG_VERSION,
			),
		)
	);

	$snapshot = nakama_changelog_git_snapshot();
	if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		set_transient( NAKAMA_CHANGELOG_GIT_CACHE, $snapshot, 5 * MINUTE_IN_SECONDS );
		return $snapshot;
	}

	$payload = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $payload ) ) {
		set_transient( NAKAMA_CHANGELOG_GIT_CACHE, $snapshot, 5 * MINUTE_IN_SECONDS );
		return $snapshot;
	}

	$by_sha = array();
	foreach ( $snapshot as $commit ) {
		if ( is_array( $commit ) && ! empty( $commit['sha'] ) ) {
			$by_sha[ $commit['sha'] ] = $commit;
		}
	}

	$start = strtotime( NAKAMA_CHANGELOG_GIT_START );
	foreach ( $payload as $raw ) {
		$sha     = isset( $raw['sha'] ) ? strtolower( (string) $raw['sha'] ) : '';
		$message = isset( $raw['commit']['message'] ) ? (string) $raw['commit']['message'] : '';
		$iso     = isset( $raw['commit']['committer']['date'] )
			? (string) $raw['commit']['committer']['date']
			: ( isset( $raw['commit']['author']['date'] ) ? (string) $raw['commit']['author']['date'] : '' );
		$stamp   = strtotime( $iso );
		if ( ! preg_match( '/^[a-f0-9]{40}$/', $sha ) || '' === $message || ! $stamp || $stamp < $start ) {
			continue;
		}
		$date = function_exists( 'wp_date' ) ? wp_date( 'Y-m-d', $stamp, wp_timezone() ) : gmdate( 'Y-m-d', $stamp );
		$by_sha[ $sha ] = array(
			'sha'       => $sha,
			'date'      => $date,
			'timestamp' => gmdate( 'c', $stamp ),
			'message'   => sanitize_textarea_field( $message ),
			'url'       => isset( $raw['html_url'] ) ? esc_url_raw( $raw['html_url'] ) : '',
		);
	}

	$snapshot = array_values( $by_sha );
	usort( $snapshot, function ( $a, $b ) {
		$a_time = isset( $a['timestamp'] ) ? $a['timestamp'] : $a['date'];
		$b_time = isset( $b['timestamp'] ) ? $b['timestamp'] : $b['date'];
		return strcmp( $b_time, $a_time );
	} );
	$snapshot = array_slice( $snapshot, 0, 500 );

	update_option( NAKAMA_CHANGELOG_GIT_SNAPSHOT, $snapshot, false );
	update_option( NAKAMA_CHANGELOG_GIT_LAST_SYNC, current_time( 'mysql' ), false );
	set_transient( NAKAMA_CHANGELOG_GIT_CACHE, $snapshot, 15 * MINUTE_IN_SECONDS );
	return $snapshot;
}

/** Combina las entradas editoriales incluidas en el plugin con la actividad Git. */
function nakama_changelog_merge_git_entries( $entries, $commits ) {
	$index = array();
	foreach ( $entries as $position => $entry ) {
		$index[ $entry['date'] ] = $position;
	}

	$by_date = array();
	foreach ( $commits as $commit ) {
		if ( ! is_array( $commit ) || empty( $commit['date'] ) || empty( $commit['message'] ) ) {
			continue;
		}
		if ( nakama_changelog_is_rich_commit( $commit ) ) {
			$entries[] = nakama_changelog_git_entry( $commit );
			continue;
		}
		foreach ( nakama_changelog_commit_items( $commit['message'] ) as $item ) {
			$short = ! empty( $commit['sha'] ) ? substr( $commit['sha'], 0, 7 ) : '';
			$note  = $item . ( $short ? ' · Git ' . $short : '' );
			$by_date[ $commit['date'] ][] = $note;
		}
	}

	foreach ( $by_date as $date => $items ) {
		$group = array(
			'icon'  => 'dashicons-randomize',
			'label' => 'Actividad Git',
			'items' => array_values( array_unique( $items ) ),
		);
		if ( isset( $index[ $date ] ) ) {
			$entries[ $index[ $date ] ]['groups'][] = $group;
			continue;
		}
		$entries[] = array(
			'id'           => nakama_changelog_release_id( $date ),
			'date'         => $date,
			'date_display' => nakama_changelog_date_display( $date ),
			'title'        => 'Actualización automática desde Git',
			'summary'      => 'Cambios publicados en la rama principal y sincronizados automáticamente con WordPress.',
			'groups'       => array( $group ),
		);
	}

	usort( $entries, function ( $a, $b ) {
		$a_time = isset( $a['timestamp'] ) ? $a['timestamp'] : $a['date'] . 'T00:00:00Z';
		$b_time = isset( $b['timestamp'] ) ? $b['timestamp'] : $b['date'] . 'T00:00:00Z';
		$by_time = strcmp( $b_time, $a_time );
		return 0 !== $by_time ? $by_time : strcmp( $b['id'], $a['id'] );
	} );
	return $entries;
}

/** Fuente final del widget y de la pestaña de administración. */
function nakama_changelog_entries() {
	return nakama_changelog_merge_git_entries(
		nakama_changelog_local_entries(),
		nakama_changelog_git_commits()
	);
}

/** Sincronización horaria aunque ningún administrador abra el Escritorio. */
function nakama_changelog_refresh_git_snapshot() {
	nakama_changelog_git_commits( true );
}
add_action( 'nakama_changelog_sync_git', 'nakama_changelog_refresh_git_snapshot' );

function nakama_changelog_schedule_sync() {
	if ( ! wp_next_scheduled( 'nakama_changelog_sync_git' ) ) {
		wp_schedule_event( time() + MINUTE_IN_SECONDS, 'hourly', 'nakama_changelog_sync_git' );
	}
}
add_action( 'init', 'nakama_changelog_schedule_sync' );

register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'nakama_changelog_sync_git' );
} );

/** Actualización manual autenticada para validar un push sin esperar al caché. */
function nakama_changelog_handle_manual_refresh() {
	if ( ! is_admin() || ! current_user_can( 'manage_options' ) || ! isset( $_GET['nakama_changelog_refresh'] ) ) {
		return;
	}
	check_admin_referer( 'nakama_changelog_refresh_git' );
	delete_transient( NAKAMA_CHANGELOG_GIT_CACHE );
	nakama_changelog_git_commits( true );
	wp_safe_redirect( add_query_arg(
		array( 'page' => NAKAMA_CHANGELOG_PAGE, 'git-refreshed' => '1' ),
		admin_url( 'admin.php' )
	) );
	exit;
}
add_action( 'admin_init', 'nakama_changelog_handle_manual_refresh' );

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
	$preview_items = array();
	foreach ( $latest['groups'] as $group ) {
		if ( ! empty( $group['items'] ) ) {
			$preview_items = array_slice( $group['items'], 0, 3 );
			break;
		}
	}
	?>
	<div class="nk-changelog-widget">
		<div class="nk-changelog-widget__meta">
			<span class="nk-changelog-release-id"><?php echo esc_html( $latest['id'] ); ?></span>
			<time datetime="<?php echo esc_attr( $latest['date'] ); ?>"><?php echo esc_html( $latest['date_display'] ); ?></time>
		</div>
		<h3><?php echo esc_html( $latest['title'] ); ?></h3>
		<p><?php echo esc_html( $latest['summary'] ); ?></p>
		<?php if ( $preview_items ) : ?>
			<ul class="nk-changelog-widget__items">
				<?php foreach ( $preview_items as $item ) : ?>
					<li><?php echo esc_html( $item ); ?></li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
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

	$entries     = nakama_changelog_entries();
	$last_sync   = (string) get_option( NAKAMA_CHANGELOG_GIT_LAST_SYNC, '' );
	$sync_label  = $last_sync ? 'Última sincronización: ' . $last_sync : 'La primera sincronización está pendiente.';
	$refresh_url = wp_nonce_url(
		add_query_arg(
			array( 'page' => NAKAMA_CHANGELOG_PAGE, 'nakama_changelog_refresh' => '1' ),
			admin_url( 'admin.php' )
		),
		'nakama_changelog_refresh_git'
	);
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
				<span class="nk-changelog-format">Sistema: una ficha por commit</span>
			</div>
		</section>

		<div class="nk-changelog-intro">
			<div>
				<span class="dashicons dashicons-visibility" aria-hidden="true"></span>
			</div>
			<p>Cada ficha resume un commit con sus cambios visibles y operativos. Los nuevos identificadores usan <strong>NK-AAAA-MM-DD-GIT</strong> para facilitar soporte, validación y seguimiento.</p>
		</div>

		<div class="nk-changelog-syncbar" role="status">
			<div>
				<span class="dashicons dashicons-update" aria-hidden="true"></span>
				<p>
					<strong>Git conectado · rama main</strong>
					<span><?php echo esc_html( $sync_label ); ?></span>
				</p>
			</div>
			<a class="button button-secondary" href="<?php echo esc_url( $refresh_url ); ?>">Actualizar ahora</a>
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
