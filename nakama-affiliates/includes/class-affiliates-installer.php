<?php
/**
 * Database installation and upgrades for Nakama Affiliates.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Installer {
	const OPTION = 'nakama_affiliates_db_version';

	public static function activate() {
		self::install_schema();
	}

	/** Install every approved table in one idempotent migration. */
	public static function install_schema() {
		global $wpdb;

		if ( ! isset( $wpdb ) || ! method_exists( $wpdb, 'get_charset_collate' ) ) {
			return false;
		}

		if ( ! function_exists( 'dbDelta' ) ) {
			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		}

		$charset = $wpdb->get_charset_collate();
		foreach ( self::schema_statements( $wpdb->prefix, $charset ) as $statement ) {
			dbDelta( $statement );
		}

		update_option( self::OPTION, NAKAMA_AFFILIATES_DB_VERSION, false );
		return true;
	}

	/** Upgrade ZIP replacements that do not execute activation hooks. */
	public static function maybe_upgrade() {
		if ( ! function_exists( 'get_option' ) || NAKAMA_AFFILIATES_DB_VERSION === get_option( self::OPTION ) ) {
			return;
		}

		self::install_schema();
	}

	/**
	 * Return SQL separately so the schema contract can be tested without WordPress.
	 *
	 * @return string[]
	 */
	public static function schema_statements( $prefix, $charset ) {
		$profiles  = $prefix . 'nakama_affiliates';
		$ledger    = $prefix . 'nakama_affiliate_ledger';
		$closures  = $prefix . 'nakama_affiliate_closures';
		$documents = $prefix . 'nakama_affiliate_documents';
		$benefits  = $prefix . 'nakama_affiliate_benefit_periods';
		$requests  = $prefix . 'nakama_affiliate_requests';
		$items     = $prefix . 'nakama_affiliate_request_items';
		$evidence  = $prefix . 'nakama_affiliate_evidence';
		$audit     = $prefix . 'nakama_affiliate_audit';

		return array(
			"CREATE TABLE {$profiles} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				code varchar(24) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				discount_rate decimal(7,6) NOT NULL DEFAULT 0.100000,
				commission_rate decimal(7,6) NOT NULL DEFAULT 0.100000,
				attribution_days smallint(5) unsigned NOT NULL DEFAULT 30,
				approved_at_gmt datetime NULL,
				suspended_at_gmt datetime NULL,
				created_at_gmt datetime NOT NULL,
				updated_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY user_id (user_id),
				UNIQUE KEY affiliate_code (code),
				KEY profile_status (status)
			) {$charset};",
			"CREATE TABLE {$ledger} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				affiliate_id bigint(20) unsigned NOT NULL,
				event_key varchar(191) NOT NULL,
				event_type varchar(24) NOT NULL,
				order_id bigint(20) unsigned NOT NULL DEFAULT 0,
				refund_id bigint(20) unsigned NOT NULL DEFAULT 0,
				original_event_id bigint(20) unsigned NOT NULL DEFAULT 0,
				closure_id bigint(20) unsigned NOT NULL DEFAULT 0,
				period_key char(7) NOT NULL,
				source_currency char(3) NOT NULL DEFAULT 'MXN',
				source_base decimal(26,8) NOT NULL DEFAULT 0,
				rate_to_mxn decimal(26,8) NOT NULL DEFAULT 1,
				base_mxn decimal(26,8) NOT NULL DEFAULT 0,
				commission_mxn decimal(26,8) NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'posted',
				review_reason text NULL,
				occurred_at_gmt datetime NOT NULL,
				created_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY event_key (event_key),
				KEY affiliate_period (affiliate_id,period_key),
				KEY order_lookup (order_id),
				KEY closure_lookup (closure_id)
			) {$charset};",
			"CREATE TABLE {$closures} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				affiliate_id bigint(20) unsigned NOT NULL,
				period_key char(7) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'draft',
				sales_mxn decimal(26,8) NOT NULL DEFAULT 0,
				refunds_mxn decimal(26,8) NOT NULL DEFAULT 0,
				adjustments_mxn decimal(26,8) NOT NULL DEFAULT 0,
				commission_gross_mxn decimal(26,8) NOT NULL DEFAULT 0,
				isr_withheld_mxn decimal(26,8) NOT NULL DEFAULT 0,
				iva_withheld_mxn decimal(26,8) NOT NULL DEFAULT 0,
				other_adjustments_mxn decimal(26,8) NOT NULL DEFAULT 0,
				net_mxn decimal(26,8) NOT NULL DEFAULT 0,
				paid_net_mxn decimal(26,8) NOT NULL DEFAULT 0,
				adjustment_reason text NULL,
				approved_by bigint(20) unsigned NOT NULL DEFAULT 0,
				closed_at_gmt datetime NULL,
				approved_at_gmt datetime NULL,
				paid_at_gmt datetime NULL,
				payment_reference varchar(191) NOT NULL DEFAULT '',
				payment_document_id bigint(20) unsigned NOT NULL DEFAULT 0,
				payment_reversed_at_gmt datetime NULL,
				payment_reversed_by bigint(20) unsigned NOT NULL DEFAULT 0,
				payment_reversal_reason text NULL,
				created_at_gmt datetime NOT NULL,
				updated_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY affiliate_period (affiliate_id,period_key),
				KEY closure_status (status)
			) {$charset};",
			"CREATE TABLE {$documents} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				affiliate_id bigint(20) unsigned NOT NULL,
				document_type varchar(24) NOT NULL DEFAULT 'fiscal',
				related_entity_type varchar(40) NOT NULL DEFAULT '',
				related_entity_id bigint(20) unsigned NOT NULL DEFAULT 0,
				storage_key varchar(191) NOT NULL,
				original_name varchar(255) NOT NULL DEFAULT '',
				mime_type varchar(100) NOT NULL DEFAULT 'application/pdf',
				file_size bigint(20) unsigned NOT NULL DEFAULT 0,
				sha256 char(64) NOT NULL DEFAULT '',
				status varchar(20) NOT NULL DEFAULT 'pending',
				is_current tinyint(1) NOT NULL DEFAULT 1,
				review_reason text NULL,
				uploaded_at_gmt datetime NOT NULL,
				reviewed_at_gmt datetime NULL,
				reviewed_by bigint(20) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				UNIQUE KEY storage_key (storage_key),
				KEY affiliate_current (affiliate_id,document_type,is_current),
				KEY document_status (status),
				KEY related_document (document_type,related_entity_type,related_entity_id)
			) {$charset};",
			"CREATE TABLE {$benefits} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				affiliate_id bigint(20) unsigned NOT NULL,
				period_key char(7) NOT NULL,
				source_period_key char(7) NOT NULL,
				source_closure_id bigint(20) unsigned NOT NULL DEFAULT 0,
				valid_sales_mxn decimal(26,8) NOT NULL DEFAULT 0,
				tier tinyint(3) unsigned NOT NULL DEFAULT 1,
				quota tinyint(3) unsigned NOT NULL DEFAULT 1,
				manual_reason text NULL,
				created_at_gmt datetime NOT NULL,
				updated_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY affiliate_period (affiliate_id,period_key),
				KEY source_closure (source_closure_id)
			) {$charset};",
			"CREATE TABLE {$requests} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				affiliate_id bigint(20) unsigned NOT NULL,
				benefit_period_id bigint(20) unsigned NOT NULL,
				period_key char(7) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'draft',
				address_json longtext NULL,
				shipping_covered tinyint(1) NOT NULL DEFAULT 1,
				carrier varchar(100) NOT NULL DEFAULT '',
				tracking_code varchar(191) NOT NULL DEFAULT '',
				rejection_reason text NULL,
				submitted_at_gmt datetime NULL,
				completed_at_gmt datetime NULL,
				created_at_gmt datetime NOT NULL,
				updated_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY affiliate_period (affiliate_id,period_key),
				KEY request_status (status)
			) {$charset};",
			"CREATE TABLE {$items} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				request_id bigint(20) unsigned NOT NULL,
				position tinyint(3) unsigned NOT NULL,
				product_id bigint(20) unsigned NOT NULL,
				variation_id bigint(20) unsigned NOT NULL DEFAULT 0,
				product_name varchar(255) NOT NULL DEFAULT '',
				variation_label varchar(255) NOT NULL DEFAULT '',
				quantity smallint(5) unsigned NOT NULL DEFAULT 1,
				created_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY request_position (request_id,position),
				KEY product_lookup (product_id,variation_id)
			) {$charset};",
			"CREATE TABLE {$evidence} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				request_id bigint(20) unsigned NOT NULL,
				affiliate_id bigint(20) unsigned NOT NULL,
				slot_key varchar(20) NOT NULL,
				content_type varchar(20) NOT NULL,
				position tinyint(3) unsigned NOT NULL DEFAULT 1,
				url text NOT NULL,
				url_hash char(64) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'pending',
				review_reason text NULL,
				submitted_at_gmt datetime NOT NULL,
				reviewed_at_gmt datetime NULL,
				reviewed_by bigint(20) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				UNIQUE KEY request_slot (request_id,slot_key),
				KEY affiliate_status (affiliate_id,status),
				KEY evidence_url (url_hash)
			) {$charset};",
			"CREATE TABLE {$audit} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				actor_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				action varchar(80) NOT NULL,
				entity_type varchar(40) NOT NULL,
				entity_id bigint(20) unsigned NOT NULL DEFAULT 0,
				description text NULL,
				created_at_gmt datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY entity_lookup (entity_type,entity_id),
				KEY actor_created (actor_user_id,created_at_gmt)
			) {$charset};",
		);
	}
}
