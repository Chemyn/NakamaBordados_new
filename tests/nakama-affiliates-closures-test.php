<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

function affiliates_closures_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

final class Nakama_Affiliates_Repository {
	public static array $events = array();
	public static array $closures = array();
	public static array $audits = array();
	public static int $next_id = 1;

	public static function now_gmt(): string { return '2026-10-01 08:00:00'; }
	public static function closure_by_affiliate_period( $affiliate_id, $period_key ) {
		foreach ( self::$closures as $closure ) {
			if ( (int) $closure['affiliate_id'] === (int) $affiliate_id && $closure['period_key'] === $period_key ) return $closure;
		}
		return null;
	}
	public static function closure_by_id( $closure_id ) { return self::$closures[ (int) $closure_id ] ?? null; }
	public static function closure_candidate_events( $affiliate_id, $period_key ): array {
		return array_values( array_filter( self::$events, static function ( $event ) use ( $affiliate_id, $period_key ) {
			return (int) $event['affiliate_id'] === (int) $affiliate_id
				&& $event['period_key'] === $period_key
				&& 0 === (int) $event['closure_id'];
		} ) );
	}
	public static function create_closure_with_events( array $data, array $event_ids ): int {
		if ( self::closure_by_affiliate_period( $data['affiliate_id'], $data['period_key'] ) ) return 0;
		$id = self::$next_id++;
		$data['id'] = $id;
		self::$closures[ $id ] = $data;
		foreach ( self::$events as &$event ) {
			if ( in_array( (int) $event['id'], $event_ids, true ) ) $event['closure_id'] = $id;
		}
		unset( $event );
		return $id;
	}
	public static function update_closure( $closure_id, array $data ): bool {
		if ( ! isset( self::$closures[ (int) $closure_id ] ) ) return false;
		self::$closures[ (int) $closure_id ] = array_merge( self::$closures[ (int) $closure_id ], $data );
		return true;
	}
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ): bool {
		self::$audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' ) + array( 'at' => self::now_gmt() );
		return true;
	}
}

final class Nakama_Affiliates_Benefits {
	public static array $grants = array();
	public static function grant_from_closure( array $closure, $actor_user_id = 0 ): array {
		self::$grants[ (int) $closure['id'] ] = array( 'closure' => $closure, 'actor_user_id' => (int) $actor_user_id );
		return array( 'success' => true );
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-closures.php';

function closure_event( int $id, string $type, float $base, float $commission, string $status = 'posted' ): array {
	return array(
		'id' => $id,
		'affiliate_id' => 7,
		'period_key' => '2026-09',
		'event_type' => $type,
		'base_mxn' => $base,
		'commission_mxn' => $commission,
		'status' => $status,
		'closure_id' => 0,
	);
}

Nakama_Affiliates_Repository::$events = array(
	closure_event( 1, 'sale', 12000.0, 1200.0 ),
	closure_event( 2, 'refund', -2000.0, -200.0 ),
	closure_event( 3, 'adjustment', -100.0, -10.0 ),
);

$preview = Nakama_Affiliates_Closures::preview( 7, '2026-09' );
affiliates_closures_assert_same( 12000.0, $preview['sales_mxn'], 'Preview separates gross sales.' );
affiliates_closures_assert_same( -2000.0, $preview['refunds_mxn'], 'Preview separates refunds with their accounting sign.' );
affiliates_closures_assert_same( -100.0, $preview['adjustments_mxn'], 'Preview includes signed manual adjustments.' );
affiliates_closures_assert_same( 990.0, $preview['commission_gross_mxn'], 'Gross commission is the sum of posted ledger movements.' );
affiliates_closures_assert_same( 0, count( Nakama_Affiliates_Repository::$closures ), 'Preview never mutates closure state.' );
affiliates_closures_assert_same( 0, Nakama_Affiliates_Repository::$events[0]['closure_id'], 'Preview does not attach ledger movements.' );

$not_confirmed = Nakama_Affiliates_Closures::confirm( 7, '2026-09', false, 42 );
affiliates_closures_assert_same( 'confirmation_required', $not_confirmed['reason'], 'Closing requires a second explicit confirmation.' );

$closed = Nakama_Affiliates_Closures::confirm( 7, '2026-09', true, 42 );
$duplicate = Nakama_Affiliates_Closures::confirm( 7, '2026-09', true, 42 );
affiliates_closures_assert_same( true, $closed['success'], 'Confirmed preview creates the closure.' );
affiliates_closures_assert_same( 'closed', $closed['closure']['status'], 'A confirmed month enters the closed state.' );
affiliates_closures_assert_same( 990.0, $closed['closure']['commission_gross_mxn'], 'The gross commission is frozen in the closure.' );
affiliates_closures_assert_same( 'already_closed', $duplicate['reason'], 'Affiliate and month stay unique.' );
affiliates_closures_assert_same( true, Nakama_Affiliates_Repository::$events[0]['closure_id'] > 0, 'Included movements are attached to the immutable closure.' );
affiliates_closures_assert_same( 1, count( Nakama_Affiliates_Benefits::$grants ), 'Closing a month grants the following benefit period.' );
$benefit_grant = reset( Nakama_Affiliates_Benefits::$grants );
affiliates_closures_assert_same( 42, $benefit_grant['actor_user_id'], 'The grant keeps the closing administrator for audit.' );

$manual = Nakama_Affiliates_Closures::set_manual_amounts( $closed['closure']['id'], 90.0, 40.0, -10.0, 'Importes indicados por el contador.', 42 );
affiliates_closures_assert_same( 850.0, $manual['closure']['net_mxn'], 'Net equals gross minus ISR and IVA plus signed adjustments.' );
affiliates_closures_assert_same( 'Importes indicados por el contador.', $manual['closure']['adjustment_reason'], 'Manual amounts keep their reason.' );
$last_audit = end( Nakama_Affiliates_Repository::$audits );
affiliates_closures_assert_same( 42, $last_audit['actor_user_id'], 'The adjustment audit keeps its author.' );
affiliates_closures_assert_same( '2026-10-01 08:00:00', $last_audit['at'], 'The adjustment audit keeps its date.' );

$without_reason = Nakama_Affiliates_Closures::set_manual_amounts( $closed['closure']['id'], 80.0, 30.0, 0.0, '', 42 );
affiliates_closures_assert_same( 'reason_required', $without_reason['reason'], 'Fiscal inputs are never stored without a reason.' );

$unconfirmed_approval = Nakama_Affiliates_Closures::approve( $closed['closure']['id'], false, 42 );
affiliates_closures_assert_same( 'confirmation_required', $unconfirmed_approval['reason'], 'Approval is an explicit transition.' );
$approved = Nakama_Affiliates_Closures::approve( $closed['closure']['id'], true, 42 );
affiliates_closures_assert_same( 'approved', $approved['closure']['status'], 'A reviewed closure can be approved.' );

$locked_edit = Nakama_Affiliates_Closures::set_manual_amounts( $closed['closure']['id'], 1.0, 1.0, 1.0, 'Cambio tardío', 42 );
affiliates_closures_assert_same( 'locked', $locked_edit['reason'], 'An approved closure cannot be edited.' );
affiliates_closures_assert_same( 990.0, Nakama_Affiliates_Repository::$closures[ $closed['closure']['id'] ]['commission_gross_mxn'], 'The frozen base never changes after approval.' );

Nakama_Affiliates_Repository::$closures[99] = array( 'id' => 99, 'affiliate_id' => 8, 'period_key' => '2026-09', 'status' => 'closed' );
$premature_payment = Nakama_Affiliates_Closures::mark_paid( 99, array( 'reference' => 'TRANSFER-1', 'paid_at_gmt' => '2026-10-02 08:00:00', 'document_id' => 5 ), 42 );
affiliates_closures_assert_same( 'not_approved', $premature_payment['reason'], 'A closure cannot be paid before approval.' );

$paid = Nakama_Affiliates_Closures::mark_paid( $closed['closure']['id'], array( 'reference' => 'TRANSFER-2', 'paid_at_gmt' => '2026-10-02 08:00:00', 'document_id' => 6 ), 42 );
affiliates_closures_assert_same( 'paid', $paid['closure']['status'], 'Only an approved closure can transition to paid.' );

Nakama_Affiliates_Repository::$events[] = closure_event( 4, 'refund', -500.0, -50.0, 'review' );
$review_preview = Nakama_Affiliates_Closures::preview( 7, '2026-09' );
affiliates_closures_assert_same( 1, $review_preview['review_count'], 'Unresolved movements stay visible to operations.' );

$pending = closure_event( 5, 'refund', 0.0, 0.0, 'review' );
$pending['affiliate_id'] = 8;
$pending['period_key'] = '2026-10';
Nakama_Affiliates_Repository::$events[] = $pending;
$blocked_close = Nakama_Affiliates_Closures::confirm( 8, '2026-10', true, 42 );
affiliates_closures_assert_same( 'review_pending', $blocked_close['reason'], 'A month with unresolved refund review cannot be frozen silently.' );

echo "PHP Nakama Affiliates closure tests passed.\n";
