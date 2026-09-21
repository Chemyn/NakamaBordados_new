<?php
/**
 * Private filesystem boundary for affiliate PDFs.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Private_Files {
	const DEFAULT_MAX_BYTES = 10485760;

	public static function validate_pdf_upload( array $file, $max_bytes = null, $mime_detector = null ) {
		$max_bytes = null === $max_bytes ? self::DEFAULT_MAX_BYTES : max( 1, (int) $max_bytes );
		if ( ! isset( $file['error'] ) || UPLOAD_ERR_OK !== (int) $file['error'] ) {
			return self::failure( 'upload_error', 'No se pudo recibir el archivo.' );
		}

		$name = isset( $file['name'] ) ? (string) $file['name'] : '';
		$path = isset( $file['tmp_name'] ) ? (string) $file['tmp_name'] : '';
		if ( 'pdf' !== strtolower( pathinfo( $name, PATHINFO_EXTENSION ) ) ) {
			return self::failure( 'invalid_extension', 'La constancia debe tener extensión PDF.' );
		}
		if ( '' === $path || ! is_file( $path ) || ! is_readable( $path ) ) {
			return self::failure( 'missing_file', 'No se encontró el archivo temporal.' );
		}

		$size = filesize( $path );
		if ( false === $size || $size <= 0 ) {
			return self::failure( 'empty_file', 'El PDF está vacío.' );
		}
		if ( $size > $max_bytes ) {
			return self::failure( 'file_too_large', 'El PDF supera el tamaño máximo permitido.' );
		}

		$mime = self::detected_mime( $path, $name, $mime_detector );
		$handle = fopen( $path, 'rb' );
		$signature = $handle ? fread( $handle, 5 ) : '';
		if ( $handle ) {
			fclose( $handle );
		}
		if ( 'application/pdf' !== $mime || '%PDF-' !== $signature ) {
			return self::failure( 'invalid_pdf', 'El archivo no es un PDF válido.' );
		}

		return array(
			'success'       => true,
			'original_name' => self::safe_original_name( $name ),
			'mime_type'     => 'application/pdf',
			'file_size'     => (int) $size,
			'sha256'        => hash_file( 'sha256', $path ),
		);
	}

	/** Move one validated upload below a non-public, deny-all directory. */
	public static function store_pdf( array $file, $area = 'fiscal', $mover = null, $base_override = null, $mime_detector = null ) {
		$validation = self::validate_pdf_upload( $file, null, $mime_detector );
		if ( empty( $validation['success'] ) ) {
			return $validation;
		}

		$area = preg_replace( '/[^a-z0-9_-]/', '', strtolower( (string) $area ) );
		if ( '' === $area ) {
			return self::failure( 'invalid_area', 'El área de almacenamiento no es válida.' );
		}

		$base = self::base_directory( $base_override );
		if ( ! self::ensure_private_directory( $base ) ) {
			return self::failure( 'storage_unavailable', 'El almacenamiento privado no está disponible.' );
		}
		$directory = $base . DIRECTORY_SEPARATOR . $area;
		if ( ! self::make_directory( $directory ) ) {
			return self::failure( 'storage_unavailable', 'No se pudo preparar la carpeta privada.' );
		}

		try {
			$random = bin2hex( random_bytes( 16 ) );
		} catch ( Exception $exception ) {
			return self::failure( 'random_unavailable', 'No se pudo generar una ruta privada segura.' );
		}
		$storage_key = $area . '/' . $random . '.pdf';
		$destination = $base . DIRECTORY_SEPARATOR . str_replace( '/', DIRECTORY_SEPARATOR, $storage_key );
		$moved = is_callable( $mover )
			? (bool) call_user_func( $mover, $file['tmp_name'], $destination )
			: ( is_uploaded_file( $file['tmp_name'] ) && move_uploaded_file( $file['tmp_name'], $destination ) );
		if ( ! $moved ) {
			return self::failure( 'move_failed', 'No se pudo guardar el PDF en el almacenamiento privado.' );
		}
		@chmod( $destination, 0600 );

		return array_merge( $validation, array( 'storage_key' => $storage_key ) );
	}

	public static function base_directory( $override = null ) {
		$base = null !== $override
			? (string) $override
			: dirname( rtrim( ABSPATH, '/\\' ) ) . DIRECTORY_SEPARATOR . 'nakama-private' . DIRECTORY_SEPARATOR . 'affiliates';
		if ( null === $override && function_exists( 'apply_filters' ) ) {
			$base = (string) apply_filters( 'nakama_affiliates_private_directory', $base );
		}
		return rtrim( $base, '/\\' );
	}

	public static function absolute_path( $storage_key, $base_override = null ) {
		$key = str_replace( '\\', '/', (string) $storage_key );
		if ( ! preg_match( '#^[a-z0-9_-]+/[a-f0-9]{32}\.pdf$#', $key ) ) {
			return false;
		}
		$base = self::base_directory( $base_override );
		$path = $base . DIRECTORY_SEPARATOR . str_replace( '/', DIRECTORY_SEPARATOR, $key );
		$base_real = realpath( $base );
		$path_real = realpath( $path );
		if ( false === $base_real || false === $path_real || 0 !== strpos( $path_real, $base_real . DIRECTORY_SEPARATOR ) ) {
			return false;
		}
		return $path_real;
	}

	/** Stream only after the REST permission and ownership checks have passed. */
	public static function stream_pdf_and_exit( $storage_key, $download_name ) {
		$path = self::absolute_path( $storage_key );
		if ( ! $path ) {
			return false;
		}

		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
		header( 'Content-Type: application/pdf' );
		header( 'Content-Length: ' . filesize( $path ) );
		header( "Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode( self::safe_original_name( $download_name ) ) );
		header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
		header( 'Pragma: no-cache' );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path );
		exit;
	}

	public static function delete( $storage_key ) {
		$path = self::absolute_path( $storage_key );
		return $path ? unlink( $path ) : false;
	}

	private static function ensure_private_directory( $base ) {
		if ( ! self::make_directory( $base ) ) {
			return false;
		}
		$guards = array(
			'.htaccess' => "Require all denied\nDeny from all\n",
			'web.config' => "<?xml version=\"1.0\"?><configuration><system.webServer><security><authorization><remove users=\"*\" roles=\"\" verbs=\"\"/><add accessType=\"Deny\" users=\"*\"/></authorization></security></system.webServer></configuration>",
			'index.php' => "<?php http_response_code(404); exit;\n",
		);
		foreach ( $guards as $name => $contents ) {
			$path = $base . DIRECTORY_SEPARATOR . $name;
			if ( ! is_file( $path ) && false === file_put_contents( $path, $contents, LOCK_EX ) ) {
				return false;
			}
		}
		return true;
	}

	private static function make_directory( $path ) {
		if ( is_dir( $path ) ) {
			return true;
		}
		return function_exists( 'wp_mkdir_p' ) ? wp_mkdir_p( $path ) : mkdir( $path, 0700, true );
	}

	private static function detected_mime( $path, $name, $detector = null ) {
		if ( is_callable( $detector ) ) {
			return (string) call_user_func( $detector, $path );
		}
		if ( class_exists( 'finfo' ) ) {
			$finfo = new finfo( FILEINFO_MIME_TYPE );
			return (string) $finfo->file( $path );
		}
		if ( function_exists( 'mime_content_type' ) ) {
			return (string) mime_content_type( $path );
		}
		if ( function_exists( 'wp_check_filetype_and_ext' ) ) {
			$checked = wp_check_filetype_and_ext( $path, $name, array( 'pdf' => 'application/pdf' ) );
			return isset( $checked['type'] ) ? (string) $checked['type'] : '';
		}
		return '';
	}

	private static function safe_original_name( $name ) {
		$name = basename( str_replace( '\\', '/', (string) $name ) );
		return function_exists( 'sanitize_file_name' ) ? sanitize_file_name( $name ) : preg_replace( '/[^A-Za-z0-9._-]/', '-', $name );
	}

	private static function failure( $code, $message ) {
		return array( 'success' => false, 'code' => (string) $code, 'message' => (string) $message );
	}
}
