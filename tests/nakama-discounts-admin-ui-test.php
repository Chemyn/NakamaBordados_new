<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_DISC_OPTION', 'nakama_discounts_settings' );
define( 'NAKAMA_DISC_CODES_OPTION', 'nakama_discount_codes' );

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {}
function esc_attr( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ); }
function settings_errors( $setting = '' ) {}
function settings_fields( $group ) {}
function submit_button() { echo '<button type="submit">Guardar cambios</button>'; }
function checked( $checked, $current, $echo = true ) {
	$result = $checked === $current ? 'checked="checked"' : '';
	if ( $echo ) { echo $result; }
	return $result;
}

function assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

class Nakama_Settings {
	public static function all() {
		return array(
			'welcome_enabled' => 'no', 'welcome_account_only' => 'no',
			'special_10_enabled' => 'no', 'special_3x2_enabled' => 'no', 'special_auto_if_better' => 'no',
			'free_ship_enabled' => 'no', 'transfer_enabled' => 'no', 'msi_enabled' => 'no',
			'account_notice_enabled' => 'no', 'account_notice_complete' => 'no',
			'welcome_rate_1' => 0, 'welcome_rate_2' => 0, 'welcome_rate_3' => 0,
			'special_10_rate' => 0, 'transfer_rate' => 0,
			'free_ship_threshold' => 0, 'free_ship_cap' => 0,
			'msi_3_threshold' => 0, 'msi_6_threshold' => 0,
			'welcome_days_2' => 0, 'welcome_days_3' => 0,
			'transfer_gateway_id' => 'bacs',
			'special_10_start' => '', 'special_10_end' => '',
			'special_3x2_start' => '', 'special_3x2_end' => '',
			'special_3x2_categories' => array(),
			'free_ship_threshold_map' => array(), 'free_ship_cap_map' => array(),
			'msi_3_threshold_map' => array(), 'msi_6_threshold_map' => array(),
		);
	}
	public static function currency_map_to_string( $value ) { return ''; }
}

class Nakama_Discount_Codes {
	public static function all() {
		return array(
			'saved' => array(
				'id' => 'saved', 'code' => 'PUBLICO15', 'rate' => 0.15,
				'enabled' => 'yes', 'start' => '', 'end' => '', 'allow_modifiers' => 'yes',
			),
		);
	}
	public static function status( $code ) { return 'active'; }
}

class Nakama_Campaigns {
	public static function special_10_active() { return false; }
	public static function special_3x2_active() { return false; }
}

require dirname( __DIR__ ) . '/nakama-discounts/includes/class-admin.php';

ob_start();
Nakama_Admin::render();
$html = ob_get_clean();

assert_same( true, false !== strpos( $html, 'Guardar y activar código' ), 'The create panel exposes an explicit primary action.' );
assert_same( true, false !== strpos( $html, 'data-nakama-cancel-create' ), 'The create panel exposes a cancel action.' );
assert_same( true, false !== strpos( $html, 'data-nakama-delete-code' ), 'Every saved code exposes a direct delete action.' );
assert_same( true, false !== strpos( $html, 'aria-required="true"' ), 'Required creation fields are announced accessibly.' );
assert_same( true, false !== strpos( $html, 'data-nakama-field-error' ), 'Required creation fields reserve inline validation feedback.' );

echo "PHP Nakama Discounts admin UI tests passed.\n";
