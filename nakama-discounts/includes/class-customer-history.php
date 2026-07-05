<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Escalera de BIENVENIDA / FIDELIDAD.
 *
 * REGLA NUEVA: solo aplica a usuarios CON CUENTA (welcome_account_only=yes).
 * Los invitados no acumulan escalera.
 *
 * Niveles (según compras válidas previas):
 *   0 previas -> 1a compra: 5%  (siempre vigente)
 *   1 previa  -> 2a compra: 10% (vigente si la compra previa está en
 *                'processing', o 'completed' hace <= 15 días)
 *   2 previas -> 3a compra: 20% (vigente si 'processing', o 'completed' <= 20 días)
 *   3+        -> escalera terminada
 *
 * La ventana se ancla a la compra INMEDIATA anterior (la más reciente).
 */
class Nakama_Customer_History {

	/** IDs de pedidos válidos previos, de más antiguo a más reciente. */
	public static function get_valid_order_ids( $customer_id, $email = '' ) {
		$statuses = (array) Nakama_Settings::get( 'welcome_valid_statuses', array( 'processing', 'completed' ) );
		$args = array(
			'limit'   => -1,
			'status'  => $statuses,
			'orderby' => 'date',
			'order'   => 'ASC',
			'return'  => 'ids',
			'type'    => 'shop_order',
		);

		if ( $customer_id ) {
			$args['customer_id'] = $customer_id;
		} elseif ( $email ) {
			$args['billing_email'] = $email;
		} else {
			return array();
		}

		return wc_get_orders( $args );
	}

	/** ¿Sigue vigente la ventana de $order_id para $days días? */
	public static function window_valid( $order_id, $days ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return false;
		}
		$status = $order->get_status();

		if ( 'processing' === $status ) {
			return true; // aún no arranca el conteo
		}
		if ( 'completed' === $status ) {
			$completed = $order->get_date_completed();
			if ( ! $completed ) {
				return true;
			}
			$elapsed = time() - $completed->getTimestamp();
			return $elapsed <= ( (int) $days * DAY_IN_SECONDS );
		}
		return false;
	}

	/** Timestamp de expiración (o null si el pedido sigue en 'processing'). */
	public static function get_expiration_ts( $order_id, $days ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return null;
		}
		if ( 'completed' === $order->get_status() ) {
			$completed = $order->get_date_completed();
			if ( $completed ) {
				return $completed->getTimestamp() + ( (int) $days * DAY_IN_SECONDS );
			}
		}
		return null; // en 'processing' aún no hay fecha de expiración
	}

	/**
	 * Estado completo de la escalera para un cliente. Fuente única de verdad
	 * usada tanto por el motor como por el aviso de Mi Cuenta.
	 *
	 * @return array|null [
	 *   'count'    => int,                      // compras válidas previas
	 *   'current'  => ['tier'=>int,'rate'=>float,'label'=>string] | null, // descuento disponible ahora
	 *   'expires'  => int|null,                 // timestamp de expiración del actual
	 *   'next'     => ['tier'=>int,'rate'=>float,'label'=>string] | null, // lo que sigue en la escalera
	 *   'complete' => bool,                     // true si ya terminó la escalera
	 * ]
	 */
	public static function get_status( $customer_id, $email = '' ) {
		if ( 'yes' !== Nakama_Settings::get( 'welcome_enabled' ) ) {
			return null;
		}

		$account_only = ( 'yes' === Nakama_Settings::get( 'welcome_account_only' ) );
		if ( ! $customer_id && ( $account_only || ! $email ) ) {
			return null; // invitados no califican
		}

		$orders = self::get_valid_order_ids( $customer_id, $email );
		$count  = count( $orders );

		$r1 = (float) Nakama_Settings::get( 'welcome_rate_1' );
		$r2 = (float) Nakama_Settings::get( 'welcome_rate_2' );
		$r3 = (float) Nakama_Settings::get( 'welcome_rate_3' );

		$out = array(
			'count'    => $count,
			'current'  => null,
			'expires'  => null,
			'next'     => null,
			'complete' => false,
		);

		if ( 0 === $count ) {
			$out['current'] = array( 'tier' => 1, 'rate' => $r1, 'label' => '1a compra' );
			$out['next']    = array( 'tier' => 2, 'rate' => $r2, 'label' => '2a compra' );
			return $out;
		}

		$last = end( $orders );

		if ( 1 === $count ) {
			$days = (int) Nakama_Settings::get( 'welcome_days_2' );
			if ( self::window_valid( $last, $days ) ) {
				$out['current'] = array( 'tier' => 2, 'rate' => $r2, 'label' => '2a compra' );
				$out['expires'] = self::get_expiration_ts( $last, $days );
			}
			$out['next'] = array( 'tier' => 3, 'rate' => $r3, 'label' => '3a compra' );
			return $out;
		}

		if ( 2 === $count ) {
			$days = (int) Nakama_Settings::get( 'welcome_days_3' );
			if ( self::window_valid( $last, $days ) ) {
				$out['current'] = array( 'tier' => 3, 'rate' => $r3, 'label' => '3a compra' );
				$out['expires'] = self::get_expiration_ts( $last, $days );
			}
			return $out; // no hay 'next': la escalera termina en la 3a
		}

		$out['complete'] = true;
		return $out;
	}

	/**
	 * Tier de bienvenida vigente (lo que usa el motor). Wrapper de get_status().
	 * @return array|null ['tier'=>int,'rate'=>float,'label'=>string]
	 */
	public static function get_welcome_tier( $customer_id, $email = '' ) {
		$status = self::get_status( $customer_id, $email );
		if ( ! $status || empty( $status['current'] ) ) {
			return null;
		}
		$labels = array(
			1 => 'Descuento de bienvenida (1a compra)',
			2 => 'Descuento de fidelidad (2a compra)',
			3 => 'Descuento de fidelidad (3a compra)',
		);
		$c = $status['current'];
		return array(
			'tier'  => $c['tier'],
			'rate'  => $c['rate'],
			'label' => $labels[ $c['tier'] ],
		);
	}
}
