<?php
/** Automatic, recoverable WooCommerce orders for monthly affiliate benefits. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Nakama_Affiliates_Benefit_Orders {
	const CRON = 'nakama_affiliates_recover_benefit_orders';

	public static function init() {
		add_filter( 'woocommerce_order_number', array( __CLASS__, 'order_number' ), 30, 2 );
		add_filter( 'woocommerce_order_query_args', array( __CLASS__, 'hpos_query' ) );
		add_filter( 'woocommerce_order_data_store_cpt_get_orders_query', array( __CLASS__, 'legacy_query' ), 10, 2 );
		add_action( 'init', array( __CLASS__, 'maybe_recover' ), 30 );
		add_action( self::CRON, array( __CLASS__, 'recover' ) );
		add_action( 'woocommerce_after_order_object_save', array( __CLASS__, 'sync' ) );
	}

	public static function hpos_query( $args ) {
		if ( ! empty( $args['nk_benefit_request'] ) && class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
			$args['meta_query'][] = array( 'key' => '_nakama_affiliate_request_id', 'value' => (string) $args['nk_benefit_request'], 'compare' => '=' );
			unset( $args['nk_benefit_request'] );
		}
		return $args;
	}

	public static function legacy_query( $query, $args ) {
		if ( ! empty( $args['nk_benefit_request'] ) ) $query['meta_query'][] = array( 'key' => '_nakama_affiliate_request_id', 'value' => (string) $args['nk_benefit_request'], 'compare' => '=' );
		return $query;
	}

	public static function maybe_recover() {
		if ( ! wp_next_scheduled( self::CRON ) ) self::recover();
	}

	public static function order_number( $number, $order ) {
		if ( $order && 'yes' === $order->get_meta( '_nakama_affiliate_benefit' ) ) {
			return $order->get_meta( '_nakama_affiliate_benefit_folio' ) ?: $number;
		}
		return $number;
	}

	/** Runs after schema upgrade. Each request is locked independently and may safely retry. */
	public static function recover() {
		if ( ! function_exists( 'wc_get_orders' ) || ! class_exists( 'WC_Order' ) ) return;
		$ids = Nakama_Affiliates_Repository::requests_without_ready_order();
		foreach ( $ids as $id ) self::ensure( $id );
		if ( $ids && ! wp_next_scheduled( self::CRON ) ) wp_schedule_single_event( time() + 60, self::CRON );
	}

	public static function ensure( $request_id ) {
		if ( ! class_exists( 'WC_Order' ) ) return false;
		if ( ! Nakama_Affiliates_Repository::acquire_request_order_lock( $request_id ) ) return false;
		$ready = false;
		try {
			$request = Nakama_Affiliates_Repository::request_by_id( $request_id );
			if ( ! $request || in_array( $request['status'], array( 'draft', 'rejected', 'cancelled' ), true ) ) return false;
			$order = ! empty( $request['order_id'] ) ? wc_get_order( (int) $request['order_id'] ) : false;
			if ( ! $order ) {
				// Recover the narrow failure window between the Woo save and the request link.
				$matches = wc_get_orders( array( 'type' => 'shop_order', 'limit' => 1, 'nk_benefit_request' => (int) $request_id ) );
				$order = $matches ? reset( $matches ) : false;
			}
			if ( $order && (int) $order->get_meta( '_nakama_affiliate_request_id' ) !== (int) $request_id ) return false;
			if ( $order && 'yes' === $order->get_meta( '_nakama_affiliate_benefit_ready' ) ) {
				if ( ! Nakama_Affiliates_Repository::update_request( $request_id, array( 'order_id' => $order->get_id(), 'order_ready' => 1 ) ) ) return false;
				wc_release_stock_for_order( $order );
				self::sync( $order );
				$ready = true;
				return $order;
			}
			$profile = Nakama_Affiliates_Repository::profile_by_id( (int) $request['affiliate_id'] );
			if ( ! $profile ) return false;
			$items = Nakama_Affiliates_Repository::request_items( $request_id );
			if ( ! $items ) return false;
			$legacy_done = in_array( $request['status'], array( 'preparing', 'shipped', 'completed' ), true );
			$products = array();
			foreach ( $items as $item ) {
				$product = wc_get_product( (int) ( $item['variation_id'] ?: $item['product_id'] ) );
				if ( ! $legacy_done && ( ! $product || ! $product->is_in_stock() ) ) return false;
				$products[] = $product;
			}
			if ( ! $order ) {
				$order = new WC_Order();
				$order->set_customer_id( (int) $profile['user_id'] );
				$order->set_created_via( 'nakama-affiliate-benefit' );
				$order->set_currency( 'MXN' );
				$order->update_meta_data( '_nakama_affiliate_benefit', 'yes' );
				$order->update_meta_data( '_nakama_affiliate_request_id', (int) $request_id );
				$date = ! empty( $request['submitted_at_gmt'] ) ? get_date_from_gmt( $request['submitted_at_gmt'], 'Y-m' ) : $request['period_key'];
				$order->update_meta_data( '_nakama_affiliate_benefit_folio', $profile['code'] . '-' . $date );
				$order->save();
			}
			if ( ! Nakama_Affiliates_Repository::update_request( $request_id, array( 'order_id' => $order->get_id() ) ) ) return false;
			// An incomplete order never enters Production. Rebuild only this draft's lines.
			$order->remove_order_items();
			foreach ( $items as $index => $item ) {
				$line = new WC_Order_Item_Product();
				if ( $products[$index] ) $line->set_product( $products[$index] );
				$line->set_name( $item['product_name'] );
				$line->set_product_id( (int) $item['product_id'] );
				$line->set_variation_id( (int) $item['variation_id'] );
				$line->set_quantity( (int) $item['quantity'] );
				$line->set_subtotal( 0 );
				$line->set_total( 0 );
				$line->set_taxes( array( 'total' => array(), 'subtotal' => array() ) );
				$line->add_meta_data( '_nakama_affiliate_benefit', 'yes', true );
				if ( $item['variation_label'] ) $line->add_meta_data( 'Variante solicitada', $item['variation_label'], true );
				$order->add_item( $line );
			}
			$address = json_decode( $request['address_json'] ?? '{}', true );
			$address = is_array( $address ) ? $address : array();
			$shipping = array( 'first_name' => $address['name'] ?? '', 'last_name' => '', 'address_1' => $address['address1'] ?? '', 'address_2' => $address['address2'] ?? '' );
			foreach ( array( 'city', 'state', 'postcode', 'country', 'phone' ) as $key ) $shipping[$key] = $address[$key] ?? '';
			$order->set_address( $shipping, 'shipping' );
			$order->set_address( $shipping, 'billing' );
			$shipment = new WC_Order_Item_Shipping();
			$shipment->set_method_title( 'Envío cubierto por Nakama' );
			$shipment->set_method_id( 'free_shipping' );
			$shipment->set_total( 0 );
			$order->add_item( $shipment );
			$order->calculate_totals( false );
			$order->set_total( 0 );
			if ( ! empty( $request['tracking_code'] ) ) {
				$order->update_meta_data( '_envia_tracking_code', $request['tracking_code'] );
				$order->update_meta_data( '_envia_carrier', $request['carrier'] );
			}
			$order->save();
			if ( $legacy_done ) {
				// Existing deliveries already consumed physical stock; do not deduct it again.
				$order->get_data_store()->set_stock_reduced( $order->get_id(), true );
			} else {
				wc_reserve_stock_for_order( $order );
			}
			$state = $legacy_done ? ( 'preparing' === $request['status'] ? 'pendiente-guia' : 'completed' ) : 'processing';
			if ( 'completed' === $state ) $order->update_meta_data( '_nakama_prod_quality_approved', 'yes' );
			$order->update_meta_data( '_nakama_affiliate_legacy_status', $request['status'] );
			$order->set_status( $state );
			if ( $order->get_status() !== $state ) throw new RuntimeException( 'production_status_unavailable' );
			$order->update_meta_data( '_nakama_affiliate_benefit_ready', 'yes' );
			$order->save();
			wc_release_stock_for_order( $order );
			if ( ! Nakama_Affiliates_Repository::update_request( $request_id, array( 'order_ready' => 1 ) ) ) return false;
			self::sync( $order );
			Nakama_Affiliates_Repository::audit( 'affiliate_benefit_order_created', 'affiliate_request', $request_id, wp_json_encode( array( 'order_id' => $order->get_id(), 'folio' => $order->get_order_number() ) ), 0 );
			$ready = true;
			return $order;
		} catch ( Throwable $error ) {
			// Keep the durable request/draft for automatic recovery; never leak engine errors.
			return false;
		} finally {
			Nakama_Affiliates_Repository::release_request_order_lock( $request_id );
			if ( ! $ready ) {
				// Rotate failed records behind other work instead of starving later requests.
				Nakama_Affiliates_Repository::update_request( $request_id, array( 'updated_at_gmt' => Nakama_Affiliates_Repository::now_gmt() ) );
				if ( ! wp_next_scheduled( self::CRON ) ) wp_schedule_single_event( time() + 60, self::CRON );
			}
		}
	}

	/** Owner-safe projection: deliberately no operators, internal notes or production cycles. */
	public static function progress( array $request ) {
		if ( empty( $request['order_id'] ) && in_array( $request['status'], array( 'draft', 'rejected', 'cancelled' ), true ) ) return null;
		$order = ! empty( $request['order_id'] ) ? wc_get_order( (int) $request['order_id'] ) : false;
		if ( ! $order || (int) $order->get_meta( '_nakama_affiliate_request_id' ) !== (int) $request['id'] ) return array( 'stage' => 'creating', 'folio' => '', 'carrier' => '', 'trackingCode' => '' );
		$tracking = function_exists( 'nakama_find_order_tracking' ) ? nakama_find_order_tracking( $order ) : array( 'code' => $order->get_meta( '_envia_tracking_code' ), 'carrier' => $order->get_meta( '_envia_carrier' ) );
		$stage = 'created';
		$status = $order->get_status();
		if ( 'yes' !== $order->get_meta( '_nakama_affiliate_benefit_ready' ) ) $stage = 'creating';
		elseif ( in_array( $status, array( 'cancelled', 'failed', 'refunded' ), true ) ) $stage = 'incident';
		elseif ( 'completed' === $status ) $stage = 'shipping_registered';
		elseif ( 'pendiente-guia' === $status ) $stage = 'yes' === $order->get_meta( '_nakama_prod_quality_approved' ) ? 'ready_to_ship' : 'quality';
		elseif ( 'fabricando' === $status || $order->get_meta( '_nakama_prod_taken_at' ) ) $stage = 'production';
		return array( 'stage' => $stage, 'folio' => (string) $order->get_order_number(), 'carrier' => (string) ( $tracking['carrier'] ?? '' ), 'trackingCode' => (string) ( $tracking['code'] ?? '' ) );
	}

	public static function sync( $order ) {
		if ( ! $order instanceof WC_Order || 'yes' !== $order->get_meta( '_nakama_affiliate_benefit_ready' ) ) return;
		$id = (int) $order->get_meta( '_nakama_affiliate_request_id' );
		$request = $id ? Nakama_Affiliates_Repository::request_by_id( $id ) : null;
		if ( ! $request || (int) ( $request['order_id'] ?? 0 ) !== $order->get_id() ) return;
		$progress = self::progress( $request );
		$state = in_array( $progress['stage'], array( 'production', 'quality', 'ready_to_ship' ), true ) ? 'preparing' : 'submitted';
		if ( 'shipping_registered' === $progress['stage'] ) $state = 'completed' === $order->get_meta( '_nakama_affiliate_legacy_status' ) ? 'completed' : 'shipped';
		if ( 'incident' === $progress['stage'] ) return;
		Nakama_Affiliates_Repository::update_request( $id, array( 'status' => $state, 'carrier' => $progress['carrier'], 'tracking_code' => $progress['trackingCode'], 'updated_at_gmt' => Nakama_Affiliates_Repository::now_gmt() ) );
	}
}
