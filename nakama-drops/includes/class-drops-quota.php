<?php
/**
 * Presale quota validation and atomic order reservations.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Quota {
	public static function init() {
		add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'validate_add_to_cart' ), 20, 5 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'reserve_order' ), 10, 1 );
		add_action( 'woocommerce_order_status_cancelled', array( __CLASS__, 'release_order' ), 10, 1 );
		add_action( 'woocommerce_order_status_failed', array( __CLASS__, 'release_order' ), 10, 1 );
		add_action( 'woocommerce_order_status_refunded', array( __CLASS__, 'release_order' ), 10, 1 );
		add_action( 'woocommerce_order_partially_refunded', array( __CLASS__, 'release_refund' ), 10, 2 );
	}

	public static function validate_add_to_cart( $passed, $product_id, $quantity, $variation_id = 0, $variations = array() ) {
		$campaign = Nakama_Drops_Repository::active_for_product( (int) $product_id );
		if ( ! $campaign ) {
			return $passed;
		}
		if ( 'error' === $campaign['status'] && strtotime( $campaign['launch_at_gmt'] . ' UTC' ) > time() ) {
			wc_add_notice( __( 'Esta preventa está temporalmente en revisión. Inténtalo de nuevo más tarde.', 'nakama-drops' ), 'error' );
			return false;
		}
		if ( strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time() ) {
			Nakama_Drops_Lifecycle::launch( (int) $campaign['id'] );
			return $passed;
		}
		if ( null === $campaign['capacity'] ) {
			return $passed;
		}
		$in_cart = 0;
		if ( function_exists( 'WC' ) && WC()->cart ) {
			foreach ( WC()->cart->get_cart() as $item ) {
				if ( (int) $item['product_id'] === (int) $product_id ) {
					$in_cart += (int) $item['quantity'];
				}
			}
		}
		$remaining = Nakama_Drops_Domain::remaining( (int) $campaign['capacity'], (int) $campaign['reserved'] );
		if ( $in_cart + (int) $quantity > $remaining ) {
			wc_add_notice( sprintf( __( 'Solo quedan %d unidades disponibles en esta preventa.', 'nakama-drops' ), $remaining ), 'error' );
			return false;
		}
		return $passed;
	}

	public static function reserve_order( $order ) {
		foreach ( $order->get_items() as $item_id => $item ) {
			$product = $item->get_product();
			$product_id = $product && $product->get_parent_id() ? $product->get_parent_id() : $item->get_product_id();
			$campaign = Nakama_Drops_Repository::active_for_product( (int) $product_id );
			if ( ! $campaign || strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time() ) {
				continue;
			}
			if ( ! Nakama_Drops_Repository::reserve( (int) $campaign['id'], (int) $item->get_quantity(), (int) $order->get_id(), (int) $item_id ) ) {
				$order->update_status( 'failed', __( 'No fue posible reservar el cupo de preventa.', 'nakama-drops' ) );
				throw new Exception( __( 'La preventa acaba de agotarse. Actualiza el carrito para continuar.', 'nakama-drops' ) );
			}
		}
	}

	public static function release_order( $order_id ) {
		foreach ( Nakama_Drops_Repository::reservations_for_order( $order_id ) as $reservation ) {
			Nakama_Drops_Repository::release_reservation( $reservation, (int) $reservation['quantity'] );
		}
	}

	public static function release_refund( $order_id, $refund_id ) {
		$refund = wc_get_order( $refund_id );
		if ( ! $refund ) {
			return;
		}
		$reservations = Nakama_Drops_Repository::reservations_for_order( $order_id );
		foreach ( $refund->get_items() as $refund_item ) {
			$refunded_item_id = (int) $refund_item->get_meta( '_refunded_item_id', true );
			$quantity = abs( (int) $refund_item->get_quantity() );
			foreach ( $reservations as $reservation ) {
				if ( (int) $reservation['order_item_id'] === $refunded_item_id ) {
					Nakama_Drops_Repository::release_reservation( $reservation, $quantity );
				}
			}
		}
	}
}
