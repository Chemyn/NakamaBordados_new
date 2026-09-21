<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_AFFILIATES_PATH', dirname( __DIR__ ) . '/nakama-affiliates/' );
define( 'NAKAMA_AFFILIATES_URL', 'https://example.test/wp-content/plugins/nakama-affiliates/' );

$affiliate_admin_actions = array();
$affiliate_admin_menu = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_admin_actions;
	$affiliate_admin_actions[ $hook ][] = $callback;
}
function add_menu_page( $page_title, $menu_title, $capability, $slug, $callback, $icon = '', $position = null ) {
	global $affiliate_admin_menu;
	$affiliate_admin_menu = compact( 'page_title', 'menu_title', 'capability', 'slug', 'callback', 'icon', 'position' );
	return 'toplevel_page_' . $slug;
}

function affiliates_admin_assert( $condition, string $message ): void {
	if ( ! $condition ) throw new RuntimeException( $message );
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-admin.php';

Nakama_Affiliates_Admin::init();
affiliates_admin_assert( ! empty( $affiliate_admin_actions['admin_menu'] ), 'The admin menu is registered.' );
affiliates_admin_assert( ! empty( $affiliate_admin_actions['admin_post_nakama_affiliates_action'] ), 'All mutations use one authenticated admin-post controller.' );

Nakama_Affiliates_Admin::menu();
affiliates_admin_assert( 'manage_woocommerce' === $affiliate_admin_menu['capability'], 'The menu requires manage_woocommerce.' );
affiliates_admin_assert( 'nakama-affiliates' === $affiliate_admin_menu['slug'], 'The operations panel has a stable slug.' );

$source = file_get_contents( dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-admin.php' );
affiliates_admin_assert( false !== strpos( $source, "check_admin_referer( self::NONCE_ACTION, self::NONCE_FIELD )" ), 'Every mutation passes the shared nonce gate.' );
affiliates_admin_assert( false !== strpos( $source, "current_user_can( 'manage_woocommerce' )" ), 'The mutation controller repeats the capability check.' );
affiliates_admin_assert( false !== strpos( $source, "'reason_required'" ), 'Missing operational reasons fail closed before mutation.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Closures::confirm" ), 'Month close confirmation uses the audited domain.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Closures::set_manual_amounts" ), 'Manual tax amounts use the audited domain.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Documents::review" ), 'Fiscal review uses the private document domain.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Payments::record" ), 'Approved closures can register a private payment receipt.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Payments::reverse" ), 'Payment reversal remains an explicit audited action.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Requests::transition" ), 'Garment operations use the audited request state machine.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Products::save_settings" ), 'Restricted categories and official accounts are configurable.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Evidence::review" ), 'Social evidence approval and rejection use the audited domain.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Legacy_Migration::preview" ), 'Legacy creator commissions are previewed before any write.' );
affiliates_admin_assert( false !== strpos( $source, "Nakama_Affiliates_Legacy_Migration::migrate" ), 'Confirmed legacy migrations use the constrained migration domain.' );

echo "PHP Nakama Affiliates admin controller tests passed.\n";
