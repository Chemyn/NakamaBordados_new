<?php
/**
 * Public REST representation consumed by the static Next.js frontend.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_REST {
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route( 'nakama/v1', '/drops', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'get_campaigns' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'product_id' => array( 'sanitize_callback' => 'absint' ),
			),
		) );
	}

	public static function get_campaigns( WP_REST_Request $request ) {
		Nakama_Drops_Lifecycle::reconcile_due();
		$product_id = (int) $request->get_param( 'product_id' );
		$campaigns = $product_id ? array_filter( array( Nakama_Drops_Repository::latest_for_product( $product_id ) ) ) : Nakama_Drops_Repository::public_campaigns();
		$now = new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) );
		$items = array();
		foreach ( $campaigns as $campaign ) {
			if ( 'error' === $campaign['status'] && strtotime( $campaign['launch_at_gmt'] . ' UTC' ) > time() ) {
				continue;
			}
			$product = wc_get_product( (int) $campaign['product_id'] );
			if ( ! $product ) {
				continue;
			}
			if ( 'released' === $campaign['status'] && ! has_term( 'ya-disponible', 'product_cat', (int) $campaign['product_id'] ) ) {
				continue;
			}
			$campaign['product_slug'] = $product->get_slug();
			$items[] = Nakama_Drops_Domain::to_public( $campaign, Nakama_Drops_Repository::prices( (int) $campaign['id'] ), $now );
		}
		$response = rest_ensure_response( array( 'items' => $items, 'serverNow' => $now->format( 'Y-m-d\TH:i:s\Z' ) ) );
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		$response->header( 'Pragma', 'no-cache' );
		return $response;
	}
}
