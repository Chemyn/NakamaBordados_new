<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

function affiliate_evidence_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf( "%s\nExpected: %s\nActual: %s", $message, var_export( $expected, true ), var_export( $actual, true ) ) );
	}
}

final class Nakama_Affiliates_Repository {
	public static array $requests = array(
		1 => array( 'id' => 1, 'affiliate_id' => 7, 'period_key' => '2026-10', 'status' => 'completed' ),
		2 => array( 'id' => 2, 'affiliate_id' => 8, 'period_key' => '2026-10', 'status' => 'completed' ),
	);
	public static array $evidence = array();
	public static array $audits = array();
	public static int $next_id = 1;

	public static function now_gmt(): string { return '2026-10-20 18:00:00'; }
	public static function request_by_id( $request_id ) { return self::$requests[ (int) $request_id ] ?? null; }
	public static function evidence_for_request( $request_id ): array {
		return array_values( array_filter( self::$evidence, static function ( $item ) use ( $request_id ) { return (int) $item['request_id'] === (int) $request_id; } ) );
	}
	public static function evidence_by_id( $evidence_id ) { return self::$evidence[ (int) $evidence_id ] ?? null; }
	public static function evidence_by_affiliate_period_hash( $affiliate_id, $period_key, $url_hash, $exclude_id = 0 ) {
		foreach ( self::$evidence as $item ) {
			$request = self::$requests[ (int) $item['request_id'] ] ?? null;
			if ( $request && (int) $item['affiliate_id'] === (int) $affiliate_id && $request['period_key'] === $period_key && $item['url_hash'] === $url_hash && (int) $item['id'] !== (int) $exclude_id ) return $item;
		}
		return null;
	}
	public static function save_evidence_batch( array $records ): bool {
		foreach ( $records as $record ) {
			$id = (int) ( $record['id'] ?? 0 );
			unset( $record['id'] );
			if ( $id > 0 ) {
				self::$evidence[ $id ] = array_merge( self::$evidence[ $id ], $record );
			} else {
				$id = self::$next_id++;
				$record['id'] = $id;
				self::$evidence[ $id ] = $record;
			}
		}
		return true;
	}
	public static function update_evidence( $evidence_id, array $data ): bool {
		if ( ! isset( self::$evidence[ (int) $evidence_id ] ) ) return false;
		self::$evidence[ (int) $evidence_id ] = array_merge( self::$evidence[ (int) $evidence_id ], $data );
		return true;
	}
	public static function request_has_approved_required_evidence( $request_id ): bool {
		$approved = array();
		foreach ( self::evidence_for_request( $request_id ) as $item ) if ( 'approved' === $item['status'] ) $approved[] = $item['slot_key'];
		return ! array_diff( array( 'reel_1', 'reel_2', 'story_1' ), array_unique( $approved ) );
	}
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ): bool {
		self::$audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor_user_id' );
		return true;
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-evidence.php';

$missing = Nakama_Affiliates_Evidence::submit( 1, 7, array(
	'reel_1' => 'https://instagram.com/reel/one',
	'reel_2' => 'https://instagram.com/reel/two',
), 7 );
affiliate_evidence_assert_same( 'required_slots_missing', $missing['reason'], 'Two Reels and one Story are mandatory for each delivery.' );

$insecure = Nakama_Affiliates_Evidence::submit( 1, 7, array(
	'reel_1' => 'http://instagram.com/reel/one',
	'reel_2' => 'https://instagram.com/reel/two',
	'story_1' => 'https://instagram.com/stories/one',
), 7 );
affiliate_evidence_assert_same( 'https_required', $insecure['reason'], 'Evidence accepts HTTPS URLs only.' );

$duplicate = Nakama_Affiliates_Evidence::submit( 1, 7, array(
	'reel_1' => 'https://instagram.com/reel/one',
	'reel_2' => 'https://INSTAGRAM.com/reel/one/#fragment',
	'story_1' => 'https://instagram.com/stories/one',
), 7 );
affiliate_evidence_assert_same( 'duplicate_url', $duplicate['reason'], 'Normalized duplicate URLs are rejected within the delivery period.' );

$submitted = Nakama_Affiliates_Evidence::submit( 1, 7, array(
	'reel_1' => 'https://INSTAGRAM.com/reel/one/#fragment',
	'reel_2' => 'https://instagram.com/reel/two/',
	'story_1' => 'https://instagram.com/stories/one',
	'bonus' => 'https://tiktok.com/@nakama/video/99',
), 7 );
affiliate_evidence_assert_same( true, $submitted['success'], 'All mandatory slots and the optional bonus can be submitted together.' );
affiliate_evidence_assert_same( 4, count( $submitted['items'] ), 'The optional bonus is stored as a fourth independent slot.' );
affiliate_evidence_assert_same( 'https://instagram.com/reel/one', $submitted['items'][0]['url'], 'URLs are normalized without downloading their content.' );
affiliate_evidence_assert_same( true, $submitted['bonusPriorityPotential'], 'The bonus communicates only potential Drop priority.' );
affiliate_evidence_assert_same( false, $submitted['bonusGuarantee'], 'The bonus never guarantees a Drop or changes program permissions.' );

$items_by_slot = array();
foreach ( $submitted['items'] as $item ) $items_by_slot[ $item['slot_key'] ] = $item;
$approved_reel_1 = Nakama_Affiliates_Evidence::review( $items_by_slot['reel_1']['id'], 'approved', '', 42 );
$approved_reel_2 = Nakama_Affiliates_Evidence::review( $items_by_slot['reel_2']['id'], 'approved', '', 42 );
affiliate_evidence_assert_same( 'approved', $approved_reel_1['evidence']['status'], 'Evidence approval is manual.' );
affiliate_evidence_assert_same( 'approved', $approved_reel_2['evidence']['status'], 'The second Reel is reviewed independently.' );

$rejected_without_reason = Nakama_Affiliates_Evidence::review( $items_by_slot['story_1']['id'], 'rejected', '', 42 );
affiliate_evidence_assert_same( 'reason_required', $rejected_without_reason['reason'], 'A manual rejection requires a reason.' );
$rejected = Nakama_Affiliates_Evidence::review( $items_by_slot['story_1']['id'], 'rejected', 'No se aprecia la etiqueta a Nakama.', 42 );
affiliate_evidence_assert_same( 'rejected', $rejected['evidence']['status'], 'The rejection and its reason remain visible.' );
affiliate_evidence_assert_same( false, Nakama_Affiliates_Repository::request_has_approved_required_evidence( 1 ), 'A rejected mandatory slot keeps the following month blocked.' );

$resubmitted = Nakama_Affiliates_Evidence::submit( 1, 7, array( 'story_1' => 'https://instagram.com/stories/corrected' ), 7 );
affiliate_evidence_assert_same( true, $resubmitted['success'], 'Only a rejected slot can be replaced and resubmitted.' );
$resubmitted_by_slot = array();
foreach ( $resubmitted['items'] as $item ) $resubmitted_by_slot[ $item['slot_key'] ] = $item;
affiliate_evidence_assert_same( 'pending', $resubmitted_by_slot['story_1']['status'], 'A replacement returns to pending manual review.' );
$audit_actions = array_column( Nakama_Affiliates_Repository::$audits, 'action' );
affiliate_evidence_assert_same( true, in_array( 'affiliate_evidence_replaced', $audit_actions, true ), 'Rejected replacement preserves an explicit audit event.' );

Nakama_Affiliates_Evidence::review( $resubmitted_by_slot['story_1']['id'], 'approved', '', 42 );
affiliate_evidence_assert_same( true, Nakama_Affiliates_Repository::request_has_approved_required_evidence( 1 ), 'Three approved mandatory slots unlock the next period.' );

$without_bonus = Nakama_Affiliates_Evidence::submit( 2, 8, array(
	'reel_1' => 'https://instagram.com/reel/affiliate-two-a',
	'reel_2' => 'https://instagram.com/reel/affiliate-two-b',
	'story_1' => 'https://instagram.com/stories/affiliate-two',
), 8 );
foreach ( $without_bonus['items'] as $item ) Nakama_Affiliates_Evidence::review( $item['id'], 'approved', '', 42 );
affiliate_evidence_assert_same( true, Nakama_Affiliates_Repository::request_has_approved_required_evidence( 2 ), 'Bonus is never required to complete evidence.' );

$source = file_get_contents( dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-evidence.php' );
foreach ( array( 'wp_remote_get', 'wp_remote_post', 'download_url', 'file_get_contents(' ) as $network_call ) {
	affiliate_evidence_assert_same( false, strpos( $source, $network_call ) !== false, 'Evidence stores links and never downloads social content.' );
}

echo "PHP Nakama Affiliates evidence tests passed.\n";
