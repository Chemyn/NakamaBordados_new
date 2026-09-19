<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_code_profiles = array();
$affiliate_code_users = array();
$affiliate_code_audits = array();

function remove_accents( $value ) {
	return strtr( (string) $value, array(
		'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n',
		'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N',
	) );
}

function get_userdata( $user_id ) {
	global $affiliate_code_users;
	return $affiliate_code_users[ $user_id ] ?? false;
}

function user_can( $user, $capability ) {
	return ! empty( $user->caps[ $capability ] );
}

final class AffiliateCodeUser {
	public $ID;
	public $display_name;
	public $user_login;
	public $caps;

	public function __construct( $id, $display_name, $login, array $caps = array() ) {
		$this->ID = $id;
		$this->display_name = $display_name;
		$this->user_login = $login;
		$this->caps = $caps;
	}
}

final class Nakama_Affiliates_Permissions {
	const ACCESS_CAP = 'access_affiliate_dashboard';
}

final class Nakama_Affiliates_Profiles {
	public static function is_operational( array $profile ) {
		return isset( $profile['status'] ) && 'active' === $profile['status'];
	}
}

final class Nakama_Affiliates_Repository {
	public static function profile_by_code( $code ) {
		global $affiliate_code_profiles;
		foreach ( $affiliate_code_profiles as $profile ) {
			if ( $profile['code'] === $code ) {
				return $profile;
			}
		}
		return null;
	}

	public static function update_profile( $affiliate_id, array $data ) {
		global $affiliate_code_profiles;
		foreach ( $affiliate_code_profiles as $key => $profile ) {
			if ( (int) $profile['id'] === (int) $affiliate_id ) {
				$affiliate_code_profiles[ $key ] = array_merge( $profile, $data );
				return true;
			}
		}
		return false;
	}

	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ) {
		global $affiliate_code_audits;
		$affiliate_code_audits[] = compact( 'action', 'entity_type', 'entity_id', 'description' );
		return true;
	}
}

function affiliates_codes_assert_same( $expected, $actual, $message ) {
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
$codes_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-codes.php';
affiliates_codes_assert_same( true, file_exists( $codes_file ), 'The affiliate code service exists.' );
require $domain_file;
require $codes_file;

affiliates_codes_assert_same( 'JOSE-LUFFY', Nakama_Affiliates_Codes::normalize( '  José   Luffy!  ' ), 'Codes are uppercase, accent-free and URL-safe.' );
affiliates_codes_assert_same( 'ABCDEFGHIJKLMNOPQRSTUVWX', Nakama_Affiliates_Codes::normalize( 'abcdefghijklmnopqrstuvwxyz' ), 'Codes are capped at 24 characters.' );
affiliates_codes_assert_same( '', Nakama_Affiliates_Codes::normalize( '...!!!' ), 'A value without allowed characters remains empty.' );

$affiliate_code_profiles = array(
	array( 'id' => 1, 'user_id' => 1, 'code' => 'NICO-ROBIN', 'status' => 'active', 'discount_rate' => 0.10, 'attribution_days' => 30 ),
);
$new_user = new AffiliateCodeUser( 2, 'Nico Robin', 'nico-robin' );
affiliates_codes_assert_same( 'NICO-ROBIN-2', Nakama_Affiliates_Codes::suggest_for_user( $new_user ), 'A short suffix resolves an existing code collision.' );

$valid_rate = Nakama_Affiliates_Codes::validate_percentage( '10' );
affiliates_codes_assert_same( true, $valid_rate['valid'], 'Ten percent is accepted.' );
affiliates_codes_assert_same( 0.10, $valid_rate['rate'], 'The admin percentage is stored as a decimal rate.' );
affiliates_codes_assert_same( false, Nakama_Affiliates_Codes::validate_percentage( '0' )['valid'], 'Zero percent is rejected.' );
affiliates_codes_assert_same( false, Nakama_Affiliates_Codes::validate_percentage( '10.01' )['valid'], 'A discount above ten percent is rejected.' );
affiliates_codes_assert_same( false, Nakama_Affiliates_Codes::validate_percentage( 'abc' )['valid'], 'A non-numeric discount is rejected.' );

$affiliate_code_users[1] = new AffiliateCodeUser( 1, 'Nico Robin', 'nico-robin', array(
	Nakama_Affiliates_Permissions::ACCESS_CAP => true,
) );
$active = Nakama_Affiliates_Codes::resolve( 'nico-robin' );
affiliates_codes_assert_same( true, $active['valid'], 'An active profile with the individual capability validates.' );
affiliates_codes_assert_same( 1, $active['profile']['id'], 'Internal validation resolves the authoritative profile.' );

$affiliate_code_profiles[0]['status'] = 'suspended';
affiliates_codes_assert_same( false, Nakama_Affiliates_Codes::resolve( 'NICO-ROBIN' )['valid'], 'A suspended profile cannot attribute new sales.' );
$affiliate_code_profiles[0]['status'] = 'active';
$affiliate_code_users[1]->caps = array();
affiliates_codes_assert_same( false, Nakama_Affiliates_Codes::resolve( 'NICO-ROBIN' )['valid'], 'Removing the capability invalidates the code without deleting its profile.' );

$affiliate_code_users[1]->caps[ Nakama_Affiliates_Permissions::ACCESS_CAP ] = true;
$duplicate_update = Nakama_Affiliates_Codes::update_profile_settings(
	array( 'id' => 5, 'user_id' => 5, 'code' => 'OTRO', 'discount_rate' => 0.05 ),
	'NICO-ROBIN',
	'8'
);
affiliates_codes_assert_same( false, $duplicate_update['success'], 'An administrator cannot save a code owned by another affiliate.' );

$updated = Nakama_Affiliates_Codes::update_profile_settings( $affiliate_code_profiles[0], 'nakama_nico', '8.5' );
affiliates_codes_assert_same( true, $updated['success'], 'A unique valid code and discount can be saved.' );
affiliates_codes_assert_same( 'NAKAMA_NICO', $affiliate_code_profiles[0]['code'], 'The stored code is normalized.' );
affiliates_codes_assert_same( 0.085, $affiliate_code_profiles[0]['discount_rate'], 'The stored discount remains below the ten-percent cap.' );
affiliates_codes_assert_same( true, ! empty( $affiliate_code_audits ), 'Code and discount changes are audited.' );

echo "PHP Nakama Affiliates code tests passed.\n";
