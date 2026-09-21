<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_product_options = array(
	'nakama_affiliates_restricted_category_ids' => array( 9, 10 ),
	'nakama_affiliates_official_accounts' => array( '@nakamabordados' ),
);
$affiliate_product_audits = array();

function get_option( $key, $default = false ) {
	global $affiliate_product_options;
	return $affiliate_product_options[ $key ] ?? $default;
}
function update_option( $key, $value ) {
	global $affiliate_product_options;
	$affiliate_product_options[ $key ] = $value;
	return true;
}

final class Nakama_Affiliates_Repository {
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ): bool {
		global $affiliate_product_audits;
		$affiliate_product_audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}
}

final class Affiliate_Fake_Product {
	private int $id;
	private string $name;
	private array $categories;
	private bool $stock;
	private string $status;
	private string $visibility;
	private string $type;
	private int $parent;
	private array $children;
	private string $price;
	public function __construct( int $id, string $name, array $categories = array(), bool $stock = true, string $type = 'simple', int $parent = 0, array $children = array(), string $price = '0', string $status = 'publish', string $visibility = 'visible' ) {
		$this->id = $id; $this->name = $name; $this->categories = $categories; $this->stock = $stock; $this->type = $type; $this->parent = $parent; $this->children = $children; $this->price = $price; $this->status = $status; $this->visibility = $visibility;
	}
	public function get_id(): int { return $this->id; }
	public function get_name(): string { return $this->name; }
	public function get_category_ids(): array { return $this->categories; }
	public function is_in_stock(): bool { return $this->stock; }
	public function get_status(): string { return $this->status; }
	public function get_catalog_visibility(): string { return $this->visibility; }
	public function is_type( $type ): bool { return $this->type === $type; }
	public function get_parent_id(): int { return $this->parent; }
	public function get_children(): array { return $this->children; }
	public function get_price(): string { return $this->price; }
	public function get_image_id(): int { return $this->id * 10; }
	public function get_attributes(): array { return $this->type === 'variation' ? array( 'pa_talla' => 'mediana' ) : array(); }
}

$affiliate_fake_products = array(
	1 => new Affiliate_Fake_Product( 1, 'Sudadera regular', array( 2 ), true, 'simple', 0, array(), '999999.00' ),
	2 => new Affiliate_Fake_Product( 2, 'Drop limitado', array( 9 ), true, 'simple', 0, array(), '1200.00' ),
	3 => new Affiliate_Fake_Product( 3, 'Edición especial', array( 10 ), true, 'simple', 0, array(), '1500.00' ),
	4 => new Affiliate_Fake_Product( 4, 'Agotada', array( 2 ), false, 'simple', 0, array(), '500.00' ),
	5 => new Affiliate_Fake_Product( 5, 'Oculta', array( 2 ), true, 'simple', 0, array(), '500.00', 'publish', 'hidden' ),
	6 => new Affiliate_Fake_Product( 6, 'Playera variable', array( 2 ), true, 'variable', 0, array( 61, 62 ), '700.00' ),
	61 => new Affiliate_Fake_Product( 61, 'Playera variable - Mediana', array(), true, 'variation', 6, array(), '700.00' ),
	62 => new Affiliate_Fake_Product( 62, 'Playera variable - Grande', array(), false, 'variation', 6, array(), '700.00' ),
	71 => new Affiliate_Fake_Product( 71, 'Variación ajena', array(), true, 'variation', 99, array(), '800.00' ),
);

function wc_get_product( $product_id ) {
	global $affiliate_fake_products;
	return $affiliate_fake_products[ (int) $product_id ] ?? false;
}
function wc_get_products( array $args ) {
	global $affiliate_fake_products;
	$products = array_values( array_filter( $affiliate_fake_products, static function ( $product ) {
		return ! $product->is_type( 'variation' );
	} ) );
	return (object) array( 'products' => $products, 'total' => count( $products ), 'max_num_pages' => 1 );
}
function wp_get_attachment_image_url( $image_id, $size ) { return 'https://example.test/image-' . (int) $image_id . '.jpg'; }

function affiliate_products_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf( "%s\nExpected: %s\nActual: %s", $message, var_export( $expected, true ), var_export( $actual, true ) ) );
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-products.php';

$regular = Nakama_Affiliates_Products::catalog( false, 1, 20 );
$regular_ids = array_column( $regular['items'], 'id' );
affiliate_products_assert_same( array( 1, 6 ), $regular_ids, 'Regular affiliates only see published, visible, stocked and unrestricted products.' );
affiliate_products_assert_same( array( 61 ), array_column( $regular['items'][1]['variations'], 'id' ), 'Only available variations are exposed.' );
affiliate_products_assert_same( 999999.0, $regular['items'][0]['price'], 'The monthly product has no price ceiling.' );

$vip = Nakama_Affiliates_Products::catalog( true, 1, 20 );
affiliate_products_assert_same( array( 1, 2, 3, 6 ), array_column( $vip['items'], 'id' ), 'VIP affiliates can see restricted categories when products are available.' );

$restricted = Nakama_Affiliates_Products::validate_selection( 2, 0, false );
affiliate_products_assert_same( 'restricted_category', $restricted['reason'], 'A manipulated regular request cannot submit a Drop product ID.' );
$vip_allowed = Nakama_Affiliates_Products::validate_selection( 2, 0, true );
affiliate_products_assert_same( true, $vip_allowed['success'], 'VIP permits restricted selection but does not approve the operational request.' );
$out = Nakama_Affiliates_Products::validate_selection( 4, 0, true );
affiliate_products_assert_same( 'out_of_stock', $out['reason'], 'Out-of-stock products fail server validation.' );
$hidden = Nakama_Affiliates_Products::validate_selection( 5, 0, true );
affiliate_products_assert_same( 'outside_catalog', $hidden['reason'], 'Products outside the catalog fail server validation.' );
$missing_variation = Nakama_Affiliates_Products::validate_selection( 6, 0, false );
affiliate_products_assert_same( 'variation_required', $missing_variation['reason'], 'Variable products require a concrete variation.' );
$wrong_parent = Nakama_Affiliates_Products::validate_selection( 6, 71, true );
affiliate_products_assert_same( 'invalid_variation', $wrong_parent['reason'], 'A variation from another product is rejected.' );

$saved = Nakama_Affiliates_Products::save_settings( array( '10', 9, 0, 10 ), array( ' @nakamabordados ', '', '@nakama.oficial' ), 42 );
affiliate_products_assert_same( true, $saved['success'], 'Program catalog settings can be saved by administration.' );
affiliate_products_assert_same( array( 9, 10 ), Nakama_Affiliates_Products::restricted_category_ids(), 'Restricted category IDs are normalized and deduplicated.' );
affiliate_products_assert_same( array( '@nakamabordados', '@nakama.oficial' ), Nakama_Affiliates_Products::official_accounts(), 'Official account references are normalized.' );
affiliate_products_assert_same( 'affiliate_program_settings_updated', $affiliate_product_audits[0]['action'], 'Configuration changes are audited.' );

echo "PHP Nakama Affiliates product catalog tests passed.\n";
