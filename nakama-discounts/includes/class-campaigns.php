<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Estado de las campañas ESPECIALES (Hot Sale, Black Friday, etc.).
 * Una campaña está "activa" si su toggle está en 'yes' Y, si se definió
 * agenda, la fecha actual cae dentro del rango.
 */
class Nakama_Campaigns {

	public static function is_scheduled_active( $enabled_key, $start_key, $end_key ) {
		if ( 'yes' !== Nakama_Settings::get( $enabled_key ) ) {
			return false;
		}

		$start = Nakama_Settings::get( $start_key );
		$end   = Nakama_Settings::get( $end_key );

		$now = current_time( 'timestamp' );

		if ( $start && $now < strtotime( $start . ' 00:00:00' ) ) {
			return false;
		}
		if ( $end && $now > strtotime( $end . ' 23:59:59' ) ) {
			return false;
		}
		return true;
	}

	/** ¿Está corriendo la campaña de 10% especial? */
	public static function special_10_active() {
		return self::is_scheduled_active( 'special_10_enabled', 'special_10_start', 'special_10_end' );
	}

	/** ¿Está corriendo la campaña 3x2? */
	public static function special_3x2_active() {
		return self::is_scheduled_active( 'special_3x2_enabled', 'special_3x2_start', 'special_3x2_end' );
	}

	/** ¿Hay ALGUNA campaña especial corriendo? (para 6 MSI) */
	public static function any_special_active() {
		return self::special_10_active() || self::special_3x2_active();
	}
}
