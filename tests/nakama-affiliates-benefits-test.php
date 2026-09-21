<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

function affiliates_benefits_assert_same( $expected, $actual, string $message ): void {
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
	public static array $benefits = array();
	public static array $audits = array();
	public static int $next_id = 1;

	public static function now_gmt(): string { return '2026-10-01 08:00:00'; }

	public static function benefit_by_affiliate_period( $affiliate_id, $period_key ) {
		foreach ( self::$benefits as $benefit ) {
			if ( (int) $benefit['affiliate_id'] === (int) $affiliate_id && $benefit['period_key'] === $period_key ) {
				return $benefit;
			}
		}
		return null;
	}

	public static function benefit_by_id( $benefit_id ) {
		return self::$benefits[ (int) $benefit_id ] ?? null;
	}

	public static function insert_benefit_period( array $data ): int {
		$existing = self::benefit_by_affiliate_period( $data['affiliate_id'], $data['period_key'] );
		if ( $existing ) return (int) $existing['id'];
		$id = self::$next_id++;
		$data['id'] = $id;
		self::$benefits[ $id ] = $data;
		return $id;
	}

	public static function update_benefit_period( $benefit_id, array $data ): bool {
		if ( ! isset( self::$benefits[ (int) $benefit_id ] ) ) return false;
		self::$benefits[ (int) $benefit_id ] = array_merge( self::$benefits[ (int) $benefit_id ], $data );
		return true;
	}

	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ): bool {
		self::$audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-benefits.php';

function benefit_closure( int $id, float $sales, float $refunds = 0.0, float $adjustments = 0.0 ): array {
	return array(
		'id' => $id,
		'affiliate_id' => 7,
		'period_key' => '2026-09',
		'status' => 'closed',
		'sales_mxn' => $sales,
		'refunds_mxn' => $refunds,
		'adjustments_mxn' => $adjustments,
		'commission_gross_mxn' => round( ( $sales + $refunds + $adjustments ) * 0.10, 2 ),
	);
}

$default = Nakama_Affiliates_Benefits::for_period( 7, '2026-10' );
affiliates_benefits_assert_same( 0, $default['id'], 'Without a previous closure, the benefit is a virtual baseline.' );
affiliates_benefits_assert_same( 1, $default['quota'], 'The baseline grants one product.' );
affiliates_benefits_assert_same( true, $default['is_default'], 'The fallback is explicitly distinguishable from a frozen benefit.' );

$invalid = Nakama_Affiliates_Benefits::grant_from_closure( array_merge( benefit_closure( 1, 10000.0 ), array( 'status' => 'draft' ) ), 42 );
affiliates_benefits_assert_same( 'closure_not_confirmed', $invalid['reason'], 'A draft cannot grant next month benefits.' );

$first = Nakama_Affiliates_Benefits::grant_from_closure( benefit_closure( 2, 12000.0, -2000.0 ), 42 );
affiliates_benefits_assert_same( true, $first['success'], 'A confirmed closure grants the next calendar month.' );
affiliates_benefits_assert_same( '2026-10', $first['benefit']['period_key'], 'The benefit belongs to the next month.' );
affiliates_benefits_assert_same( 10000.0, $first['benefit']['valid_sales_mxn'], 'Refunds reduce the ledger sales base before assigning the tier.' );
affiliates_benefits_assert_same( 2, $first['benefit']['quota'], 'Exactly 10,000 MXN grants two products.' );
affiliates_benefits_assert_same( 2, $first['benefit']['source_closure_id'], 'The frozen grant keeps its source closure.' );

$duplicate = Nakama_Affiliates_Benefits::grant_from_closure( benefit_closure( 2, 999999.0 ), 42 );
affiliates_benefits_assert_same( $first['benefit']['id'], $duplicate['benefit']['id'], 'Granting the same period is idempotent.' );
affiliates_benefits_assert_same( 10000.0, $duplicate['benefit']['valid_sales_mxn'], 'A frozen benefit cannot be recalculated silently.' );
affiliates_benefits_assert_same( 1, count( Nakama_Affiliates_Repository::$benefits ), 'Idempotency prevents duplicate monthly rows.' );

$cases = array(
	array( 9999.99, 1, 1 ),
	array( 10000.00, 2, 2 ),
	array( 29999.99, 2, 2 ),
	array( 30000.00, 3, 3 ),
);
foreach ( $cases as $index => $case ) {
	$closure = benefit_closure( 10 + $index, $case[0] );
	$closure['affiliate_id'] = 20 + $index;
	$result = Nakama_Affiliates_Benefits::grant_from_closure( $closure, 42 );
	affiliates_benefits_assert_same( $case[1], $result['benefit']['tier'], 'Tier threshold is based only on valid sales.' );
	affiliates_benefits_assert_same( $case[2], $result['benefit']['quota'], 'VIP status is not an input and never adds units.' );
}

$next_month = benefit_closure( 30, 500.0 );
$next_month['period_key'] = '2026-10';
$new_grant = Nakama_Affiliates_Benefits::grant_from_closure( $next_month, 42 );
affiliates_benefits_assert_same( '2026-11', $new_grant['benefit']['period_key'], 'Each closure creates an independent monthly benefit.' );
affiliates_benefits_assert_same( 1, $new_grant['benefit']['quota'], 'Unused units from the prior month never carry forward.' );

$progress = Nakama_Affiliates_Benefits::progress( 7500.0 );
affiliates_benefits_assert_same( 2500.0, $progress['next']['remaining_mxn'], 'Progress exposes the exact amount left to 10,000 MXN.' );
affiliates_benefits_assert_same( 75.0, $progress['milestones']['second']['progress_percent'], 'Progress to the second product is exact.' );
affiliates_benefits_assert_same( 25.0, $progress['milestones']['third']['progress_percent'], 'Progress to the third product is exact.' );

$top_progress = Nakama_Affiliates_Benefits::progress( 30000.0 );
affiliates_benefits_assert_same( null, $top_progress['next'], 'At 30,000 MXN there is no higher monthly reward.' );
affiliates_benefits_assert_same( 3, $top_progress['quota'], 'The top progress tier grants three products.' );

$benefit_id = $first['benefit']['id'];
$no_reason = Nakama_Affiliates_Benefits::correct_quota( $benefit_id, 3, '', 42 );
affiliates_benefits_assert_same( 'reason_required', $no_reason['reason'], 'Exceptional corrections require an explanation.' );
$corrected = Nakama_Affiliates_Benefits::correct_quota( $benefit_id, 3, 'Excepción aprobada por dirección.', 42 );
affiliates_benefits_assert_same( 3, $corrected['benefit']['quota'], 'An authorized exception can correct the frozen quota.' );
affiliates_benefits_assert_same( 'Excepción aprobada por dirección.', $corrected['benefit']['manual_reason'], 'The exception reason is persisted.' );
$last_audit = end( Nakama_Affiliates_Repository::$audits );
affiliates_benefits_assert_same( 'benefit_quota_corrected', $last_audit['action'], 'Every exceptional correction is audited.' );
affiliates_benefits_assert_same( 42, $last_audit['actor_user_id'], 'The correction audit keeps its author.' );

echo "PHP Nakama Affiliates benefit tests passed.\n";
