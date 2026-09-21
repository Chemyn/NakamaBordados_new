<?php
/**
 * WooCommerce catalog rules for the affiliate monthly benefit.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Products {
	const RESTRICTED_CATEGORIES_OPTION = 'nakama_affiliates_restricted_category_ids';
	const OFFICIAL_ACCOUNTS_OPTION     = 'nakama_affiliates_official_accounts';

	/** Return one WooCommerce catalog page after applying affiliate visibility. */
	public static function catalog( $is_vip, $page = 1, $per_page = 20 ) {
		$page     = max( 1, (int) $page );
		$per_page = min( 50, max( 1, (int) $per_page ) );
		if ( ! function_exists( 'wc_get_products' ) ) {
			return array( 'items' => array(), 'page' => $page, 'pages' => 0, 'total' => 0, 'hasMore' => false );
		}

		$result = wc_get_products( array(
			'status'       => 'publish',
			'visibility'   => 'catalog',
			'stock_status' => 'instock',
			'limit'        => $per_page,
			'page'         => $page,
			'paginate'     => true,
			'orderby'      => 'date',
			'order'        => 'DESC',
		) );
		$products = is_object( $result ) && isset( $result->products ) ? $result->products : ( is_array( $result ) ? $result : array() );
		$items    = array();
		foreach ( $products as $product ) {
			if ( ! self::catalog_product_allowed( $product, (bool) $is_vip ) ) {
				continue;
			}
			$items[] = self::serialize_product( $product, (bool) $is_vip );
		}

		$total = is_object( $result ) && isset( $result->total ) ? (int) $result->total : count( $products );
		$pages = is_object( $result ) && isset( $result->max_num_pages ) ? (int) $result->max_num_pages : ( $total ? 1 : 0 );
		return array(
			'items'    => $items,
			'page'     => $page,
			'pages'    => $pages,
			'total'    => $total,
			'hasMore'  => $page < $pages,
		);
	}

	/** Revalidate a concrete product and variation at submission time. */
	public static function validate_selection( $product_id, $variation_id, $is_vip ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return self::failure( 'catalog_unavailable' );
		}
		$product = wc_get_product( (int) $product_id );
		if ( ! $product || ( method_exists( $product, 'is_type' ) && $product->is_type( 'variation' ) ) ) {
			return self::failure( 'product_not_found' );
		}
		if ( ! self::is_published_visible( $product ) ) {
			return self::failure( 'outside_catalog' );
		}
		if ( ! method_exists( $product, 'is_in_stock' ) || ! $product->is_in_stock() ) {
			return self::failure( 'out_of_stock' );
		}
		if ( ! $is_vip && self::is_restricted( $product ) ) {
			return self::failure( 'restricted_category' );
		}

		$variation = null;
		$is_variable = method_exists( $product, 'is_type' ) && $product->is_type( 'variable' );
		if ( $is_variable && (int) $variation_id <= 0 ) {
			return self::failure( 'variation_required' );
		}
		if ( (int) $variation_id > 0 ) {
			$variation = wc_get_product( (int) $variation_id );
			if (
				! $variation ||
				! method_exists( $variation, 'is_type' ) ||
				! $variation->is_type( 'variation' ) ||
				! method_exists( $variation, 'get_parent_id' ) ||
				(int) $variation->get_parent_id() !== (int) $product->get_id()
			) {
				return self::failure( 'invalid_variation' );
			}
			if ( ! method_exists( $variation, 'is_in_stock' ) || ! $variation->is_in_stock() ) {
				return self::failure( 'out_of_stock' );
			}
		} elseif ( ! $is_variable && (int) $variation_id > 0 ) {
			return self::failure( 'invalid_variation' );
		}

		return array(
			'success' => true,
			'item'    => array(
				'product_id'     => (int) $product->get_id(),
				'variation_id'   => $variation ? (int) $variation->get_id() : 0,
				'product_name'   => (string) $product->get_name(),
				'variation_label'=> $variation ? self::variation_label( $variation ) : '',
			),
		);
	}

	public static function restricted_category_ids() {
		$ids = self::normalize_ids( function_exists( 'get_option' ) ? get_option( self::RESTRICTED_CATEGORIES_OPTION, array() ) : array() );
		if ( $ids || ! function_exists( 'get_term_by' ) ) {
			return $ids;
		}

		foreach ( array( 'drops', 'edicion-especial' ) as $slug ) {
			$term = get_term_by( 'slug', $slug, 'product_cat' );
			if ( $term && ! is_wp_error( $term ) ) {
				$ids[] = (int) $term->term_id;
			}
		}
		return array_values( array_unique( array_filter( $ids ) ) );
	}

	public static function official_accounts() {
		$value = function_exists( 'get_option' ) ? get_option( self::OFFICIAL_ACCOUNTS_OPTION, array() ) : array();
		return self::normalize_accounts( $value );
	}

	public static function save_settings( $category_ids, $official_accounts, $actor_user_id ) {
		if ( (int) $actor_user_id <= 0 ) {
			return self::failure( 'actor_required' );
		}
		$ids      = self::normalize_ids( $category_ids );
		$accounts = self::normalize_accounts( $official_accounts );
		if ( function_exists( 'update_option' ) ) {
			update_option( self::RESTRICTED_CATEGORIES_OPTION, $ids );
			update_option( self::OFFICIAL_ACCOUNTS_OPTION, $accounts );
		}
		Nakama_Affiliates_Repository::audit(
			'affiliate_program_settings_updated',
			'affiliate_settings',
			0,
			self::encode( array( 'restricted_category_ids' => $ids, 'official_accounts' => $accounts ) ),
			(int) $actor_user_id
		);
		return array( 'success' => true, 'restricted_category_ids' => $ids, 'official_accounts' => $accounts );
	}

	private static function catalog_product_allowed( $product, $is_vip ) {
		return $product && self::is_published_visible( $product ) && method_exists( $product, 'is_in_stock' ) && $product->is_in_stock() && ( $is_vip || ! self::is_restricted( $product ) );
	}

	private static function is_published_visible( $product ) {
		$status = method_exists( $product, 'get_status' ) ? (string) $product->get_status() : '';
		$visibility = method_exists( $product, 'get_catalog_visibility' ) ? (string) $product->get_catalog_visibility() : 'visible';
		return 'publish' === $status && in_array( $visibility, array( 'visible', 'catalog' ), true );
	}

	private static function is_restricted( $product ) {
		$categories = method_exists( $product, 'get_category_ids' ) ? array_map( 'intval', $product->get_category_ids() ) : array();
		return (bool) array_intersect( $categories, self::restricted_category_ids() );
	}

	private static function serialize_product( $product, $is_vip ) {
		$variations = array();
		if ( method_exists( $product, 'is_type' ) && $product->is_type( 'variable' ) && method_exists( $product, 'get_children' ) ) {
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( (int) $variation_id );
				if ( ! $variation || ! method_exists( $variation, 'is_in_stock' ) || ! $variation->is_in_stock() ) continue;
				$variations[] = array(
					'id'    => (int) $variation->get_id(),
					'label' => self::variation_label( $variation ),
					'price' => method_exists( $variation, 'get_price' ) ? (float) $variation->get_price() : 0.0,
				);
			}
		}
		$image_id = method_exists( $product, 'get_image_id' ) ? (int) $product->get_image_id() : 0;
		return array(
			'id'         => (int) $product->get_id(),
			'name'       => (string) $product->get_name(),
			'price'      => method_exists( $product, 'get_price' ) ? (float) $product->get_price() : 0.0,
			'image'      => $image_id && function_exists( 'wp_get_attachment_image_url' ) ? (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : '',
			'restricted' => self::is_restricted( $product ),
			'vipVisible' => (bool) $is_vip,
			'variations' => $variations,
		);
	}

	private static function variation_label( $variation ) {
		if ( function_exists( 'wc_get_formatted_variation' ) ) {
			return trim( wp_strip_all_tags( wc_get_formatted_variation( $variation, true, false, true ) ) );
		}
		$attributes = method_exists( $variation, 'get_attributes' ) ? $variation->get_attributes() : array();
		return implode( ' · ', array_values( array_filter( array_map( 'strval', $attributes ) ) ) );
	}

	private static function normalize_ids( $value ) {
		if ( is_string( $value ) ) $value = preg_split( '/[\s,]+/', $value );
		if ( ! is_array( $value ) ) return array();
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $value ), static function ( $id ) { return $id > 0; } ) ) );
		sort( $ids, SORT_NUMERIC );
		return $ids;
	}

	private static function normalize_accounts( $value ) {
		if ( is_string( $value ) ) $value = preg_split( '/[\r\n,]+/', $value );
		if ( ! is_array( $value ) ) return array();
		$accounts = array();
		foreach ( $value as $account ) {
			$account = trim( function_exists( 'sanitize_text_field' ) ? sanitize_text_field( $account ) : strip_tags( (string) $account ) );
			if ( '' !== $account ) $accounts[] = substr( $account, 0, 191 );
		}
		return array_values( array_unique( $accounts ) );
	}

	private static function encode( array $data ) {
		return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data );
	}

	private static function failure( $reason ) {
		return array( 'success' => false, 'reason' => (string) $reason );
	}
}
