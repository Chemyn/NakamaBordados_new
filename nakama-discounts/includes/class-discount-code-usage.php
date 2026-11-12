<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Registro de reservas y usos de los códigos públicos.
 *
 * Las mutaciones comparten un bloqueo atómico de WordPress para impedir que
 * dos checkouts reserven simultáneamente el último uso disponible.
 */
class Nakama_Discount_Code_Usage {
	const SCHEMA_VERSION = 1;
	const LOCK_OPTION = 'nakama_discount_code_usage_lock';
	const ORPHAN_TTL = 900;

	public static function init() {
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'reserve_order' ), 20, 2 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'attach_order' ) );
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'consume_order' ) );
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'consume_order' ) );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'consume_order' ) );
		add_action( 'woocommerce_order_status_cancelled', array( __CLASS__, 'release_order' ) );
		add_action( 'woocommerce_order_status_failed', array( __CLASS__, 'release_order' ) );
		add_action( 'woocommerce_order_status_refunded', array( __CLASS__, 'release_order' ) );
		add_action( 'woocommerce_order_fully_refunded', array( __CLASS__, 'release_order' ), 10, 2 );
	}

	public static function set_defaults() {
		if ( false === get_option( NAKAMA_DISC_USAGE_OPTION, false ) ) {
			add_option( NAKAMA_DISC_USAGE_OPTION, self::empty_ledger(), '', 'no' );
		}
	}

	public static function empty_ledger() {
		return array(
			'version' => self::SCHEMA_VERSION,
			'codes'   => array(),
		);
	}

	/** Identidad estable: usuario para cuentas y hash del correo para invitados. */
	public static function customer_key( $user_id, $email ) {
		$user_id = max( 0, (int) $user_id );
		if ( $user_id > 0 ) {
			return 'user:' . $user_id;
		}
		$email = strtolower( sanitize_email( (string) $email ) );
		return '' !== $email ? 'email:' . hash( 'sha256', $email ) : '';
	}

	/** Reserva capacidad durante la creación del pedido, antes de cobrar. */
	public static function reserve_order( $order, $data = array() ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_meta' ) ) {
			return;
		}
		if ( 'public_code' !== (string) $order->get_meta( '_nakama_primary_type' ) ) {
			return;
		}

		$code_id = sanitize_key( $order->get_meta( '_nakama_public_code_id' ) );
		$code = class_exists( 'Nakama_Discount_Codes' ) ? Nakama_Discount_Codes::find_by_id( $code_id ) : null;
		if ( ! $code ) {
			throw new Exception( __( 'El código seleccionado ya no está disponible.', 'nakama-discounts' ) );
		}
		$tracks_usage = 'yes' === ( isset( $code['usage_limit_enabled'] ) ? $code['usage_limit_enabled'] : 'no' )
			|| 'yes' === ( isset( $code['limit_per_customer'] ) ? $code['limit_per_customer'] : 'no' );
		if ( ! $tracks_usage ) {
			return;
		}

		$user_id = method_exists( $order, 'get_customer_id' ) ? (int) $order->get_customer_id() : 0;
		$email = method_exists( $order, 'get_billing_email' ) ? (string) $order->get_billing_email() : '';
		$customer_key = self::customer_key( $user_id, $email );
		$token = sanitize_key( $order->get_meta( '_nakama_public_code_usage_token' ) );
		if ( '' === $token ) {
			$token = wp_generate_uuid4();
		}

		$result = self::reserve( $code, $token, $customer_key );
		if ( empty( $result['success'] ) ) {
			throw new Exception( isset( $result['message'] ) ? $result['message'] : __( 'El código ya no tiene usos disponibles.', 'nakama-discounts' ) );
		}

		$order->update_meta_data( '_nakama_public_code_usage_token', $token );
		$order->update_meta_data( '_nakama_public_code_customer_key', $customer_key );
		$order->update_meta_data( '_nakama_public_code_usage_state', 'reserved' );
	}

	/** Completa la asociación cuando WooCommerce ya asignó ID al pedido. */
	public static function attach_order( $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_meta' ) ) {
			return;
		}
		if ( 'reserved' !== (string) $order->get_meta( '_nakama_public_code_usage_state' ) ) {
			return;
		}
		self::attach_order_usage(
			$order->get_meta( '_nakama_public_code_id' ),
			$order->get_meta( '_nakama_public_code_usage_token' ),
			method_exists( $order, 'get_id' ) ? $order->get_id() : 0
		);
	}

	/** Registra el uso solo al confirmar el pago o un estado pagado. */
	public static function consume_order( $order_id ) {
		$order = self::get_order( $order_id );
		if ( ! $order || 'used' === (string) $order->get_meta( '_nakama_public_code_usage_state' ) ) {
			return;
		}
		$state = (string) $order->get_meta( '_nakama_public_code_usage_state' );
		if ( 'reserved' !== $state ) {
			return;
		}
		$result = self::consume(
			$order->get_meta( '_nakama_public_code_id' ),
			$order->get_meta( '_nakama_public_code_usage_token' ),
			$order->get_id(),
			$order->get_meta( '_nakama_public_code_customer_key' )
		);
		if ( ! empty( $result['success'] ) ) {
			$order->update_meta_data( '_nakama_public_code_usage_state', 'used' );
			self::save_order( $order );
		}
	}

	/** Devuelve capacidad en cancelación, fallo o reembolso total. */
	public static function release_order( $order_id, $secondary_id = 0 ) {
		$order = self::get_order( $order_id );
		if ( ! $order || 'released' === (string) $order->get_meta( '_nakama_public_code_usage_state' ) ) {
			return;
		}
		$token = (string) $order->get_meta( '_nakama_public_code_usage_token' );
		if ( '' === $token ) {
			return;
		}
		$result = self::release(
			$order->get_meta( '_nakama_public_code_id' ),
			$token,
			$order->get_id()
		);
		if ( ! empty( $result['success'] ) ) {
			$order->update_meta_data( '_nakama_public_code_usage_state', 'released' );
			self::save_order( $order );
		}
	}

	/** Resuelve si el código puede ofrecerse al carrito o cliente actual. */
	public static function availability( array $code, $customer_key = '' ) {
		$code_id = sanitize_key( isset( $code['id'] ) ? $code['id'] : '' );
		$ledger = self::ledger();
		$usage = self::code_usage( $ledger, $code_id );
		self::prune_orphans( $usage );
		$stats = self::calculate_stats( $code, $usage );

		if ( 'yes' === ( isset( $code['usage_limit_enabled'] ) ? $code['usage_limit_enabled'] : 'no' ) && $stats['remaining'] <= 0 ) {
			return array(
				'available' => false,
				'reason'    => 'exhausted',
				'message'   => __( 'Este código agotó todos sus usos disponibles.', 'nakama-discounts' ),
			);
		}
		if (
			'yes' === ( isset( $code['limit_per_customer'] ) ? $code['limit_per_customer'] : 'no' )
			&& '' !== (string) $customer_key
			&& self::customer_has_usage( $usage, $customer_key )
		) {
			return array(
				'available' => false,
				'reason'    => 'customer_used',
				'message'   => __( 'Este código solo puede utilizarse una vez por cliente.', 'nakama-discounts' ),
			);
		}

		return array( 'available' => true, 'reason' => '', 'message' => '' );
	}

	/** Reserva un uso sin consumirlo hasta que el pedido sea pagado. */
	public static function reserve( array $code, $token, $customer_key ) {
		$code_id = sanitize_key( isset( $code['id'] ) ? $code['id'] : '' );
		$token = sanitize_key( $token );
		$customer_key = (string) $customer_key;
		if ( '' === $code_id || '' === $token ) {
			return self::error( __( 'No se pudo reservar el uso del código.', 'nakama-discounts' ) );
		}

		return self::mutate( function ( &$ledger ) use ( $code, $code_id, $token, $customer_key ) {
			$usage = self::code_usage( $ledger, $code_id );
			self::prune_orphans( $usage );

			if ( isset( $usage['reservations'][ $token ] ) ) {
				return array( 'success' => true, 'token' => $token );
			}

			$stats = self::calculate_stats( $code, $usage );
			if ( 'yes' === ( isset( $code['usage_limit_enabled'] ) ? $code['usage_limit_enabled'] : 'no' ) && $stats['remaining'] <= 0 ) {
				return self::error( __( 'Este código agotó todos sus usos disponibles.', 'nakama-discounts' ) );
			}
			if ( 'yes' === ( isset( $code['limit_per_customer'] ) ? $code['limit_per_customer'] : 'no' ) ) {
				if ( '' === $customer_key ) {
					return self::error( __( 'Necesitamos identificar al cliente para aplicar este código.', 'nakama-discounts' ) );
				}
				if ( self::customer_has_usage( $usage, $customer_key ) ) {
					return self::error( __( 'Este código solo puede utilizarse una vez por cliente.', 'nakama-discounts' ) );
				}
			}

			$usage['reservations'][ $token ] = array(
				'customer_key' => $customer_key,
				'order_id'     => 0,
				'created_at'   => self::now_timestamp(),
			);
			$ledger['codes'][ $code_id ] = $usage;

			return array( 'success' => true, 'token' => $token );
		} );
	}

	/** Asocia la reserva previa con el pedido recién guardado. */
	public static function attach_order_usage( $code_id, $token, $order_id ) {
		$code_id = sanitize_key( $code_id );
		$token = sanitize_key( $token );
		$order_id = max( 0, (int) $order_id );
		return self::mutate( function ( &$ledger ) use ( $code_id, $token, $order_id ) {
			$usage = self::code_usage( $ledger, $code_id );
			if ( ! isset( $usage['reservations'][ $token ] ) ) {
				return self::error( __( 'No encontramos la reserva de este pedido.', 'nakama-discounts' ) );
			}
			$usage['reservations'][ $token ]['order_id'] = $order_id;
			$ledger['codes'][ $code_id ] = $usage;
			return array( 'success' => true );
		} );
	}

	/** Convierte una reserva en un uso pagado; repetir el evento no suma otro. */
	public static function consume( $code_id, $token, $order_id, $customer_key ) {
		$code_id = sanitize_key( $code_id );
		$token = sanitize_key( $token );
		$order_key = (string) max( 0, (int) $order_id );
		$customer_key = (string) $customer_key;
		return self::mutate( function ( &$ledger ) use ( $code_id, $token, $order_key, $customer_key ) {
			$usage = self::code_usage( $ledger, $code_id );
			if ( isset( $usage['uses'][ $order_key ] ) ) {
				return array( 'success' => true );
			}
			if ( ! isset( $usage['reservations'][ $token ] ) ) {
				return self::error( __( 'No encontramos la reserva que debe consumirse.', 'nakama-discounts' ) );
			}

			$reservation = $usage['reservations'][ $token ];
			unset( $usage['reservations'][ $token ] );
			$usage['uses'][ $order_key ] = array(
				'customer_key' => '' !== $customer_key ? $customer_key : ( isset( $reservation['customer_key'] ) ? $reservation['customer_key'] : '' ),
				'token'        => $token,
				'consumed_at'  => self::now_timestamp(),
			);
			$ledger['codes'][ $code_id ] = $usage;
			return array( 'success' => true );
		} );
	}

	/** Libera una reserva o devuelve el uso pagado por cancelación/reembolso. */
	public static function release( $code_id, $token, $order_id ) {
		$code_id = sanitize_key( $code_id );
		$token = sanitize_key( $token );
		$order_key = (string) max( 0, (int) $order_id );
		return self::mutate( function ( &$ledger ) use ( $code_id, $token, $order_key ) {
			$usage = self::code_usage( $ledger, $code_id );
			unset( $usage['reservations'][ $token ] );
			if ( isset( $usage['uses'][ $order_key ] ) ) {
				unset( $usage['uses'][ $order_key ] );
			} else {
				foreach ( $usage['uses'] as $key => $entry ) {
					if ( isset( $entry['token'] ) && hash_equals( (string) $entry['token'], (string) $token ) ) {
						unset( $usage['uses'][ $key ] );
					}
				}
			}
			$ledger['codes'][ $code_id ] = $usage;
			return array( 'success' => true );
		} );
	}

	/** Resumen visible para administradores. */
	public static function stats( array $code ) {
		$code_id = sanitize_key( isset( $code['id'] ) ? $code['id'] : '' );
		$ledger = self::ledger();
		$usage = self::code_usage( $ledger, $code_id );
		self::prune_orphans( $usage );
		return self::calculate_stats( $code, $usage );
	}

	private static function calculate_stats( array $code, array $usage ) {
		$used = count( $usage['uses'] );
		$reserved = count( $usage['reservations'] );
		$committed = $used + $reserved;
		$limited = 'yes' === ( isset( $code['usage_limit_enabled'] ) ? $code['usage_limit_enabled'] : 'no' );
		$limit = $limited ? max( 1, (int) ( isset( $code['usage_limit'] ) ? $code['usage_limit'] : 1 ) ) : 0;

		return array(
			'used'      => $used,
			'reserved'  => $reserved,
			'committed' => $committed,
			'remaining' => $limited ? max( 0, $limit - $committed ) : null,
		);
	}

	private static function customer_has_usage( array $usage, $customer_key ) {
		foreach ( array( 'reservations', 'uses' ) as $bucket ) {
			foreach ( $usage[ $bucket ] as $entry ) {
				if ( isset( $entry['customer_key'] ) && hash_equals( (string) $entry['customer_key'], (string) $customer_key ) ) {
					return true;
				}
			}
		}
		return false;
	}

	private static function code_usage( array $ledger, $code_id ) {
		$value = isset( $ledger['codes'][ $code_id ] ) && is_array( $ledger['codes'][ $code_id ] )
			? $ledger['codes'][ $code_id ]
			: array();
		return array(
			'reservations' => isset( $value['reservations'] ) && is_array( $value['reservations'] ) ? $value['reservations'] : array(),
			'uses'         => isset( $value['uses'] ) && is_array( $value['uses'] ) ? $value['uses'] : array(),
		);
	}

	private static function prune_orphans( array &$usage ) {
		$minimum = self::now_timestamp() - self::ORPHAN_TTL;
		foreach ( $usage['reservations'] as $token => $reservation ) {
			$order_id = isset( $reservation['order_id'] ) ? (int) $reservation['order_id'] : 0;
			$created = isset( $reservation['created_at'] ) ? (int) $reservation['created_at'] : 0;
			if ( $order_id <= 0 && $created < $minimum ) {
				unset( $usage['reservations'][ $token ] );
			}
		}
	}

	private static function ledger() {
		$value = get_option( NAKAMA_DISC_USAGE_OPTION, self::empty_ledger() );
		return is_array( $value )
			? array(
				'version' => self::SCHEMA_VERSION,
				'codes'   => isset( $value['codes'] ) && is_array( $value['codes'] ) ? $value['codes'] : array(),
			)
			: self::empty_ledger();
	}

	private static function mutate( $callback ) {
		$lock = self::acquire_lock();
		if ( false === $lock ) {
			return self::error( __( 'El código está siendo procesado. Inténtalo de nuevo.', 'nakama-discounts' ) );
		}

		try {
			$ledger = self::ledger();
			$result = call_user_func_array( $callback, array( &$ledger ) );
			if ( ! empty( $result['success'] ) ) {
				update_option( NAKAMA_DISC_USAGE_OPTION, $ledger, false );
			}
			return $result;
		} finally {
			self::release_lock( $lock );
		}
	}

	private static function acquire_lock() {
		$token = wp_generate_uuid4();
		for ( $attempt = 0; $attempt < 20; $attempt++ ) {
			$value = array( 'token' => $token, 'created_at' => self::now_timestamp() );
			if ( add_option( self::LOCK_OPTION, $value, '', 'no' ) ) {
				return $token;
			}
			$existing = get_option( self::LOCK_OPTION, array() );
			if ( is_array( $existing ) && (int) ( isset( $existing['created_at'] ) ? $existing['created_at'] : 0 ) < self::now_timestamp() - 30 ) {
				delete_option( self::LOCK_OPTION );
				continue;
			}
			usleep( 50000 );
		}
		return false;
	}

	private static function release_lock( $token ) {
		$current = get_option( self::LOCK_OPTION, array() );
		if ( is_array( $current ) && isset( $current['token'] ) && hash_equals( (string) $current['token'], (string) $token ) ) {
			delete_option( self::LOCK_OPTION );
		}
	}

	private static function now_timestamp() {
		return current_datetime()->getTimestamp();
	}

	private static function error( $message ) {
		return array( 'success' => false, 'message' => $message );
	}

	private static function get_order( $order ) {
		if ( is_object( $order ) && method_exists( $order, 'get_meta' ) ) {
			return $order;
		}
		return function_exists( 'wc_get_order' ) ? wc_get_order( (int) $order ) : null;
	}

	private static function save_order( $order ) {
		if ( method_exists( $order, 'save' ) ) {
			$order->save();
		}
	}
}
