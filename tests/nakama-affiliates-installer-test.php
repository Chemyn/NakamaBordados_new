<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'NAKAMA_AFFILIATES_DB_VERSION', '1' );

$affiliate_schema_queries = array();
$affiliate_options = array();

function dbDelta( $query ) {
	global $affiliate_schema_queries;
	$affiliate_schema_queries[] = $query;
}

function update_option( $key, $value, $autoload = null ) {
	global $affiliate_options;
	$affiliate_options[ $key ] = $value;
	return true;
}

function affiliates_installer_assert( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

final class AffiliateInstallerWpdb {
	public $prefix = 'wp_';

	public function get_charset_collate() {
		return 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
	}
}

$wpdb = new AffiliateInstallerWpdb();
$installer_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-installer.php';
affiliates_installer_assert( file_exists( $installer_file ), 'The affiliate installer class exists.' );
require $installer_file;

Nakama_Affiliates_Installer::install_schema();

$expected_tables = array(
	'wp_nakama_affiliates',
	'wp_nakama_affiliate_ledger',
	'wp_nakama_affiliate_closures',
	'wp_nakama_affiliate_documents',
	'wp_nakama_affiliate_benefit_periods',
	'wp_nakama_affiliate_requests',
	'wp_nakama_affiliate_request_items',
	'wp_nakama_affiliate_evidence',
	'wp_nakama_affiliate_audit',
);

affiliates_installer_assert( 9 === count( $affiliate_schema_queries ), 'The complete approved schema is installed in one migration.' );

$schema = implode( "\n", $affiliate_schema_queries );
foreach ( $expected_tables as $table ) {
	affiliates_installer_assert( false !== strpos( $schema, "CREATE TABLE {$table}" ), "Missing schema for {$table}." );
}

foreach ( array(
	'UNIQUE KEY user_id (user_id)',
	'UNIQUE KEY affiliate_code (code)',
	'UNIQUE KEY event_key (event_key)',
	'UNIQUE KEY affiliate_period (affiliate_id,period_key)',
	'UNIQUE KEY request_slot (request_id,slot_key)',
) as $required_index ) {
	affiliates_installer_assert( false !== strpos( $schema, $required_index ), "Missing idempotency index: {$required_index}." );
}

affiliates_installer_assert(
	NAKAMA_AFFILIATES_DB_VERSION === ( $affiliate_options['nakama_affiliates_db_version'] ?? null ),
	'The installed schema version is persisted.'
);

echo "PHP Nakama Affiliates installer tests passed.\n";

