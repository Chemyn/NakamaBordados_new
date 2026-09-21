<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_order_actions = array();
function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_order_actions;
	$affiliate_order_actions[ $hook ][] = $callback;
}

function affiliates_orders_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

final class AffiliateOrderLine {
	public function __construct( private float $subtotal ) {}
	public function get_subtotal() { return $this->subtotal; }
}

final class AffiliateSnapshotOrder {
	public $meta = array();
	public function __construct( private string $currency, private array $lines, array $meta = array() ) {
		$this->meta = $meta;
	}
	public function get_items( $type = 'line_item' ) { return 'line_item' === $type ? $this->lines : array(); }
	public function get_currency() { return $this->currency; }
	public function get_meta( $key ) { return $this->meta[ $key ] ?? ''; }
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-currency.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-orders.php';

Nakama_Affiliates_Orders::init();
affiliates_orders_assert_same(
	true,
	! empty( $affiliate_order_actions['nakama_discounts_order_plan_saved'] ),
	'Affiliate order snapshots subscribe to the final server-side discount plan.'
);

$plan = array(
	'primary' => array(
		'type'              => 'affiliate_code',
		'affiliate_id'      => 7,
		'affiliate_user_id' => 77,
		'code'              => 'NICO',
		'rate'              => 0.25,
		'commission_rate'   => 0.50,
		'source'            => 'referral',
	),
	'totals' => array( 'eligible_subtotal' => 999999 ),
);
$order = new AffiliateSnapshotOrder( 'MXN', array(
	new AffiliateOrderLine( 600.15 ),
	new AffiliateOrderLine( 399.85 ),
) );
$snapshotted = Nakama_Affiliates_Orders::snapshot_from_plan( $order, $plan, array() );

affiliates_orders_assert_same( true, $snapshotted, 'An affiliate primary creates an immutable order snapshot.' );
affiliates_orders_assert_same( 1000.0, $order->meta['_nakama_affiliate_eligible_subtotal'], 'The base is the line subtotal before discounts and taxes.' );
affiliates_orders_assert_same( 0.10, $order->meta['_nakama_affiliate_discount_rate'], 'A manipulated discount is capped in the snapshot.' );
affiliates_orders_assert_same( 0.10, $order->meta['_nakama_affiliate_commission_rate'], 'Commission is frozen at the approved ten percent.' );
affiliates_orders_assert_same( 1.0, $order->meta['_nakama_affiliate_rate_to_mxn'], 'MXN snapshots use the identity conversion.' );
affiliates_orders_assert_same( 1000.0, $order->meta['_nakama_affiliate_base_mxn'], 'MXN base is frozen immediately.' );
affiliates_orders_assert_same( 'referral', $order->meta['_nakama_affiliate_source'], 'The approved attribution source is preserved.' );

$usd_order = new AffiliateSnapshotOrder( 'USD', array( new AffiliateOrderLine( 100.0 ) ) );
Nakama_Affiliates_Orders::snapshot_from_plan( $usd_order, $plan, array() );
affiliates_orders_assert_same( 0.0, $usd_order->meta['_nakama_affiliate_rate_to_mxn'], 'USD waits until payment to freeze the exchange rate.' );
affiliates_orders_assert_same( 0.0, $usd_order->meta['_nakama_affiliate_base_mxn'], 'USD never invents an MXN base at checkout time.' );

$benefit = new AffiliateSnapshotOrder( 'MXN', array( new AffiliateOrderLine( 5000.0 ) ), array(
	'_nakama_affiliate_benefit' => 'yes',
) );
affiliates_orders_assert_same( false, Nakama_Affiliates_Orders::snapshot_from_plan( $benefit, $plan, array() ), 'A monthly free benefit is never attributed as a sale.' );
affiliates_orders_assert_same( false, isset( $benefit->meta['_nakama_affiliate_id'] ), 'The benefit order receives no affiliate metadata.' );

$public_order = new AffiliateSnapshotOrder( 'MXN', array( new AffiliateOrderLine( 1000.0 ) ) );
affiliates_orders_assert_same(
	false,
	Nakama_Affiliates_Orders::snapshot_from_plan( $public_order, array( 'primary' => array( 'type' => 'public_code' ) ), array() ),
	'Non-affiliate promotions do not create affiliate attribution.'
);

echo "PHP Nakama Affiliates order snapshot tests passed.\n";
