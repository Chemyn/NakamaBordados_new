<?php
declare(strict_types=1);
define( 'ABSPATH', __DIR__ . '/' );

function benefit_assert( $expected, $actual, $message ) {
	if ( $expected !== $actual ) throw new RuntimeException( $message . ': ' . var_export( $actual, true ) );
}
function wp_json_encode( $data ) { return json_encode( $data ); }
function get_date_from_gmt( $date, $format ) { return ( new DateTimeImmutable( $date, new DateTimeZone( 'UTC' ) ) )->setTimezone( new DateTimeZone( 'America/Hermosillo' ) )->format( $format ); }
function wp_next_scheduled( $hook ) { return false; }
function wp_schedule_single_event( $time, $hook ) { $GLOBALS['scheduled'][] = $hook; }
function wc_get_order( $id ) { return $GLOBALS['orders'][$id] ?? false; }
function wc_get_orders( $args ) {
	$query = BenefitTestOrderUtil::$hpos ? Nakama_Affiliates_Benefit_Orders::hpos_query( $args ) : Nakama_Affiliates_Benefit_Orders::legacy_query( array(), $args );
	$meta = $query['meta_query'][0];
	return array_values( array_filter( $GLOBALS['orders'] ?? array(), static function ( $order ) use ( $meta ) { return (string) $order->get_meta( $meta['key'] ) === $meta['value']; } ) );
}
class BenefitTestOrderUtil {
	public static $hpos = true;
	public static function custom_orders_table_usage_is_enabled() { return self::$hpos; }
}
class_alias( 'BenefitTestOrderUtil', 'Automattic\WooCommerce\Utilities\OrderUtil' );
function wc_get_product( $id ) { return new class { public function is_in_stock() { return true; } }; }
function wc_reserve_stock_for_order( $order ) {
	$GLOBALS['reservations']++;
	if ( ! empty( $GLOBALS['fail_reservation'] ) ) throw new RuntimeException( 'Temporary stock contention' );
}
function wc_release_stock_for_order( $order ) { $GLOBALS['released'][] = $order->get_id(); }

class WC_Order_Item_Product {
	public $data = array();
	public function __call( $name, $args ) { $this->data[$name] = $args; }
}
class WC_Order_Item_Shipping extends WC_Order_Item_Product {}
class WC_Order {
	public $id = 0;
	public $meta = array();
	public $items = array();
	public $data = array();
	public $status = 'pending';
	public function __call( $name, $args ) { $this->data[$name] = $args; }
	public function get_id() { return $this->id; }
	public function get_status() { return $this->status; }
	public function set_status( $status ) { $this->status = $status; }
	public function get_meta( $key ) { return $this->meta[$key] ?? ''; }
	public function update_meta_data( $key, $value ) { $this->meta[$key] = $value; }
	public function save() {
		if ( ! $this->id ) $this->id = count( $GLOBALS['orders'] ?? array() ) + 100;
		$GLOBALS['orders'][$this->id] = $this;
		Nakama_Affiliates_Benefit_Orders::sync( $this );
		return $this->id;
	}
	public function remove_order_items() { $this->items = array(); }
	public function add_item( $item ) { $this->items[] = $item; }
	public function get_order_number() { return Nakama_Affiliates_Benefit_Orders::order_number( (string) $this->id, $this ); }
	public function get_data_store() { return new class { public function set_stock_reduced( $id, $value ) { $GLOBALS['legacy_stock'][$id] = $value; } }; }
}
class Nakama_Affiliates_Repository {
	public static $requests = array();
	public static $locked = array();
	public static $fail_link = false;
	public static function request_by_id( $id ) { return self::$requests[$id] ?? null; }
	public static function request_items( $id ) { return array(
		array( 'product_id' => 1, 'variation_id' => 0, 'product_name' => 'Sudadera', 'variation_label' => '', 'quantity' => 1 ),
		array( 'product_id' => 6, 'variation_id' => 61, 'product_name' => 'Playera', 'variation_label' => 'Mediana', 'quantity' => 1 ),
	); }
	public static function profile_by_id( $id ) { return array( 'user_id' => 7, 'code' => 'CHEMYN10' ); }
	public static function update_request( $id, $data ) {
		if ( self::$fail_link && isset( $data['order_id'] ) ) return false;
		self::$requests[$id] = array_merge( self::$requests[$id], $data );
		return true;
	}
	public static function acquire_request_order_lock( $id ) { if ( ! empty( self::$locked[$id] ) ) return false; self::$locked[$id] = true; return true; }
	public static function release_request_order_lock( $id ) { self::$locked[$id] = false; }
	public static function audit( ...$args ) { $GLOBALS['audits'][] = $args; }
	public static function now_gmt() { return '2026-11-09 12:00:00'; }
	public static function requests_without_ready_order() { return array_keys( array_filter( self::$requests, static function ( $r ) { return empty( $r['order_ready'] ); } ) ); }
}
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-benefit-orders.php';
$GLOBALS['reservations'] = 0;
$fixture = array( 'id' => 1, 'affiliate_id' => 7, 'period_key' => '2026-10', 'status' => 'submitted', 'submitted_at_gmt' => '2026-11-01 01:00:00', 'order_id' => 0, 'order_ready' => 0, 'carrier' => '', 'tracking_code' => '', 'address_json' => json_encode( array( 'name' => 'Afiliado', 'address1' => 'Calle 1', 'city' => 'Hermosillo', 'state' => 'Sonora', 'postcode' => '83000', 'country' => 'MX', 'phone' => '6621234567' ) ) );
Nakama_Affiliates_Repository::$requests[1] = $fixture;
$order = Nakama_Affiliates_Benefit_Orders::ensure( 1 );
benefit_assert( 'processing', $order->get_status(), 'A confirmation enters the existing production queue' );
benefit_assert( 'CHEMYN10-2026-10', $order->get_order_number(), 'Folio uses the original local submission month, without internal ID' );
benefit_assert( 3, count( $order->items ), 'One order groups both garments and covered shipping' );
benefit_assert( array( 0 ), $order->data['set_total'], 'The order is free' );
benefit_assert( 'yes', $order->get_meta( '_nakama_affiliate_benefit' ), 'The benefit is excluded from commissions before activation' );
benefit_assert( array( '_nakama_affiliate_benefit', 'yes', true ), $order->items[0]->data['add_meta_data'], 'Garment lines are excluded from eligible sales' );
benefit_assert( 1, Nakama_Affiliates_Repository::$requests[1]['order_ready'], 'A durable request link is saved' );
benefit_assert( $order->get_id(), Nakama_Affiliates_Benefit_Orders::ensure( 1 )->get_id(), 'Repeated confirmations reuse the order' );
benefit_assert( 1, count( $GLOBALS['orders'] ), 'Repeated confirmations never duplicate an order' );
benefit_assert( 1, $GLOBALS['reservations'], 'Stock is reserved once' );
Nakama_Affiliates_Repository::$locked[1] = true;
benefit_assert( false, Nakama_Affiliates_Benefit_Orders::ensure( 1 ), 'A concurrent worker cannot create another order' );
Nakama_Affiliates_Repository::$locked[1] = false;

foreach ( array( 'fabricando' => 'production', 'pendiente-guia' => 'quality', 'completed' => 'shipping_registered' ) as $status => $stage ) {
	$order->set_status( $status ); $order->save();
	benefit_assert( $stage, Nakama_Affiliates_Benefit_Orders::progress( Nakama_Affiliates_Repository::$requests[1] )['stage'], 'Production progress is derived from the actual order' );
}
$order->set_status( 'pendiente-guia' );
$order->update_meta_data( '_nakama_prod_quality_approved', 'yes' );
$order->save();
benefit_assert( 'ready_to_ship', Nakama_Affiliates_Benefit_Orders::progress( Nakama_Affiliates_Repository::$requests[1] )['stage'], 'Quality approval without shipping is not sent' );
$order->update_meta_data( '_envia_tracking_code', 'GUIA-1' ); $order->update_meta_data( '_envia_carrier', 'DHL' );
$order->set_status( 'completed' ); $order->save();
benefit_assert( 'shipped', Nakama_Affiliates_Repository::$requests[1]['status'], 'Shipping unlocks monthly social evidence' );
benefit_assert( array( 'stage', 'folio', 'carrier', 'trackingCode' ), array_keys( Nakama_Affiliates_Benefit_Orders::progress( Nakama_Affiliates_Repository::$requests[1] ) ), 'The owner summary exposes no operators or internal notes' );

Nakama_Affiliates_Repository::$requests[2] = array_merge( $fixture, array( 'id' => 2 ) );
Nakama_Affiliates_Repository::$fail_link = true;
benefit_assert( false, Nakama_Affiliates_Benefit_Orders::ensure( 2 ), 'A failed request link does not activate the draft' );
Nakama_Affiliates_Repository::$fail_link = false;
$recovered = Nakama_Affiliates_Benefit_Orders::ensure( 2 );
benefit_assert( 2, count( $GLOBALS['orders'] ), 'An orphan draft is found by request metadata and reused' );
benefit_assert( 'processing', $recovered->get_status(), 'Recovery activates the existing draft' );

Nakama_Affiliates_Repository::$requests[3] = array_merge( $fixture, array( 'id' => 3 ) );
BenefitTestOrderUtil::$hpos = false;
$GLOBALS['fail_reservation'] = true;
benefit_assert( false, Nakama_Affiliates_Benefit_Orders::ensure( 3 ), 'Stock reservation errors are recoverable' );
$pending_id = Nakama_Affiliates_Repository::$requests[3]['order_id'];
benefit_assert( 'pending', wc_get_order( $pending_id )->get_status(), 'A failed stock reservation never enters the workshop' );
benefit_assert( true, in_array( Nakama_Affiliates_Benefit_Orders::CRON, $GLOBALS['scheduled'], true ), 'An interrupted order schedules its own automatic recovery' );
$GLOBALS['fail_reservation'] = false;
benefit_assert( $pending_id, Nakama_Affiliates_Benefit_Orders::ensure( 3 )->get_id(), 'Retry reuses the incomplete order' );
benefit_assert( 3, count( wc_get_order( $pending_id )->items ), 'Recovery does not duplicate garment lines' );

$reservations = $GLOBALS['reservations'];
foreach ( array( 4 => 'shipped', 5 => 'completed', 6 => 'preparing' ) as $id => $status ) {
	Nakama_Affiliates_Repository::$requests[$id] = array_merge( $fixture, array( 'id' => $id, 'status' => $status, 'tracking_code' => 'OLD-1', 'carrier' => 'DHL' ) );
	$legacy = Nakama_Affiliates_Benefit_Orders::ensure( $id );
	benefit_assert( 'preparing' === $status ? 'pendiente-guia' : 'completed', $legacy->get_status(), 'Existing progress never returns to fabrication' );
	benefit_assert( true, $GLOBALS['legacy_stock'][$legacy->get_id()], 'Historical garments do not deduct physical stock twice' );
	benefit_assert( 'OLD-1', $legacy->get_meta( '_envia_tracking_code' ), 'Migration preserves existing tracking' );
}
benefit_assert( $reservations, $GLOBALS['reservations'], 'Migration never reserves shipped or prepared stock again' );
benefit_assert( 6, count( $GLOBALS['orders'] ), 'Each existing request has exactly one order' );
Nakama_Affiliates_Benefit_Orders::recover();
benefit_assert( 6, count( $GLOBALS['orders'] ), 'A repeated migration creates no additional orders' );
echo "PHP affiliate automatic benefit order tests passed.\n";
