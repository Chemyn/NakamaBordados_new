<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Repositorio y reglas de vigencia de los códigos públicos de Nakama.
 *
 * Estos códigos no son WC_Coupon: viven en una opción independiente y el
 * motor los convierte en candidatos de promoción primaria.
 */
class Nakama_Discount_Codes {
	const SCHEMA_VERSION = 2;
	const SELECTION_PREFIX = 'public_code:';
	const ENTRY_AUTOMATIC = 'automatic';
	const ENTRY_MANUAL = 'manual';

	public static function set_defaults() {
		if ( false === get_option( NAKAMA_DISC_CODES_OPTION, false ) ) {
			update_option( NAKAMA_DISC_CODES_OPTION, self::empty_collection() );
			return;
		}

		self::maybe_upgrade();
	}

	public static function empty_collection() {
		return array(
			'version' => self::SCHEMA_VERSION,
			'items'   => array(),
		);
	}

	/** Devuelve la colección persistida con una forma estable. */
	public static function collection() {
		$value = get_option( NAKAMA_DISC_CODES_OPTION, self::empty_collection() );
		return self::normalize_collection( $value );
	}

	/** Persiste las migraciones de esquema sin cambiar el comportamiento publicado. */
	public static function maybe_upgrade() {
		$value = get_option( NAKAMA_DISC_CODES_OPTION, false );
		if ( false === $value ) {
			update_option( NAKAMA_DISC_CODES_OPTION, self::empty_collection() );
			return;
		}

		$normalized = self::normalize_collection( $value );
		if ( $normalized !== $value ) {
			update_option( NAKAMA_DISC_CODES_OPTION, $normalized );
		}
	}

	private static function normalize_collection( $value ) {
		if ( ! is_array( $value ) ) {
			return self::empty_collection();
		}

		// Compatibilidad defensiva con una lista plana de una versión preliminar.
		if ( ! isset( $value['items'] ) && isset( $value[0] ) ) {
			$value = array( 'version' => self::SCHEMA_VERSION, 'items' => $value );
		}

		$items = isset( $value['items'] ) && is_array( $value['items'] )
			? $value['items']
			: array();
		foreach ( $items as $id => $record ) {
			if ( ! is_array( $record ) ) {
				unset( $items[ $id ] );
				continue;
			}
			$record['entry_mode'] = self::entry_mode( $record );
			$items[ $id ] = $record;
		}

		return array(
			'version' => self::SCHEMA_VERSION,
			'items'   => $items,
		);
	}

	public static function all() {
		$collection = self::collection();
		return $collection['items'];
	}

	/**
	 * Sanitiza el formulario completo. Si alguna fila es inválida se conserva
	 * la colección anterior para no perder cambios ya publicados.
	 */
	public static function sanitize( $input ) {
		$previous = self::collection();
		$rows = isset( $input['items'] ) && is_array( $input['items'] )
			? $input['items']
			: array();
		$out = array();
		$seen = array();
		$has_errors = false;
		$removal_requested = false;
		foreach ( $rows as $row_key => $row ) {
			if ( 0 !== strpos( (string) $row_key, 'new' ) && is_array( $row ) && ! empty( $row['remove'] ) ) {
				$removal_requested = true;
				break;
			}
		}

		foreach ( $rows as $row_key => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			if ( ! empty( $row['remove'] ) ) {
				continue;
			}

			$is_new = 0 === strpos( (string) $row_key, 'new' );
			$create_requested = $is_new && ! empty( $row['create'] );
			$code = isset( $row['code'] ) ? self::normalize_code( $row['code'] ) : '';
			$raw_percentage = isset( $row['percentage'] ) ? trim( (string) $row['percentage'] ) : '';
			$start = isset( $row['start'] ) ? sanitize_text_field( $row['start'] ) : '';
			$end   = isset( $row['end'] ) ? sanitize_text_field( $row['end'] ) : '';
			$entry_mode = isset( $row['entry_mode'] ) ? sanitize_key( $row['entry_mode'] ) : '';
			$has_creation_values = '' !== $code || '' !== $raw_percentage || '' !== $start || '' !== $end || '' !== $entry_mode;

			// Una eliminación explícita no debe quedar bloqueada por un borrador
			// incompleto que también viaje en el mismo formulario.
			if ( $is_new && $removal_requested && ! $create_requested ) {
				continue;
			}

			// La fila vacía del formulario de creación no representa un error.
			if ( $is_new && ! $create_requested && ! $has_creation_values ) {
				continue;
			}

			$row_errors = array();
			if ( '' === $code ) {
				$row_errors[] = __( 'Escribe un código.', 'nakama-discounts' );
			} elseif ( ! preg_match( '/^[A-Z0-9_-]+$/', $code ) ) {
				$row_errors[] = __( 'Usa letras, números, guiones o guiones bajos en el código.', 'nakama-discounts' );
			}

			$percentage = (float) $raw_percentage;
			if ( '' === $raw_percentage ) {
				$row_errors[] = __( 'Indica un porcentaje de descuento.', 'nakama-discounts' );
			} elseif ( $percentage <= 0 || $percentage > 100 ) {
				$row_errors[] = __( 'El porcentaje debe ser mayor que 0 y no superar 100.', 'nakama-discounts' );
			}

			if ( ! in_array( $entry_mode, array( self::ENTRY_AUTOMATIC, self::ENTRY_MANUAL ), true ) ) {
				$row_errors[] = __( 'Elige cómo podrá usar el cliente este código.', 'nakama-discounts' );
			}

			if ( ( $start && ! self::valid_date( $start ) ) || ( $end && ! self::valid_date( $end ) ) ) {
				$row_errors[] = __( 'La vigencia debe usar fechas válidas.', 'nakama-discounts' );
			}
			if ( $start && $end && $start > $end ) {
				$row_errors[] = __( 'La fecha final no puede ser anterior a la fecha inicial.', 'nakama-discounts' );
			}

			$code_key = strtolower( $code );
			if ( $code && isset( $seen[ $code_key ] ) ) {
				$row_errors[] = __( 'Cada código público debe ser único.', 'nakama-discounts' );
			}
			if ( self::ENTRY_MANUAL === $entry_mode && $code && class_exists( 'WC_Coupon' ) ) {
				$native_coupon = new WC_Coupon( $code );
				if ( $native_coupon->get_id() ) {
					$row_errors[] = __( 'Ese código también existe en WooCommerce. Cambia uno de los dos para evitar ambigüedad.', 'nakama-discounts' );
				}
			}

			if ( $row_errors ) {
				$has_errors = true;
				foreach ( $row_errors as $index => $message ) {
					add_settings_error(
						NAKAMA_DISC_CODES_OPTION,
						'nakama_code_' . sanitize_key( (string) $row_key ) . '_' . $index,
						$message,
						'error'
					);
				}
				continue;
			}

			$seen[ $code_key ] = true;
			$id = $is_new
				? wp_generate_uuid4()
				: sanitize_key( isset( $row['id'] ) ? $row['id'] : $row_key );
			if ( '' === $id ) {
				$id = wp_generate_uuid4();
			}

			$old = isset( $previous['items'][ $id ] ) ? $previous['items'][ $id ] : array();
			$now = current_datetime()->format( DATE_ATOM );
			$out[ $id ] = array(
				'id'              => $id,
				'code'            => $code,
				'rate'            => round( $percentage / 100, 6 ),
				'enabled'         => isset( $row['enabled'] ) ? 'yes' : 'no',
				'start'           => $start,
				'end'             => $end,
				'allow_modifiers' => isset( $row['allow_modifiers'] ) ? 'yes' : 'no',
				'entry_mode'      => $entry_mode,
				'created_at'      => isset( $old['created_at'] ) ? $old['created_at'] : $now,
				'updated_at'      => $now,
			);
		}

		if ( $has_errors ) {
			return $previous;
		}

		return array(
			'version' => self::SCHEMA_VERSION,
			'items'   => $out,
		);
	}

	public static function status( array $record, $now = null ) {
		if ( 'yes' !== ( isset( $record['enabled'] ) ? $record['enabled'] : 'no' ) ) {
			return 'inactive';
		}

		$now = $now instanceof DateTimeImmutable ? $now : current_datetime();
		$timezone = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( 'UTC' );
		$start = ! empty( $record['start'] )
			? new DateTimeImmutable( $record['start'] . ' 00:00:00', $timezone )
			: null;
		$end = ! empty( $record['end'] )
			? new DateTimeImmutable( $record['end'] . ' 23:59:59', $timezone )
			: null;

		if ( $start && $now < $start ) {
			return 'scheduled';
		}
		if ( $end && $now > $end ) {
			return 'expired';
		}
		return 'active';
	}

	public static function active( $now = null ) {
		return array_filter( self::all(), function ( $record ) use ( $now ) {
			return is_array( $record ) && 'active' === self::status( $record, $now );
		} );
	}

	public static function entry_mode( array $record ) {
		return self::ENTRY_MANUAL === ( isset( $record['entry_mode'] ) ? $record['entry_mode'] : '' )
			? self::ENTRY_MANUAL
			: self::ENTRY_AUTOMATIC;
	}

	public static function normalize_code( $code ) {
		return strtoupper( preg_replace( '/\s+/', '', sanitize_text_field( $code ) ) );
	}

	public static function find_by_code( $code ) {
		$normalized = self::normalize_code( $code );
		if ( '' === $normalized ) {
			return null;
		}
		foreach ( self::all() as $record ) {
			if ( is_array( $record ) && $normalized === self::normalize_code( isset( $record['code'] ) ? $record['code'] : '' ) ) {
				return $record;
			}
		}
		return null;
	}

	public static function selection_key( $id ) {
		return self::SELECTION_PREFIX . sanitize_key( $id );
	}

	public static function id_from_selection( $selection ) {
		if ( 0 !== strpos( (string) $selection, self::SELECTION_PREFIX ) ) {
			return '';
		}
		return sanitize_key( substr( (string) $selection, strlen( self::SELECTION_PREFIX ) ) );
	}

	private static function valid_date( $date ) {
		$parsed = DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $date, wp_timezone() );
		return $parsed && $parsed->format( 'Y-m-d' ) === $date;
	}
}
