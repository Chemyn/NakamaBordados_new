<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_discount_actions = array();
$affiliate_discount_filters = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_discount_actions;
	$affiliate_discount_actions[ $hook ][] = $callback;
}

function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_discount_filters;
	$affiliate_discount_filters[ $hook ][] = $callback;
}

final class AffiliateDiscountSession {
	public $values = array();
	public function get( $key, $fallback = '' ) { return array_key_exists( $key, $this->values ) ? $this->values[ $key ] : $fallback; }
	public function set( $key, $value ) { $this->values[ $key ] = $value; }
}

final class AffiliateDiscountCart {
	public $coupons = array( 'RECUPERA20' );
	public $remove_calls = 0;
	public $calculate_calls = 0;
	public $totals_ready = false;
	public $selected_on_last_calculation = '';
	public function remove_coupons() { $this->coupons = array(); $this->remove_calls++; }
	public function calculate_totals() {
		$this->calculate_calls++;
		$this->totals_ready = true;
		$this->selected_on_last_calculation = (string) WC()->session->get( 'nakama_selected_promo', '' );
	}
}

final class AffiliateDiscountWoo {
	public $session;
	public $cart;
	public function __construct() { $this->session = new AffiliateDiscountSession(); $this->cart = new AffiliateDiscountCart(); }
}

$affiliate_discount_wc = new AffiliateDiscountWoo();
function WC() {
	global $affiliate_discount_wc;
	return $affiliate_discount_wc;
}

final class Nakama_Affiliates_Codes {
	public static function resolve( $code ) {
		if ( 'NICO' !== strtoupper( trim( (string) $code ) ) ) {
			return array( 'valid' => false, 'message' => 'Código de afiliado no válido.' );
		}
		return array(
			'valid' => true,
			'code' => 'NICO',
			'profile' => array(
				'id' => 7,
				'user_id' => 77,
				'code' => 'NICO',
				'status' => 'active',
				'discount_rate' => 0.15,
				'commission_rate' => 0.10,
			),
		);
	}
}

final class Nakama_Cart {
	public static $flushed = 0;
	public static $last_promo = '';
	public static function flush_plan() { self::$flushed++; }
	public static function get_plan() {
		$context = (object) array(
			'eligible_subtotal' => WC()->cart->totals_ready ? 1000.0 : 0.0,
		);
		return array( 'options' => Nakama_Affiliates_Discounts::add_candidate( array(), $context ) );
	}
	public static function apply_selection( $promo, array $options ) {
		if ( ! isset( $options[ $promo ] ) ) return false;
		self::$last_promo = $promo;
		WC()->cart->remove_coupons();
		WC()->session->set( 'nakama_selected_promo', $promo );
		return true;
	}
}

function affiliates_discounts_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

$domain_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
$discounts_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-discounts.php';
affiliates_discounts_assert_same( true, file_exists( $discounts_file ), 'The affiliate discount integration exists.' );
require $domain_file;
require $discounts_file;

Nakama_Affiliates_Discounts::init();
affiliates_discounts_assert_same( true, ! empty( $affiliate_discount_filters['nakama_discount_primary_candidates'] ), 'The plugin extends primary candidates through the public engine hook.' );
affiliates_discounts_assert_same( true, ! empty( $affiliate_discount_filters['nakama_checkout_bridge_affiliate_result'] ), 'The plugin validates bridge attribution through the neutral checkout hook.' );
affiliates_discounts_assert_same( true, ! empty( $affiliate_discount_actions['woocommerce_applied_coupon'] ), 'A native coupon can replace affiliate attribution.' );
affiliates_discounts_assert_same( true, ! empty( $affiliate_discount_actions['nakama_discount_selection_applied'] ), 'Another Nakama promotion can replace affiliate attribution.' );

$selected = Nakama_Affiliates_Discounts::select_code( 'nico', 'referral' );
affiliates_discounts_assert_same( true, $selected['success'], 'A freshly rebuilt cart calculates its authoritative subtotal before selecting a valid code.' );
affiliates_discounts_assert_same( 'NICO', WC()->session->get( 'nakama_affiliate_code' ), 'Only the normalized code is stored in session.' );
affiliates_discounts_assert_same( 'referral', WC()->session->get( 'nakama_affiliate_source' ), 'The approved attribution origin is preserved.' );
affiliates_discounts_assert_same( 'affiliate_code:7', WC()->session->get( 'nakama_selected_promo' ), 'The affiliate candidate becomes the selected primary.' );
affiliates_discounts_assert_same( array(), WC()->cart->coupons, 'Selecting an affiliate code removes native coupons.' );
affiliates_discounts_assert_same( 2, WC()->cart->calculate_calls, 'The cart calculates once to expose the subtotal and again to apply the selected discount.' );
affiliates_discounts_assert_same( 'affiliate_code:7', WC()->cart->selected_on_last_calculation, 'The final totals calculation includes the affiliate selection.' );

$candidates = Nakama_Affiliates_Discounts::add_candidate( array(), (object) array( 'eligible_subtotal' => 1000.0 ) );
$candidate = $candidates['affiliate_code:7'] ?? array();
affiliates_discounts_assert_same( 'affiliate_code', $candidate['type'] ?? null, 'The injected primary has its own stable type.' );
affiliates_discounts_assert_same( 0.10, $candidate['rate'] ?? null, 'A manipulated profile value is still capped at ten percent.' );
affiliates_discounts_assert_same( 100.0, $candidate['amount'] ?? null, 'The amount is calculated from the authoritative eligible subtotal.' );
affiliates_discounts_assert_same( false, $candidate['allow_modifiers'] ?? true, 'Affiliate discounts are never combinable.' );
affiliates_discounts_assert_same( false, $candidate['visible'] ?? true, 'Affiliate codes never become public promotion buttons.' );
affiliates_discounts_assert_same( false, $candidate['auto'] ?? true, 'A stored referral still requires explicit server selection.' );

Nakama_Affiliates_Discounts::on_promotion_selected( 'public_code:summer' );
affiliates_discounts_assert_same( '', WC()->session->get( 'nakama_affiliate_code' ), 'Selecting another Nakama promotion clears affiliate attribution.' );

Nakama_Affiliates_Discounts::select_code( 'NICO', 'untrusted-source' );
affiliates_discounts_assert_same( 'manual', WC()->session->get( 'nakama_affiliate_source' ), 'An unknown source cannot forge a trusted attribution origin.' );
Nakama_Affiliates_Discounts::on_native_coupon_applied( 'RECUPERA20' );
affiliates_discounts_assert_same( '', WC()->session->get( 'nakama_affiliate_code' ), 'Applying a native coupon clears affiliate attribution.' );

WC()->session->set( 'nakama_affiliate_code', 'NICO' );
WC()->session->set( 'nakama_selected_promo', 'affiliate_code:7' );
$invalid = Nakama_Affiliates_Discounts::select_code( 'missing', 'manual' );
affiliates_discounts_assert_same( false, $invalid['success'], 'A forged or unavailable code fails closed.' );
affiliates_discounts_assert_same( '', WC()->session->get( 'nakama_affiliate_code' ), 'A failed selection removes stale affiliate attribution.' );
affiliates_discounts_assert_same( '', WC()->session->get( 'nakama_selected_promo' ), 'A failed selection removes the stale primary selection.' );

$bridge_valid = Nakama_Affiliates_Discounts::apply_checkout_bridge(
	array( 'handled' => false, 'success' => false ),
	'NICO',
	'referral'
);
affiliates_discounts_assert_same( true, $bridge_valid['handled'], 'The affiliates plugin owns affiliate bridge validation when active.' );
affiliates_discounts_assert_same( true, $bridge_valid['success'], 'A valid bridge code is selected after the cart exists.' );
affiliates_discounts_assert_same( 'referral', WC()->session->get( 'nakama_affiliate_source' ), 'The bridge keeps only an allowed attribution source.' );

$bridge_invalid = Nakama_Affiliates_Discounts::apply_checkout_bridge(
	array( 'handled' => false, 'success' => false ),
	'SUSPENDED',
	'referral'
);
affiliates_discounts_assert_same( false, $bridge_invalid['success'], 'Unavailable bridge attribution fails closed.' );
affiliates_discounts_assert_same( '', WC()->session->get( 'nakama_affiliate_code' ), 'Rejected bridge attribution clears stale session selection.' );

echo "PHP Nakama Affiliates discount integration tests passed.\n";
