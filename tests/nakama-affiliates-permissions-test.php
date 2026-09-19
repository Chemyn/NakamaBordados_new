<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_registered_actions = array();
$affiliate_current_caps = array( 'edit_users' => true );
$affiliate_nonce_valid = true;
$affiliate_profiles = array();
$affiliate_audits = array();

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
	global $affiliate_registered_actions;
	$affiliate_registered_actions[ $hook ][] = $callback;
}

function current_user_can( $capability ) {
	global $affiliate_current_caps;
	return ! empty( $affiliate_current_caps[ $capability ] );
}

function user_can( $user, $capability ) {
	return $user->has_cap( $capability );
}

function wp_nonce_field( $action, $name ) {
	echo '<input type="hidden" name="' . $name . '" value="nonce">';
}

function wp_verify_nonce( $nonce, $action ) {
	global $affiliate_nonce_valid;
	return $affiliate_nonce_valid;
}

function sanitize_text_field( $value ) {
	return trim( strip_tags( (string) $value ) );
}

function wp_unslash( $value ) {
	return $value;
}

function checked( $checked, $current = true, $echo = true ) {
	$result = (bool) $checked === (bool) $current ? 'checked="checked"' : '';
	if ( $echo ) {
		echo $result;
	}
	return $result;
}

function esc_html_e( $text, $domain = null ) {
	echo htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}

function get_userdata( $user_id ) {
	global $affiliate_test_user;
	return (int) $user_id === (int) $affiliate_test_user->ID ? $affiliate_test_user : false;
}

function get_current_user_id() {
	return 99;
}

final class AffiliatePermissionUser {
	public $ID;
	public $user_login;
	public $display_name;
	public $caps = array();

	public function __construct( $id, $login, $display_name ) {
		$this->ID = $id;
		$this->user_login = $login;
		$this->display_name = $display_name;
	}

	public function add_cap( $capability ) {
		$this->caps[ $capability ] = true;
	}

	public function remove_cap( $capability ) {
		unset( $this->caps[ $capability ] );
	}

	public function has_cap( $capability ) {
		return ! empty( $this->caps[ $capability ] );
	}
}

final class Nakama_Affiliates_Repository {
	public static function profile_by_user( $user_id ) {
		global $affiliate_profiles;
		return $affiliate_profiles[ $user_id ] ?? null;
	}

	public static function insert_profile( array $data ) {
		global $affiliate_profiles;
		$id = count( $affiliate_profiles ) + 1;
		$data['id'] = $id;
		$affiliate_profiles[ $data['user_id'] ] = $data;
		return $id;
	}

	public static function update_profile( $affiliate_id, array $data ) {
		global $affiliate_profiles;
		foreach ( $affiliate_profiles as $user_id => $profile ) {
			if ( (int) $profile['id'] === (int) $affiliate_id ) {
				$affiliate_profiles[ $user_id ] = array_merge( $profile, $data );
				return true;
			}
		}
		return false;
	}

	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ) {
		global $affiliate_audits;
		$affiliate_audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}

	public static function now_gmt() {
		return '2026-09-19 20:00:00';
	}
}

function affiliates_permissions_assert( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$profiles_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-profiles.php';
$permissions_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-permissions.php';
affiliates_permissions_assert( file_exists( $profiles_file ), 'The affiliate profiles service exists.' );
affiliates_permissions_assert( file_exists( $permissions_file ), 'The affiliate permissions service exists.' );
require $profiles_file;
require $permissions_file;

$affiliate_test_user = new AffiliatePermissionUser( 7, 'nico-robin', 'Nico Robin' );

Nakama_Affiliates_Permissions::init();
foreach ( array( 'show_user_profile', 'edit_user_profile', 'personal_options_update', 'edit_user_profile_update' ) as $hook ) {
	affiliates_permissions_assert( ! empty( $affiliate_registered_actions[ $hook ] ), "The {$hook} integration is registered." );
}

ob_start();
Nakama_Affiliates_Permissions::render_user_fields( $affiliate_test_user );
$profile_html = ob_get_clean();
affiliates_permissions_assert( false !== strpos( $profile_html, 'Acceso al Panel de Afiliados' ), 'The user profile exposes the affiliate access checkbox.' );
affiliates_permissions_assert( false !== strpos( $profile_html, 'Afiliado VIP' ), 'The user profile exposes a separate VIP checkbox.' );
affiliates_permissions_assert( false !== strpos( $profile_html, 'Suspender temporalmente' ), 'Operational suspension is separate from access.' );

$_POST = array(
	'nakama_affiliate_user_cap_nonce' => 'nonce',
	'nakama_affiliate_vip'            => '1',
);
Nakama_Affiliates_Permissions::save_user_fields( 7 );
affiliates_permissions_assert( $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::ACCESS_CAP ), 'Granting VIP also grants dashboard access.' );
affiliates_permissions_assert( $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::VIP_CAP ), 'The VIP capability is granted individually.' );
affiliates_permissions_assert( 'active' === $affiliate_profiles[7]['status'], 'Granting access activates the persisted profile.' );
affiliates_permissions_assert( '' !== $affiliate_profiles[7]['code'], 'An activated profile receives a unique provisional code.' );

$_POST = array(
	'nakama_affiliate_user_cap_nonce' => 'nonce',
	'nakama_affiliate_access'         => '1',
	'nakama_affiliate_suspended'      => '1',
);
Nakama_Affiliates_Permissions::save_user_fields( 7 );
affiliates_permissions_assert( $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::ACCESS_CAP ), 'Suspension preserves the dashboard capability.' );
affiliates_permissions_assert( ! $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::VIP_CAP ), 'VIP can be removed without removing ordinary access.' );
affiliates_permissions_assert( 'suspended' === $affiliate_profiles[7]['status'], 'Suspension changes only the operational profile state.' );

$_POST = array( 'nakama_affiliate_user_cap_nonce' => 'nonce' );
Nakama_Affiliates_Permissions::save_user_fields( 7 );
affiliates_permissions_assert( ! $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::ACCESS_CAP ), 'Clearing access removes the dashboard capability.' );
affiliates_permissions_assert( ! $affiliate_test_user->has_cap( Nakama_Affiliates_Permissions::VIP_CAP ), 'Clearing access also removes VIP.' );
affiliates_permissions_assert( 'inactive' === $affiliate_profiles[7]['status'], 'Removing access preserves the profile as inactive.' );
affiliates_permissions_assert( ! empty( $affiliate_audits ), 'Permission and status changes are audited.' );

$affiliate_current_caps = array( 'manage_woocommerce' => true );
affiliates_permissions_assert( Nakama_Affiliates_Permissions::current_user_can_access(), 'WooCommerce administrators can provide support without an affiliate grant.' );

echo "PHP Nakama Affiliates permission tests passed.\n";

