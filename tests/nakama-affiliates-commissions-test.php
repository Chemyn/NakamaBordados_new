<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'ARRAY_A', 'ARRAY_A' );

$affiliate_commission_actions = array();
$affiliate_commission_orders = array();
$affiliate_usd_details = false;

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_commission_actions;
	$affiliate_commission_actions[ $hook ][] = $callback;
}
function wc_get_order( $order_id ) {
	global $affiliate_commission_orders;
	return $affiliate_commission_orders[ $order_id ] ?? false;
}
function wc_get_is_paid_statuses() { return array( 'processing', 'completed' ); }
function wp_timezone() { return new DateTimeZone( 'America/Hermosillo' ); }
function nakama_get_usd_rate_details() {
	global $affiliate_usd_details;
	return $affiliate_usd_details;
}

function affiliates_commissions_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

final class AffiliateCommissionWpdb {
	public $prefix = 'wp_';
	public $insert_id = 0;
	public $ledger = array();
	public function prepare( $query, ...$args ) { return array( 'query' => $query, 'args' => $args ); }
	public function get_row( $prepared, $format = null ) {
		if ( is_array( $prepared ) && false !== strpos( $prepared['query'], 'event_key' ) ) {
			$key = (string) ( $prepared['args'][0] ?? '' );
			return $this->ledger[ $key ] ?? null;
		}
		return null;
	}
	public function insert( $table, $record ) {
		$key = (string) ( $record['event_key'] ?? '' );
		if ( isset( $this->ledger[ $key ] ) ) return false;
		$this->insert_id++;
		$record['id'] = $this->insert_id;
		$this->ledger[ $key ] = $record;
		return true;
	}
}

final class AffiliatePaidOrder {
	public $meta;
	public $save_calls = 0;
	public function __construct( private int $id, array $meta, private string $status = 'processing' ) {
		$this->meta = $meta;
	}
	public function get_id() { return $this->id; }
	public function get_meta( $key ) { return $this->meta[ $key ] ?? ''; }
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
	public function save() { $this->save_calls++; }
	public function get_status() { return $this->status; }
	public function is_paid() { return in_array( $this->status, array( 'processing', 'completed' ), true ); }
	public function get_date_paid() { return new DateTimeImmutable( '2026-09-20T02:00:00+00:00' ); }
}

$wpdb = new AffiliateCommissionWpdb();

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-repository.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-currency.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-commissions.php';

Nakama_Affiliates_Commissions::init();
affiliates_commissions_assert_same( true, ! empty( $affiliate_commission_actions['woocommerce_payment_complete'] ), 'Payment completion records affiliate commission.' );
affiliates_commissions_assert_same( true, ! empty( $affiliate_commission_actions['woocommerce_order_status_processing'] ), 'Paid status transitions are also reconciled.' );

$base_meta = array(
	'_nakama_affiliate_id' => 7,
	'_nakama_affiliate_order_currency' => 'MXN',
	'_nakama_affiliate_eligible_subtotal' => 1234.56,
	'_nakama_affiliate_rate_to_mxn' => 1,
	'_nakama_affiliate_base_mxn' => 1234.56,
);
$affiliate_commission_orders[101] = new AffiliatePaidOrder( 101, $base_meta );
$first = Nakama_Affiliates_Commissions::record_paid_order( 101 );
$second = Nakama_Affiliates_Commissions::record_paid_order( 101 );
$sale = $wpdb->ledger['sale:101'] ?? array();

affiliates_commissions_assert_same( true, $first['created'], 'The first paid notification creates a sale movement.' );
affiliates_commissions_assert_same( false, $second['created'], 'Repeated paid notifications are idempotent.' );
affiliates_commissions_assert_same( 1234.56, $sale['base_mxn'], 'The MXN sale records the frozen eligible base.' );
affiliates_commissions_assert_same( 123.46, $sale['commission_mxn'], 'Commission is ten percent with explicit monetary rounding.' );
affiliates_commissions_assert_same( '2026-09', $sale['period_key'], 'The movement is assigned in WordPress local time.' );

$affiliate_usd_details = array( 'rate' => 0.05, 'source' => 'live', 'updated_at' => 1 );
$affiliate_commission_orders[102] = new AffiliatePaidOrder( 102, array(
	'_nakama_affiliate_id' => 7,
	'_nakama_affiliate_order_currency' => 'USD',
	'_nakama_affiliate_eligible_subtotal' => 100,
	'_nakama_affiliate_rate_to_mxn' => 0,
	'_nakama_affiliate_base_mxn' => 0,
) );
Nakama_Affiliates_Commissions::record_paid_order( 102 );
$affiliate_usd_details = array( 'rate' => 0.025, 'source' => 'changed', 'updated_at' => 2 );
Nakama_Affiliates_Commissions::record_paid_order( 102 );
$usd_sale = $wpdb->ledger['sale:102'] ?? array();

affiliates_commissions_assert_same( 20.0, $usd_sale['rate_to_mxn'], 'The checkout USD rate is converted to an MXN factor.' );
affiliates_commissions_assert_same( 2000.0, $usd_sale['base_mxn'], 'USD base is converted exactly once when paid.' );
affiliates_commissions_assert_same( 200.0, $usd_sale['commission_mxn'], 'USD commission uses the frozen MXN base.' );
affiliates_commissions_assert_same( 20.0, $affiliate_commission_orders[102]->meta['_nakama_affiliate_rate_to_mxn'], 'The payment factor remains frozen on the order.' );

$affiliate_commission_orders[103] = new AffiliatePaidOrder( 103, array(
	'_nakama_affiliate_id' => 7,
	'_nakama_affiliate_order_currency' => 'EUR',
	'_nakama_affiliate_eligible_subtotal' => 100,
) );
Nakama_Affiliates_Commissions::record_paid_order( 103 );
$review = $wpdb->ledger['sale:103'] ?? array();
affiliates_commissions_assert_same( 'review', $review['status'], 'An unsupported currency is queued for manual review.' );
affiliates_commissions_assert_same( 0.0, $review['base_mxn'], 'Review events never invent an MXN conversion.' );
affiliates_commissions_assert_same( 0.0, $review['commission_mxn'], 'Review events never invent commission.' );

$affiliate_commission_orders[104] = new AffiliatePaidOrder( 104, array_merge( $base_meta, array(
	'_nakama_affiliate_benefit' => 'yes',
) ) );
$benefit = Nakama_Affiliates_Commissions::record_paid_order( 104 );
affiliates_commissions_assert_same( 'benefit', $benefit['reason'], 'A monthly product benefit is ignored explicitly.' );
affiliates_commissions_assert_same( false, isset( $wpdb->ledger['sale:104'] ), 'A free benefit creates no sale, goal progress or commission.' );

echo "PHP Nakama Affiliates commission tests passed.\n";
