<?php
/**
 * Customer and order-facing presale metadata.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Orders {
	public static function init() {
		add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'add_line_metadata' ), 10, 4 );
		add_action( 'woocommerce_before_cart', array( __CLASS__, 'render_mixed_cart_notice' ) );
		add_action( 'woocommerce_before_checkout_form', array( __CLASS__, 'render_mixed_cart_notice' ) );
	}

	public static function add_line_metadata( $item, $cart_item_key, $values, $order ) {
		$product = isset( $values['data'] ) ? $values['data'] : null;
		$product_id = $product && $product->get_parent_id() ? $product->get_parent_id() : ( $product ? $product->get_id() : 0 );
		$campaign = Nakama_Drops_Repository::active_for_product( (int) $product_id );
		if ( ! $campaign || strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time() ) {
			return;
		}
		$timezone = new DateTimeZone( $campaign['timezone'] ?: 'UTC' );
		$launch = new DateTimeImmutable( $campaign['launch_at_gmt'], new DateTimeZone( 'UTC' ) );
		$item->add_meta_data( '_nakama_drop_campaign_id', (int) $campaign['id'], true );
		$item->add_meta_data( __( 'Tipo de compra', 'nakama-drops' ), __( 'Preventa', 'nakama-drops' ), true );
		$item->add_meta_data( __( 'Lanzamiento', 'nakama-drops' ), $launch->setTimezone( $timezone )->format( 'd/m/Y H:i T' ), true );
	}

	public static function render_mixed_cart_notice() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return;
		}
		$has_drop = false;
		$has_regular = false;
		$latest = null;
		foreach ( WC()->cart->get_cart() as $cart_item ) {
			$campaign = Nakama_Drops_Repository::active_for_product( (int) $cart_item['product_id'] );
			if ( $campaign && strtotime( $campaign['launch_at_gmt'] . ' UTC' ) > time() ) {
				$has_drop = true;
				$timestamp = strtotime( $campaign['launch_at_gmt'] . ' UTC' );
				$latest = null === $latest ? $timestamp : max( $latest, $timestamp );
			} else {
				$has_regular = true;
			}
		}
		if ( $has_drop ) {
			$message = __( 'Este pedido incluye una preventa. La elaboración comenzará a partir del lanzamiento más tardío.', 'nakama-drops' );
			if ( $has_regular ) {
				$message .= ' ' . __( 'Haz dos pedidos distintos si quieres recibir antes los productos que ya están disponibles.', 'nakama-drops' );
			}
			wc_print_notice( $message, 'notice' );
		}
	}
}

