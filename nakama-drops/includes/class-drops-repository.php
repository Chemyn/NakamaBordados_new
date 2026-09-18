<?php
/**
 * Persistence gateway for campaigns, prices and quota reservations.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Repository {
	private static function table( $suffix ) {
		global $wpdb;
		return $wpdb->prefix . $suffix;
	}

	public static function now_gmt() {
		return gmdate( 'Y-m-d H:i:s' );
	}

	public static function active_for_product( $product_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$table} WHERE product_id = %d AND status IN ('scheduled','launching','error') ORDER BY id DESC LIMIT 1",
			(int) $product_id
		), ARRAY_A );
	}

	public static function latest_for_product( $product_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$table} WHERE product_id = %d AND status IN ('scheduled','launching','released','error') ORDER BY id DESC LIMIT 1",
			(int) $product_id
		), ARRAY_A );
	}

	public static function get( $campaign_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $campaign_id ), ARRAY_A );
	}

	public static function prices( $campaign_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drop_prices' );
		return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE campaign_id = %d ORDER BY item_id", (int) $campaign_id ), ARRAY_A );
	}

	public static function price_for_item( $campaign_id, $item_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drop_prices' );
		return $wpdb->get_row( $wpdb->prepare(
			"SELECT * FROM {$table} WHERE campaign_id = %d AND item_id = %d LIMIT 1",
			(int) $campaign_id,
			(int) $item_id
		), ARRAY_A );
	}

	public static function create( array $campaign, array $prices, $status ) {
		global $wpdb;
		$now = self::now_gmt();
		$campaign_table = self::table( 'nakama_drops' );
		$price_table = self::table( 'nakama_drop_prices' );
		$wpdb->query( 'START TRANSACTION' );
		$inserted = $wpdb->insert( $campaign_table, array(
			'product_id'         => (int) $campaign['product_id'],
			'status'             => $status,
			'launch_at_gmt'      => $campaign['launch_at_gmt'],
			'launch_at_local'    => $campaign['launch_at_local'],
			'timezone'           => $campaign['timezone'],
			'capacity'           => $campaign['capacity'],
			'reserved'           => 0,
			'timer_position'     => $campaign['timer_position'],
			'previous_categories'=> wp_json_encode( wp_get_post_terms( (int) $campaign['product_id'], 'product_cat', array( 'fields' => 'ids' ) ) ),
			'created_at_gmt'     => $now,
			'updated_at_gmt'     => $now,
		) );
		if ( ! $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}

		$campaign_id = (int) $wpdb->insert_id;
		foreach ( $prices as $price ) {
			$item_id = (int) $price['item_id'];
			$ok = $wpdb->insert( $price_table, array(
				'campaign_id'           => $campaign_id,
				'item_id'               => $item_id,
				'presale_price'         => $price['presale'],
				'launch_price'          => $price['launch'],
				'previous_price'        => (string) get_post_meta( $item_id, '_price', true ),
				'previous_regular_price'=> (string) get_post_meta( $item_id, '_regular_price', true ),
				'previous_sale_price'   => (string) get_post_meta( $item_id, '_sale_price', true ),
				'previous_sale_from'    => (string) get_post_meta( $item_id, '_sale_price_dates_from', true ),
				'previous_sale_to'      => (string) get_post_meta( $item_id, '_sale_price_dates_to', true ),
				'transitioned'          => 0,
			) );
			if ( ! $ok ) {
				$wpdb->query( 'ROLLBACK' );
				return 0;
			}
		}
		$wpdb->query( 'COMMIT' );
		return $campaign_id;
	}

	public static function update_status( $campaign_id, $status, $error = '' ) {
		global $wpdb;
		$data = array(
			'status'         => $status,
			'last_error'     => $error,
			'updated_at_gmt' => self::now_gmt(),
		);
		if ( 'released' === $status ) {
			$data['launched_at_gmt'] = self::now_gmt();
		}
		if ( 'cancelled' === $status ) {
			$data['cancelled_at_gmt'] = self::now_gmt();
		}
		return false !== $wpdb->update( self::table( 'nakama_drops' ), $data, array( 'id' => (int) $campaign_id ) );
	}

	public static function mark_price_transitioned( $price_id ) {
		global $wpdb;
		$wpdb->update( self::table( 'nakama_drop_prices' ), array( 'transitioned' => 1 ), array( 'id' => (int) $price_id ) );
	}

	public static function due_campaigns() {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$table} WHERE status IN ('scheduled','launching','error') AND launch_at_gmt <= %s ORDER BY launch_at_gmt ASC",
			self::now_gmt()
		), ARRAY_A );
	}

	public static function public_campaigns() {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_results(
			"SELECT * FROM {$table} WHERE status IN ('scheduled','launching','released','error') ORDER BY launch_at_gmt ASC",
			ARRAY_A
		);
	}

	public static function admin_campaigns() {
		global $wpdb;
		$table = self::table( 'nakama_drops' );
		return $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at_gmt DESC", ARRAY_A );
	}

	public static function reserve( $campaign_id, $quantity, $order_id, $order_item_id ) {
		global $wpdb;
		$campaign = self::get( $campaign_id );
		if ( ! $campaign ) {
			return false;
		}
		$reservation_table = self::table( 'nakama_drop_reservations' );
		$existing = $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM {$reservation_table} WHERE campaign_id = %d AND order_id = %d AND order_item_id = %d",
			(int) $campaign_id,
			(int) $order_id,
			(int) $order_item_id
		) );
		if ( $existing ) {
			return true;
		}

		$campaign_table = self::table( 'nakama_drops' );
		$quantity = max( 1, (int) $quantity );
		if ( null === $campaign['capacity'] ) {
			$changed = $wpdb->query( $wpdb->prepare(
				"UPDATE {$campaign_table} SET reserved = reserved + %d, updated_at_gmt = %s WHERE id = %d AND status = 'scheduled' AND launch_at_gmt > %s",
				$quantity,
				self::now_gmt(),
				(int) $campaign_id,
				self::now_gmt()
			) );
		} else {
			$changed = $wpdb->query( $wpdb->prepare(
				"UPDATE {$campaign_table} SET reserved = reserved + %d, updated_at_gmt = %s WHERE id = %d AND status = 'scheduled' AND launch_at_gmt > %s AND reserved + %d <= capacity",
				$quantity,
				self::now_gmt(),
				(int) $campaign_id,
				self::now_gmt(),
				$quantity
			) );
		}
		if ( 1 !== $changed ) {
			return false;
		}

		$inserted = $wpdb->insert( $reservation_table, array(
			'campaign_id'      => (int) $campaign_id,
			'order_id'         => (int) $order_id,
			'order_item_id'    => (int) $order_item_id,
			'quantity'         => $quantity,
			'released_quantity'=> 0,
			'created_at_gmt'   => self::now_gmt(),
			'updated_at_gmt'   => self::now_gmt(),
		) );
		if ( ! $inserted ) {
			$wpdb->query( $wpdb->prepare( "UPDATE {$campaign_table} SET reserved = GREATEST(0, reserved - %d) WHERE id = %d", $quantity, (int) $campaign_id ) );
			return false;
		}
		return true;
	}

	public static function reservations_for_order( $order_id ) {
		global $wpdb;
		$table = self::table( 'nakama_drop_reservations' );
		return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE order_id = %d", (int) $order_id ), ARRAY_A );
	}

	public static function release_reservation( array $reservation, $quantity ) {
		global $wpdb;
		$available = max( 0, (int) $reservation['quantity'] - (int) $reservation['released_quantity'] );
		$release = min( $available, max( 0, (int) $quantity ) );
		if ( $release < 1 ) {
			return 0;
		}
		$wpdb->query( 'START TRANSACTION' );
		$updated = $wpdb->query( $wpdb->prepare(
			'UPDATE ' . self::table( 'nakama_drop_reservations' ) . ' SET released_quantity = released_quantity + %d, updated_at_gmt = %s WHERE id = %d AND released_quantity + %d <= quantity',
			$release,
			self::now_gmt(),
			(int) $reservation['id'],
			$release
		) );
		if ( 1 !== $updated ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$wpdb->query( $wpdb->prepare(
			'UPDATE ' . self::table( 'nakama_drops' ) . ' SET reserved = GREATEST(0, reserved - %d), updated_at_gmt = %s WHERE id = %d AND launch_at_gmt > %s',
			$release,
			self::now_gmt(),
			(int) $reservation['campaign_id'],
			self::now_gmt()
		) );
		$wpdb->query( 'COMMIT' );
		return $release;
	}
}
