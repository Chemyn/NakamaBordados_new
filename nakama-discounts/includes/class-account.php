<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Aviso en "Mi Cuenta": informa al usuario del descuento de fidelidad que
 * tiene disponible y lo que sigue, hasta que termina la escalera.
 * Solo visible para usuarios con cuenta (el área Mi Cuenta ya lo es).
 */
class Nakama_Account {

	public static function init() {
		// Banner en el dashboard de Mi Cuenta.
		add_action( 'woocommerce_account_dashboard', array( __CLASS__, 'render_notice' ), 5 );
		// También arriba de la navegación (más visible en cualquier subpágina).
		add_action( 'woocommerce_before_account_navigation', array( __CLASS__, 'render_notice' ), 5 );
	}

	protected static $printed = false;

	public static function render_notice() {
		if ( self::$printed ) {
			return; // evitar duplicado si ambos hooks disparan
		}
		if ( 'yes' !== Nakama_Settings::get( 'account_notice_enabled' ) ) {
			return;
		}
		$uid = get_current_user_id();
		if ( ! $uid ) {
			return;
		}

		$status = Nakama_Customer_History::get_status( $uid );
		if ( ! $status ) {
			return;
		}

		// Escalera terminada.
		if ( ! empty( $status['complete'] ) ) {
			if ( 'yes' === Nakama_Settings::get( 'account_notice_complete' ) ) {
				self::box(
					'✓ Completaste tu escalera de fidelidad',
					'Gracias por tu preferencia. Mantente al tanto de nuestras promociones especiales.',
					'muted'
				);
			}
			return;
		}

		$current = $status['current'];
		$next    = $status['next'];

		// Hay un descuento disponible ahora.
		if ( $current ) {
			$pct       = self::pct( $current['rate'] );
			$next_line = '';
			if ( $next ) {
				$next_line = sprintf(
					' Tu %s tendrá <strong>%s</strong> de descuento.',
					esc_html( $next['label'] ),
					esc_html( self::pct( $next['rate'] ) )
				);
			}

			if ( 1 === $current['tier'] ) {
				$title = '🎁 Tienes ' . $pct . ' en tu primera compra';
				$body  = 'Aprovecha tu descuento de bienvenida.' . $next_line;
			} else {
				$title = '🎉 ¡Desbloqueaste ' . $pct . ' de descuento!';
				$body  = 'Válido para tu ' . esc_html( $current['label'] ) . '.';
				$body .= self::expiry_line( $status['expires'] );
				$body .= $next_line;
			}
			self::box( $title, $body, 'active' );
			return;
		}

		// Ventana vencida a media escalera (no completa, sin descuento actual).
		self::box(
			'Tu descuento de fidelidad de esta etapa venció',
			'La ventana para usar este nivel expiró, pero puedes seguir avanzando en la escalera con tu próxima compra.',
			'muted'
		);
	}

	private static function expiry_line( $ts ) {
		if ( ! $ts ) {
			// El pedido previo sigue en "procesando": aún no corre el reloj.
			return ' El conteo de vigencia inicia cuando tu pedido anterior se marque como completado.';
		}
		return sprintf(
			' Vigente hasta el <strong>%s</strong>.',
			esc_html( date_i18n( get_option( 'date_format' ), $ts ) )
		);
	}

	private static function pct( $rate ) {
		return rtrim( rtrim( number_format( $rate * 100, 2 ), '0' ), '.' ) . '%';
	}

	private static function box( $title, $body, $variant = 'active' ) {
		self::$printed = true;
		$bg     = ( 'active' === $variant ) ? '#ecfdf5' : '#f3f4f6';
		$border = ( 'active' === $variant ) ? '#10b981' : '#9ca3af';
		$color  = ( 'active' === $variant ) ? '#065f46' : '#374151';
		printf(
			'<div class="nakama-account-notice" style="background:%s;border-left:4px solid %s;border-radius:8px;padding:14px 16px;margin:0 0 20px;color:%s;">
				<div style="font-weight:600;margin-bottom:4px;">%s</div>
				<div style="font-size:14px;line-height:1.5;">%s</div>
			</div>',
			esc_attr( $bg ),
			esc_attr( $border ),
			esc_attr( $color ),
			wp_kses_post( $title ),
			wp_kses_post( $body )
		);
	}
}
