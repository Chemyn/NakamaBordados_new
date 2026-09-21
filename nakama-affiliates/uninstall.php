<?php
/**
 * Nakama Affiliates uninstall policy.
 *
 * Data is retained by default. A destructive purge happens only when the site
 * owner defines NAKAMA_AFFILIATES_PURGE_DATA as the boolean true before
 * uninstalling the plugin from WordPress.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

if ( ! defined( 'NAKAMA_AFFILIATES_PURGE_DATA' ) || true !== NAKAMA_AFFILIATES_PURGE_DATA ) {
	return;
}

global $wpdb;

$nakama_affiliate_tables = array(
	'nakama_affiliate_evidence',
	'nakama_affiliate_request_items',
	'nakama_affiliate_requests',
	'nakama_affiliate_benefit_periods',
	'nakama_affiliate_documents',
	'nakama_affiliate_closures',
	'nakama_affiliate_ledger',
	'nakama_affiliate_audit',
	'nakama_affiliates',
);

foreach ( $nakama_affiliate_tables as $nakama_affiliate_table ) {
	$wpdb->query( 'DROP TABLE IF EXISTS `' . $wpdb->prefix . $nakama_affiliate_table . '`' );
}

foreach ( array(
	'nakama_affiliates_db_version',
	'nakama_affiliates_restricted_category_ids',
	'nakama_affiliates_official_accounts',
) as $nakama_affiliate_option ) {
	delete_option( $nakama_affiliate_option );
}

$nakama_capabilities_key = $wpdb->prefix . 'capabilities';
$nakama_access_like = '%' . $wpdb->esc_like( 'access_affiliate_dashboard' ) . '%';
$nakama_vip_like = '%' . $wpdb->esc_like( 'nakama_affiliate_vip' ) . '%';
$nakama_affiliate_user_ids = $wpdb->get_col( $wpdb->prepare(
	"SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s AND (meta_value LIKE %s OR meta_value LIKE %s)",
	$nakama_capabilities_key,
	$nakama_access_like,
	$nakama_vip_like
) );
foreach ( array_unique( array_map( 'intval', (array) $nakama_affiliate_user_ids ) ) as $nakama_affiliate_user_id ) {
	$nakama_affiliate_user = get_userdata( $nakama_affiliate_user_id );
	if ( $nakama_affiliate_user ) {
		$nakama_affiliate_user->remove_cap( 'access_affiliate_dashboard' );
		$nakama_affiliate_user->remove_cap( 'nakama_affiliate_vip' );
	}
}

/** Delete a verified plugin-owned directory without following directory links. */
function nakama_affiliates_purge_private_directory( $directory ) {
	$real = realpath( $directory );
	if (
		false === $real ||
		'affiliates' !== basename( $real ) ||
		'nakama-private' !== basename( dirname( $real ) )
	) {
		return false;
	}

	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $real, FilesystemIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);
	foreach ( $iterator as $item ) {
		if ( $item->isLink() || $item->isFile() ) {
			unlink( $item->getPathname() );
		} elseif ( $item->isDir() ) {
			rmdir( $item->getPathname() );
		}
	}
	return rmdir( $real );
}

$nakama_private_directory = dirname( rtrim( ABSPATH, '/\\' ) ) . DIRECTORY_SEPARATOR . 'nakama-private' . DIRECTORY_SEPARATOR . 'affiliates';
if ( function_exists( 'apply_filters' ) ) {
	$nakama_private_directory = (string) apply_filters( 'nakama_affiliates_private_directory', $nakama_private_directory );
}
nakama_affiliates_purge_private_directory( $nakama_private_directory );
