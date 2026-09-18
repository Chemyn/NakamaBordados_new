<?php
/**
 * WooCommerce price projection and permanent transitions.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Pricing {
	public static function init() {
		add_filter( 'woocommerce_product_get_price', array( __CLASS__, 'filter_price' ), 50, 2 );
		add_filter( 'woocommerce_product_variation_get_price', array( __CLASS__, 'filter_price' ), 50, 2 );
		add_filter( 'woocommerce_product_get_regular_price', array( __CLASS__, 'filter_regular_price' ), 50, 2 );
		add_filter( 'woocommerce_product_variation_get_regular_price', array( __CLASS__, 'filter_regular_price' ), 50, 2 );
		add_filter( 'woocommerce_variation_prices_price', array( __CLASS__, 'filter_variation_price' ), 50, 3 );
		add_filter( 'woocommerce_variation_prices_regular_price', array( __CLASS__, 'filter_variation_regular_price' ), 50, 3 );
		add_filter( 'woocommerce_get_variation_prices_hash', array( __CLASS__, 'variation_hash' ), 50, 3 );
		add_filter( 'woocommerce_is_purchasable', array( __CLASS__, 'filter_purchasable' ), 50, 2 );
		add_filter( 'woocommerce_variation_is_purchasable', array( __CLASS__, 'filter_purchasable' ), 50, 2 );
	}

	public static function filter_purchasable( $purchasable, $product ) {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_id' ) ) {
			return $purchasable;
		}
		$item_id = (int) $product->get_id();
		$product_id = method_exists( $product, 'get_parent_id' ) && $product->get_parent_id() ? (int) $product->get_parent_id() : $item_id;
		$campaign = Nakama_Drops_Repository::active_for_product( $product_id );
		if ( ! $campaign || self::is_due( $campaign ) ) {
			return $purchasable;
		}
		if ( 'error' === $campaign['status'] ) {
			return false;
		}
		return Nakama_Drops_Repository::price_for_item( (int) $campaign['id'], $item_id ) ? $purchasable : false;
	}

	public static function filter_price( $value, $product ) {
		$context = self::context_for_product( $product );
		if ( ! $context ) {
			return $value;
		}
		return self::is_due( $context['campaign'] ) ? $context['price']['launch_price'] : $context['price']['presale_price'];
	}

	public static function filter_regular_price( $value, $product ) {
		$context = self::context_for_product( $product );
		return $context ? $context['price']['launch_price'] : $value;
	}

	public static function filter_variation_price( $value, $variation, $parent ) {
		return self::filter_price( $value, $variation );
	}

	public static function filter_variation_regular_price( $value, $variation, $parent ) {
		return self::filter_regular_price( $value, $variation );
	}

	public static function variation_hash( $hash, $product, $for_display ) {
		$campaign = Nakama_Drops_Repository::active_for_product( $product->get_id() );
		if ( $campaign ) {
			$hash['nakama_drop'] = $campaign['id'] . ':' . $campaign['launch_at_gmt'] . ':' . $campaign['updated_at_gmt'];
		}
		return $hash;
	}

	public static function apply_presale( array $campaign, array $prices ) {
		foreach ( $prices as $price ) {
			$product = wc_get_product( (int) $price['item_id'] );
			if ( ! $product ) {
				throw new RuntimeException( 'No se encontró el producto o variación ' . (int) $price['item_id'] . '.' );
			}
			$product->set_regular_price( wc_format_decimal( $price['launch_price'] ) );
			$product->set_sale_price( wc_format_decimal( $price['presale_price'] ) );
			$product->set_price( wc_format_decimal( $price['presale_price'] ) );
			$product->set_date_on_sale_from( null );
			$product->set_date_on_sale_to( null );
			$product->save();
		}
		self::sync_parent( (int) $campaign['product_id'] );
	}

	public static function apply_launch( array $campaign, array $prices ) {
		foreach ( $prices as $price ) {
			$product = wc_get_product( (int) $price['item_id'] );
			if ( ! $product ) {
				throw new RuntimeException( 'No se encontró el producto o variación ' . (int) $price['item_id'] . '.' );
			}
			$product->set_regular_price( wc_format_decimal( $price['launch_price'] ) );
			$product->set_sale_price( '' );
			$product->set_price( wc_format_decimal( $price['launch_price'] ) );
			$product->set_date_on_sale_from( null );
			$product->set_date_on_sale_to( null );
			$product->save();
			Nakama_Drops_Repository::mark_price_transitioned( (int) $price['id'] );
		}
		self::sync_parent( (int) $campaign['product_id'] );
	}

	public static function restore( array $campaign, array $prices ) {
		foreach ( $prices as $price ) {
			$product = wc_get_product( (int) $price['item_id'] );
			if ( ! $product ) {
				continue;
			}
			$product->set_regular_price( (string) $price['previous_regular_price'] );
			$product->set_sale_price( (string) $price['previous_sale_price'] );
			$product->set_price( (string) $price['previous_price'] );
			$product->set_date_on_sale_from( $price['previous_sale_from'] ? (int) $price['previous_sale_from'] : null );
			$product->set_date_on_sale_to( $price['previous_sale_to'] ? (int) $price['previous_sale_to'] : null );
			$product->save();
		}
		self::sync_parent( (int) $campaign['product_id'] );
	}

	private static function context_for_product( $product ) {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_id' ) ) {
			return null;
		}
		$item_id = (int) $product->get_id();
		$product_id = method_exists( $product, 'get_parent_id' ) && $product->get_parent_id() ? (int) $product->get_parent_id() : $item_id;
		$campaign = Nakama_Drops_Repository::active_for_product( $product_id );
		if ( ! $campaign ) {
			return null;
		}
		if ( 'error' === $campaign['status'] && ! self::is_due( $campaign ) ) {
			return null;
		}
		$price = Nakama_Drops_Repository::price_for_item( (int) $campaign['id'], $item_id );
		if ( ! $price && $item_id !== $product_id ) {
			return null;
		}
		return $price ? array( 'campaign' => $campaign, 'price' => $price ) : null;
	}

	private static function is_due( array $campaign ) {
		return 'released' === $campaign['status'] || strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time();
	}

	private static function sync_parent( $product_id ) {
		if ( class_exists( 'WC_Product_Variable' ) ) {
			WC_Product_Variable::sync( $product_id );
		}
		if ( function_exists( 'wc_delete_product_transients' ) ) {
			wc_delete_product_transients( $product_id );
		}
		if ( function_exists( 'nakama_products_bump_cache' ) ) {
			nakama_products_bump_cache();
		}
	}
}
