<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_legacy_meta = array(
	'apoyo_creador_2026_06' => array( '300' ),
	'apoyo_creador_2026_07' => array( 'no-es-numero' ),
	'apoyo_creador_2026_08' => array( '250.50' ),
	'apoyo_creador_2026_09' => array( '100' ),
	'apoyo_creador_2026_13' => array( '999' ),
	'apoyo_creador_demo'    => array( '999' ),
	'comision_demo_fija'    => array( '500' ),
);
$affiliate_legacy_events = array();
$affiliate_legacy_audits = array();

function current_user_can( $capability ) {
	return 'manage_woocommerce' === $capability;
}

function get_user_meta( $user_id ) {
	global $affiliate_legacy_meta;
	return 42 === (int) $user_id ? $affiliate_legacy_meta : array();
}

final class Nakama_Affiliates_Repository {
	public static function profile_by_user( $user_id ) {
		return 42 === (int) $user_id ? array( 'id' => 7, 'user_id' => 42 ) : null;
	}

	public static function ledger_by_event_key( $event_key ) {
		global $affiliate_legacy_events;
		return $affiliate_legacy_events[ $event_key ] ?? null;
	}

	public static function closure_by_affiliate_period( $affiliate_id, $period ) {
		return '2026-06' === $period ? array( 'id' => 99, 'status' => 'closed' ) : null;
	}

	public static function insert_ledger_event( array $event ) {
		global $affiliate_legacy_events;
		if ( isset( $affiliate_legacy_events[ $event['event_key'] ] ) ) {
			return array( 'created' => false, 'id' => $affiliate_legacy_events[ $event['event_key'] ]['id'] );
		}
		$event['id'] = count( $affiliate_legacy_events ) + 1;
		$affiliate_legacy_events[ $event['event_key'] ] = $event;
		return array( 'created' => true, 'id' => $event['id'] );
	}

	public static function audit( $action, $entity_type, $entity_id, $description, $actor_user_id ) {
		global $affiliate_legacy_audits;
		$affiliate_legacy_audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}

	public static function now_gmt() {
		return '2026-09-21 12:00:00';
	}
}

function affiliates_legacy_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( $message . ' Expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) );
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-legacy-migration.php';

$preview = Nakama_Affiliates_Legacy_Migration::preview( 42 );
affiliates_legacy_assert_same( true, $preview['success'], 'An administrator can preview legacy creator metadata.' );
affiliates_legacy_assert_same( 2, $preview['importable'], 'Only exact monthly metadata with positive numeric values is importable.' );
$importable_items = array_values( array_filter( $preview['items'], static function ( $item ) { return 'importable' === $item['status']; } ) );
affiliates_legacy_assert_same( array( '2026-08', '2026-09' ), array_column( $importable_items, 'period' ), 'Preview normalizes only valid, open monthly keys.' );
affiliates_legacy_assert_same( array( 250.5, 100.0 ), array_column( $importable_items, 'commission_mxn' ), 'Preview preserves historical commission amounts.' );
affiliates_legacy_assert_same( 'period_closed', $preview['items'][0]['status'], 'A historical amount cannot be inserted behind an existing monthly close.' );

$blocked = Nakama_Affiliates_Legacy_Migration::migrate( 42, false, 9 );
affiliates_legacy_assert_same( 'confirmation_required', $blocked['reason'], 'Migration requires explicit confirmation.' );
affiliates_legacy_assert_same( 0, count( $affiliate_legacy_events ), 'A preview or unconfirmed action never writes ledger events.' );

$migrated = Nakama_Affiliates_Legacy_Migration::migrate( 42, true, 9 );
affiliates_legacy_assert_same( true, $migrated['success'], 'A confirmed migration succeeds.' );
affiliates_legacy_assert_same( 2, $migrated['imported'], 'Each approved monthly commission becomes one idempotent event.' );
foreach ( $affiliate_legacy_events as $event ) {
	affiliates_legacy_assert_same( 'legacy_commission', $event['event_type'], 'Legacy data is identified as a historical commission.' );
	affiliates_legacy_assert_same( 0.0, $event['base_mxn'], 'Migration never invents sales or goal progress.' );
	affiliates_legacy_assert_same( 'posted', $event['status'], 'A confirmed valid amount is ready for manual closure review.' );
}
affiliates_legacy_assert_same( 1, count( $affiliate_legacy_audits ), 'The confirmed migration is audited once.' );

$again = Nakama_Affiliates_Legacy_Migration::migrate( 42, true, 9 );
affiliates_legacy_assert_same( 0, $again['imported'], 'Repeating the migration cannot duplicate historical commissions.' );
affiliates_legacy_assert_same( 3, $again['skipped'], 'Previously imported or already closed periods are reported as skipped.' );
affiliates_legacy_assert_same( 2, count( $affiliate_legacy_events ), 'The idempotent event key keeps the ledger unchanged.' );

echo "PHP Nakama Affiliates legacy migration tests passed.\n";
