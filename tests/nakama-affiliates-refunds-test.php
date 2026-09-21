<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_refund_actions = array();
$affiliate_refund_orders = array();
$affiliate_refunds = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_refund_actions;
	$affiliate_refund_actions[ $hook ][] = $callback;
}
function wc_get_order( $id ) {
	global $affiliate_refund_orders, $affiliate_refunds;
	return $affiliate_refunds[ $id ] ?? $affiliate_refund_orders[ $id ] ?? false;
}
function wp_timezone() { return new DateTimeZone( 'America/Hermosillo' ); }

function affiliates_refunds_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

final class Nakama_Affiliates_Repository {
	public static $events = array();
	public static $closures = array();
	public static function ledger_by_event_key( $key ) { return self::$events[ $key ] ?? null; }
	public static function insert_ledger_event( array $event ) {
		if ( isset( self::$events[ $event['event_key'] ] ) ) {
			return array( 'created' => false, 'id' => self::$events[ $event['event_key'] ]['id'], 'event' => self::$events[ $event['event_key'] ] );
		}
		$event['id'] = count( self::$events ) + 1;
		self::$events[ $event['event_key'] ] = $event;
		return array( 'created' => true, 'id' => $event['id'], 'event' => $event );
	}
	public static function ledger_events_for_order( $order_id ) {
		return array_values( array_filter( self::$events, static fn( $event ) => (int) $event['order_id'] === (int) $order_id ) );
	}
	public static function closure_by_affiliate_period( $affiliate_id, $period ) {
		return self::$closures[ $affiliate_id . ':' . $period ] ?? null;
	}
}

final class Nakama_Affiliates_Commissions {
	public static function sale_event_key( $order_id ) { return 'sale:' . (int) $order_id; }
}

final class AffiliateOriginalLine {
	public function __construct( private int $quantity, private float $subtotal ) {}
	public function get_quantity() { return $this->quantity; }
	public function get_subtotal() { return $this->subtotal; }
}

final class AffiliateRefundLine {
	public function __construct( private int $originalId, private int $quantity, private float $subtotal = 0.0 ) {}
	public function get_meta( $key ) { return '_refunded_item_id' === $key ? $this->originalId : ''; }
	public function get_quantity() { return $this->quantity; }
	public function get_subtotal() { return $this->subtotal; }
}

final class AffiliateRefundOrder {
	public function __construct(
		private int $id,
		private int $parentId,
		private array $lines,
		private array $shipping,
		private float $amount,
		private string $created = '2026-09-15T12:00:00+00:00'
	) {}
	public function get_id() { return $this->id; }
	public function get_parent_id() { return $this->parentId; }
	public function get_items( $type = 'line_item' ) { return 'shipping' === $type ? $this->shipping : $this->lines; }
	public function get_amount() { return $this->amount; }
	public function get_date_created() { return new DateTimeImmutable( $this->created ); }
}

final class AffiliateRefundParentOrder {
	public function __construct( private int $id, private array $lines, private string $status = 'processing' ) {}
	public function get_id() { return $this->id; }
	public function get_item( $id ) { return $this->lines[ $id ] ?? false; }
	public function get_status() { return $this->status; }
	public function get_refunds() {
		global $affiliate_refunds;
		return array_values( array_filter( $affiliate_refunds, fn( $refund ) => $refund->get_parent_id() === $this->id ) );
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-refunds.php';

Nakama_Affiliates_Refunds::init();
affiliates_refunds_assert_same( true, ! empty( $affiliate_refund_actions['woocommerce_refund_created'] ), 'Refund creation is reconciled.' );
affiliates_refunds_assert_same( true, ! empty( $affiliate_refund_actions['woocommerce_order_status_cancelled'] ), 'A paid cancellation uses the reversal mechanism.' );

function seed_affiliate_sale( int $order_id, float $base = 1500.0, string $period = '2026-08', float $rate = 1.0 ): void {
	Nakama_Affiliates_Repository::$events['sale:' . $order_id] = array(
		'id' => count( Nakama_Affiliates_Repository::$events ) + 1,
		'affiliate_id' => 7,
		'event_key' => 'sale:' . $order_id,
		'event_type' => 'sale',
		'order_id' => $order_id,
		'period_key' => $period,
		'source_currency' => 1.0 === $rate ? 'MXN' : 'USD',
		'source_base' => $base,
		'rate_to_mxn' => $rate,
		'base_mxn' => round( $base * $rate, 2 ),
		'commission_mxn' => round( $base * $rate * 0.10, 2 ),
		'status' => 'posted',
	);
}

seed_affiliate_sale( 201 );
$affiliate_refund_orders[201] = new AffiliateRefundParentOrder( 201, array(
	11 => new AffiliateOriginalLine( 2, 1000.0 ),
	12 => new AffiliateOriginalLine( 1, 500.0 ),
) );
$affiliate_refunds[301] = new AffiliateRefundOrder( 301, 201, array(
	new AffiliateRefundLine( 11, -1 ),
), array(), 400.0 );

$partial = Nakama_Affiliates_Refunds::record_refund( 301 );
$duplicate = Nakama_Affiliates_Refunds::record_refund( 301 );
$partial_event = Nakama_Affiliates_Repository::$events['refund:301'] ?? array();
affiliates_refunds_assert_same( true, $partial['created'], 'A partial line refund creates one adjustment.' );
affiliates_refunds_assert_same( false, $duplicate['created'], 'A repeated refund notification is idempotent.' );
affiliates_refunds_assert_same( -500.0, $partial_event['source_base'], 'Partial refund reverses original units at their pre-discount subtotal.' );
affiliates_refunds_assert_same( -50.0, $partial_event['commission_mxn'], 'Partial refund reduces commission proportionally.' );
affiliates_refunds_assert_same( '2026-08', $partial_event['period_key'], 'An open original month receives the refund adjustment.' );

$affiliate_refunds[302] = new AffiliateRefundOrder( 302, 201, array(), array( (object) array() ), 150.0 );
$shipping = Nakama_Affiliates_Refunds::record_refund( 302 );
affiliates_refunds_assert_same( 'shipping_only', $shipping['reason'], 'A shipping-only refund does not change affiliate accounting.' );
affiliates_refunds_assert_same( false, isset( Nakama_Affiliates_Repository::$events['refund:302'] ), 'Shipping creates no goal or commission movement.' );

$affiliate_refunds[303] = new AffiliateRefundOrder( 303, 201, array(), array(), 100.0 );
Nakama_Affiliates_Refunds::record_refund( 303 );
$manual_review = Nakama_Affiliates_Repository::$events['refund:303'] ?? array();
affiliates_refunds_assert_same( 'review', $manual_review['status'], 'A monetary refund without line detail requires manual review.' );
affiliates_refunds_assert_same( 0.0, $manual_review['base_mxn'], 'Manual review never invents a proportional base.' );

seed_affiliate_sale( 202, 1000.0 );
$affiliate_refund_orders[202] = new AffiliateRefundParentOrder( 202, array(
	21 => new AffiliateOriginalLine( 2, 1000.0 ),
) );
$affiliate_refunds[304] = new AffiliateRefundOrder( 304, 202, array(
	new AffiliateRefundLine( 21, -2 ),
), array(), 900.0 );
Nakama_Affiliates_Refunds::record_refund( 304 );
$total = Nakama_Affiliates_Repository::$events['refund:304'] ?? array();
affiliates_refunds_assert_same( -1000.0, $total['base_mxn'], 'A total line refund reverses the complete attributable base.' );
affiliates_refunds_assert_same( -100.0, $total['commission_mxn'], 'A total refund reverses the complete commission.' );

seed_affiliate_sale( 203, 800.0 );
Nakama_Affiliates_Repository::$closures['7:2026-08'] = array( 'status' => 'paid' );
$affiliate_refund_orders[203] = new AffiliateRefundParentOrder( 203, array(
	31 => new AffiliateOriginalLine( 1, 800.0 ),
) );
$affiliate_refunds[305] = new AffiliateRefundOrder( 305, 203, array(
	new AffiliateRefundLine( 31, -1 ),
), array(), 800.0 );
Nakama_Affiliates_Refunds::record_refund( 305 );
affiliates_refunds_assert_same( '2026-09', Nakama_Affiliates_Repository::$events['refund:305']['period_key'], 'A closed historical month is never rewritten.' );

seed_affiliate_sale( 204, 600.0 );
$affiliate_refund_orders[204] = new AffiliateRefundParentOrder( 204, array(), 'cancelled' );
Nakama_Affiliates_Refunds::record_order_reversal( 204 );
$reversal = Nakama_Affiliates_Repository::$events['reversal:204:cancelled'] ?? array();
affiliates_refunds_assert_same( -600.0, $reversal['base_mxn'], 'A cancellation after commission reverses the remaining sale base.' );
affiliates_refunds_assert_same( -60.0, $reversal['commission_mxn'], 'A cancellation after commission reverses the remaining commission.' );

echo "PHP Nakama Affiliates refund tests passed.\n";
