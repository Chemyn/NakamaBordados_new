<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

function affiliate_requests_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf( "%s\nExpected: %s\nActual: %s", $message, var_export( $expected, true ), var_export( $actual, true ) ) );
	}
}

final class Nakama_Affiliates_Domain {
	public static function period_key( DateTimeInterface $instant, DateTimeZone $timezone ) { return '2026-10'; }
}

final class Nakama_Affiliates_Benefits {
	public static int $quota = 2;
	public static function ensure_period( $affiliate_id, $period_key, $actor_user_id = 0 ) {
		return array( 'id' => 5, 'affiliate_id' => (int) $affiliate_id, 'period_key' => $period_key, 'quota' => self::$quota );
	}
}

final class Nakama_Affiliates_Products {
	public static array $invalid = array();
	public static function validate_selection( $product_id, $variation_id, $is_vip ) {
		$key = (int) $product_id . ':' . (int) $variation_id;
		if ( isset( self::$invalid[ $key ] ) ) return array( 'success' => false, 'reason' => self::$invalid[ $key ] );
		return array(
			'success' => true,
			'item' => array(
				'product_id' => (int) $product_id,
				'variation_id' => (int) $variation_id,
				'product_name' => 'Producto ' . (int) $product_id,
				'variation_label' => $variation_id ? 'Talla M' : '',
			),
		);
	}
}

final class Nakama_Affiliates_Benefit_Orders {
	public static function ensure( $id ) {
		Nakama_Affiliates_Repository::update_request( $id, array( 'order_id' => 100 + $id, 'order_ready' => 1 ) );
		return true;
	}
	public static function progress( $request ) { return array( 'stage' => 'created', 'folio' => 'CODE-' . $request['period_key'], 'carrier' => '', 'trackingCode' => '' ); }
}

final class Nakama_Affiliates_Repository {
	public static array $requests = array();
	public static array $items = array();
	public static array $evidence_complete = array();
	public static array $audits = array();
	public static int $next_id = 1;
	public static int $ledger_writes = 0;

	public static function now_gmt(): string { return '2026-10-03 10:00:00'; }
	public static function request_by_affiliate_period( $affiliate_id, $period_key ) {
		foreach ( self::$requests as $request ) {
			if ( (int) $request['affiliate_id'] === (int) $affiliate_id && $request['period_key'] === $period_key ) return $request;
		}
		return null;
	}
	public static function request_by_id( $request_id ) { return self::$requests[ (int) $request_id ] ?? null; }
	public static function request_items( $request_id ): array { return self::$items[ (int) $request_id ] ?? array(); }
	public static function latest_prior_request( $affiliate_id, $period_key ) {
		$found = null;
		foreach ( self::$requests as $request ) {
			if ( (int) $request['affiliate_id'] === (int) $affiliate_id && $request['period_key'] < $period_key && ! in_array( $request['status'], array( 'cancelled', 'rejected' ), true ) ) {
				if ( null === $found || $request['period_key'] > $found['period_key'] ) $found = $request;
			}
		}
		return $found;
	}
	public static function request_has_approved_required_evidence( $request_id ): bool { return ! empty( self::$evidence_complete[ (int) $request_id ] ); }
	public static function create_request_with_items( array $request, array $items ): int {
		if ( self::request_by_affiliate_period( $request['affiliate_id'], $request['period_key'] ) ) return 0;
		$id = self::$next_id++;
		$request['id'] = $id;
		self::$requests[ $id ] = $request;
		self::$items[ $id ] = array();
		foreach ( $items as $position => $item ) self::$items[ $id ][] = $item + array( 'request_id' => $id, 'position' => $position + 1 );
		return $id;
	}
	public static function update_request( $request_id, array $data ): bool {
		if ( ! isset( self::$requests[ (int) $request_id ] ) ) return false;
		self::$requests[ (int) $request_id ] = array_merge( self::$requests[ (int) $request_id ], $data );
		return true;
	}
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ): bool {
		self::$audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-requests.php';

$address = array(
	'name' => 'Jose Lopez',
	'address1' => 'Going Merry 42',
	'address2' => 'Muelle 3',
	'city' => 'Hermosillo',
	'state' => 'Sonora',
	'postcode' => '83000',
	'country' => 'MX',
	'phone' => '6621234567',
);

$too_many = Nakama_Affiliates_Requests::submit( 7, '2026-10', array( array( 'product_id' => 1 ), array( 'product_id' => 2 ), array( 'product_id' => 3 ) ), $address, false, 7 );
affiliate_requests_assert_same( 'quota_exceeded', $too_many['reason'], 'The frozen monthly quota is a strict unit ceiling.' );

Nakama_Affiliates_Products::$invalid['4:0'] = 'out_of_stock';
$invalid_product = Nakama_Affiliates_Requests::submit( 7, '2026-10', array( array( 'product_id' => 4 ) ), $address, false, 7 );
affiliate_requests_assert_same( 'out_of_stock', $invalid_product['reason'], 'Every product is revalidated on submission.' );

$submitted = Nakama_Affiliates_Requests::submit( 7, '2026-10', array( array( 'product_id' => 1 ), array( 'product_id' => 6, 'variation_id' => 61 ) ), $address, false, 7 );
affiliate_requests_assert_same( true, $submitted['success'], 'A valid monthly request is stored for operations.' );
affiliate_requests_assert_same( 'submitted', $submitted['request']['status'], 'The affiliate submission enters the submitted state.' );
affiliate_requests_assert_same( 1, $submitted['request']['shipping_covered'], 'Nakama is explicitly responsible for shipping.' );
affiliate_requests_assert_same( 'Going Merry 42', $submitted['request']['address']['address1'], 'The confirmed address is snapshotted with the request.' );
affiliate_requests_assert_same( 2, count( $submitted['request']['items'] ), 'Each selected unit is stored in its own position.' );
affiliate_requests_assert_same( 0, Nakama_Affiliates_Repository::$ledger_writes, 'A free benefit never creates a sale, commission or goal movement.' );

$duplicate = Nakama_Affiliates_Requests::submit( 7, '2026-10', array( array( 'product_id' => 1 ) ), $address, false, 7 );
affiliate_requests_assert_same( true, $duplicate['success'], 'A repeated submission returns the original monthly request.' );
affiliate_requests_assert_same( $submitted['request']['id'], $duplicate['request']['id'], 'A repeated submission cannot change the selected garments.' );
affiliate_requests_assert_same( 101, $submitted['request']['order_id'], 'Confirmation immediately links a production order.' );

$blocked = Nakama_Affiliates_Requests::submit( 7, '2026-11', array( array( 'product_id' => 1 ) ), $address, false, 7 );
affiliate_requests_assert_same( 'evidence_required', $blocked['reason'], 'Missing mandatory evidence blocks the following monthly request.' );
Nakama_Affiliates_Repository::$evidence_complete[ $submitted['request']['id'] ] = true;
$next = Nakama_Affiliates_Requests::submit( 7, '2026-11', array( array( 'product_id' => 1 ) ), $address, false, 7 );
affiliate_requests_assert_same( true, $next['success'], 'Approved mandatory evidence unlocks the next period.' );
affiliate_requests_assert_same( 1, count( $next['request']['items'] ), 'Unused October quota does not carry into November selections.' );

foreach ( array( 'approved', 'rejected', 'cancelled', 'preparing', 'shipped' ) as $status ) {
	$result = Nakama_Affiliates_Requests::transition( $submitted['request']['id'], $status, array(), 42 );
	affiliate_requests_assert_same( 'automatic_order_workflow', $result['reason'], 'Old administrative forms cannot modify automatic requests.' );
}

echo "PHP Nakama Affiliates monthly request tests passed.\n";
