<?php
/**
 * Installation and schema management.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Installer {
	public static function activate() {
		self::install_schema();
		self::ensure_categories();
		update_option( 'nakama_drops_db_version', NAKAMA_DROPS_DB_VERSION, false );
	}

	public static function install_schema() {
		global $wpdb;
		if ( ! isset( $wpdb ) ) {
			return;
		}

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$campaigns = $wpdb->prefix . 'nakama_drops';
		$prices = $wpdb->prefix . 'nakama_drop_prices';
		$reservations = $wpdb->prefix . 'nakama_drop_reservations';

		dbDelta( "CREATE TABLE {$campaigns} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			product_id bigint(20) unsigned NOT NULL,
			status varchar(20) NOT NULL DEFAULT 'draft',
			launch_at_gmt datetime NOT NULL,
			launch_at_local varchar(32) NOT NULL,
			timezone varchar(64) NOT NULL,
			capacity bigint(20) unsigned NULL,
			reserved bigint(20) unsigned NOT NULL DEFAULT 0,
			timer_position varchar(12) NOT NULL DEFAULT 'overlay',
			previous_categories longtext NULL,
			last_error text NULL,
			created_at_gmt datetime NOT NULL,
			updated_at_gmt datetime NOT NULL,
			launched_at_gmt datetime NULL,
			cancelled_at_gmt datetime NULL,
			PRIMARY KEY  (id),
			KEY product_status (product_id,status),
			KEY due_campaigns (status,launch_at_gmt)
		) {$charset};" );

		dbDelta( "CREATE TABLE {$prices} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			campaign_id bigint(20) unsigned NOT NULL,
			item_id bigint(20) unsigned NOT NULL,
			presale_price decimal(26,8) NOT NULL,
			launch_price decimal(26,8) NOT NULL,
			previous_price varchar(64) NULL,
			previous_regular_price varchar(64) NULL,
			previous_sale_price varchar(64) NULL,
			previous_sale_from varchar(32) NULL,
			previous_sale_to varchar(32) NULL,
			transitioned tinyint(1) NOT NULL DEFAULT 0,
			PRIMARY KEY  (id),
			UNIQUE KEY campaign_item (campaign_id,item_id)
		) {$charset};" );

		dbDelta( "CREATE TABLE {$reservations} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			campaign_id bigint(20) unsigned NOT NULL,
			order_id bigint(20) unsigned NOT NULL,
			order_item_id bigint(20) unsigned NOT NULL,
			quantity bigint(20) unsigned NOT NULL,
			released_quantity bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at_gmt datetime NOT NULL,
			updated_at_gmt datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY campaign_order_item (campaign_id,order_id,order_item_id),
			KEY order_lookup (order_id)
		) {$charset};" );
	}

	public static function ensure_categories() {
		if ( ! function_exists( 'taxonomy_exists' ) || ! taxonomy_exists( 'product_cat' ) ) {
			return;
		}
		foreach ( array( 'drops' => 'DROPS', 'ya-disponible' => 'Ya disponible' ) as $slug => $name ) {
			if ( ! term_exists( $slug, 'product_cat' ) ) {
				wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );
			}
		}
	}

	public static function woocommerce_notice() {
		echo '<div class="notice notice-error"><p>' . esc_html__( 'Nakama Drops requiere WooCommerce activo.', 'nakama-drops' ) . '</p></div>';
	}
}

