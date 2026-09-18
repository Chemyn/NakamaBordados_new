<?php
/**
 * Campaign scheduling, launch and cancellation.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Lifecycle {
	public static function init() {
		add_action( 'init', array( 'Nakama_Drops_Installer', 'ensure_categories' ) );
		add_action( 'wp_loaded', array( __CLASS__, 'reconcile_due' ), 20 );
		add_action( 'nakama_drops_launch_campaign', array( __CLASS__, 'launch' ), 10, 1 );
	}

	public static function schedule( $campaign_id ) {
		$campaign = Nakama_Drops_Repository::get( $campaign_id );
		if ( ! $campaign ) {
			return false;
		}
		$prices = Nakama_Drops_Repository::prices( $campaign_id );
		Nakama_Drops_Repository::update_status( $campaign_id, 'scheduled' );
		$campaign['status'] = 'scheduled';
		Nakama_Drops_Pricing::apply_presale( $campaign, $prices );
		self::set_categories( (int) $campaign['product_id'], 'presale' );
		$timestamp = strtotime( $campaign['launch_at_gmt'] . ' UTC' );
		if ( $timestamp > time() && ! wp_next_scheduled( 'nakama_drops_launch_campaign', array( (int) $campaign_id ) ) ) {
			wp_schedule_single_event( $timestamp, 'nakama_drops_launch_campaign', array( (int) $campaign_id ) );
		}
		return true;
	}

	public static function retry( $campaign_id ) {
		$campaign = Nakama_Drops_Repository::get( $campaign_id );
		if ( ! $campaign || 'error' !== $campaign['status'] ) {
			return false;
		}
		return strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time()
			? self::launch( $campaign_id )
			: self::schedule( $campaign_id );
	}

	public static function reconcile_due() {
		foreach ( Nakama_Drops_Repository::due_campaigns() as $campaign ) {
			self::launch( (int) $campaign['id'] );
		}
	}

	public static function launch( $campaign_id ) {
		$campaign = Nakama_Drops_Repository::get( $campaign_id );
		if ( ! $campaign || 'released' === $campaign['status'] || 'cancelled' === $campaign['status'] ) {
			return true;
		}
		if ( strtotime( $campaign['launch_at_gmt'] . ' UTC' ) > time() ) {
			return false;
		}
		Nakama_Drops_Repository::update_status( $campaign_id, 'launching' );
		try {
			Nakama_Drops_Pricing::apply_launch( $campaign, Nakama_Drops_Repository::prices( $campaign_id ) );
			self::set_categories( (int) $campaign['product_id'], 'released' );
			Nakama_Drops_Repository::update_status( $campaign_id, 'released' );
			return true;
		} catch ( Throwable $error ) {
			Nakama_Drops_Repository::update_status( $campaign_id, 'error', $error->getMessage() );
			return false;
		}
	}

	public static function cancel( $campaign_id ) {
		$campaign = Nakama_Drops_Repository::get( $campaign_id );
		if ( ! $campaign || 'scheduled' !== $campaign['status'] || strtotime( $campaign['launch_at_gmt'] . ' UTC' ) <= time() ) {
			return false;
		}
		Nakama_Drops_Pricing::restore( $campaign, Nakama_Drops_Repository::prices( $campaign_id ) );
		$previous = json_decode( (string) $campaign['previous_categories'], true );
		wp_set_object_terms( (int) $campaign['product_id'], is_array( $previous ) ? array_map( 'intval', $previous ) : array(), 'product_cat', false );
		wp_clear_scheduled_hook( 'nakama_drops_launch_campaign', array( (int) $campaign_id ) );
		return Nakama_Drops_Repository::update_status( $campaign_id, 'cancelled' );
	}

	private static function set_categories( $product_id, $state ) {
		Nakama_Drops_Installer::ensure_categories();
		$current = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'ids' ) );
		$current = is_wp_error( $current ) ? array() : array_map( 'intval', $current );
		$drops = get_term_by( 'slug', 'drops', 'product_cat' );
		$available = get_term_by( 'slug', 'ya-disponible', 'product_cat' );
		if ( $drops ) {
			$current = array_values( array_diff( $current, array( (int) $drops->term_id ) ) );
		}
		if ( $available ) {
			$current = array_values( array_diff( $current, array( (int) $available->term_id ) ) );
		}
		if ( 'presale' === $state && $drops ) {
			$current[] = (int) $drops->term_id;
		}
		if ( 'released' === $state && $available ) {
			$current[] = (int) $available->term_id;
		}
		wp_set_object_terms( $product_id, array_values( array_unique( $current ) ), 'product_cat', false );
	}
}
