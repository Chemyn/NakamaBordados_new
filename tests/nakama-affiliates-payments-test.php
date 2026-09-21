<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_payment_user_id = 42;
$affiliate_payment_admin = true;
$affiliate_payment_deleted = array();

function get_current_user_id() { global $affiliate_payment_user_id; return $affiliate_payment_user_id; }
function current_user_can( $capability ) { global $affiliate_payment_admin; return 'manage_woocommerce' === $capability && $affiliate_payment_admin; }

function affiliates_payments_assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf( "%s\nExpected: %s\nActual: %s", $message, var_export( $expected, true ), var_export( $actual, true ) ) );
	}
}

final class Nakama_Affiliates_Private_Files {
	public static function store_payment_pdf( array $file ) { return array( 'success' => false, 'code' => 'unexpected_store' ); }
	public static function delete( $key ) { global $affiliate_payment_deleted; $affiliate_payment_deleted[] = $key; return true; }
}

final class Nakama_Affiliates_Repository {
	public static array $closures = array();
	public static array $documents = array();
	public static array $audits = array();
	public static int $next_document_id = 1;

	public static function now_gmt() { return '2026-10-03 09:00:00'; }
	public static function closure_by_id( $id ) { return self::$closures[ (int) $id ] ?? null; }
	public static function profile_by_id( $id ) { return 4 === (int) $id ? array( 'id' => 4, 'user_id' => 7 ) : null; }
	public static function document_by_id( $id ) { return self::$documents[ (int) $id ] ?? null; }
	public static function record_payment_with_document( $closure_id, array $document, array $payment ) {
		$closure = self::$closures[ (int) $closure_id ] ?? null;
		if ( ! $closure || 'approved' !== $closure['status'] ) return 0;
		$id = self::$next_document_id++;
		$document['id'] = $id;
		$document['is_current'] = 1;
		self::$documents[ $id ] = $document;
		self::$closures[ (int) $closure_id ] = array_merge( $closure, array(
			'status' => 'paid',
			'paid_at_gmt' => $payment['paid_at_gmt'],
			'payment_reference' => $payment['reference'],
			'payment_document_id' => $id,
			'paid_net_mxn' => $payment['paid_net_mxn'],
		) );
		return $id;
	}
	public static function replace_payment_document( $closure_id, array $document ) {
		$closure = self::$closures[ (int) $closure_id ] ?? null;
		if ( ! $closure || 'paid' !== $closure['status'] ) return 0;
		$old = (int) $closure['payment_document_id'];
		self::$documents[ $old ]['is_current'] = 0;
		$id = self::$next_document_id++;
		$document['id'] = $id;
		$document['is_current'] = 1;
		self::$documents[ $id ] = $document;
		self::$closures[ (int) $closure_id ]['payment_document_id'] = $id;
		return $id;
	}
	public static function update_closure( $id, array $data ) {
		if ( ! isset( self::$closures[ (int) $id ] ) ) return false;
		self::$closures[ (int) $id ] = array_merge( self::$closures[ (int) $id ], $data );
		return true;
	}
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor = null ) {
		self::$audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor' );
		return true;
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-payments.php';

Nakama_Affiliates_Repository::$closures = array(
	1 => array( 'id' => 1, 'affiliate_id' => 4, 'status' => 'approved', 'net_mxn' => 850.0, 'payment_document_id' => 0 ),
	2 => array( 'id' => 2, 'affiliate_id' => 4, 'status' => 'closed', 'net_mxn' => 500.0, 'payment_document_id' => 0 ),
	3 => array( 'id' => 3, 'affiliate_id' => 4, 'status' => 'approved', 'net_mxn' => 300.0, 'payment_document_id' => 0 ),
);

$stores = 0;
$store = static function ( $file ) use ( &$stores ) {
	$stores++;
	return array(
		'success' => true,
		'storage_key' => 'payments/' . str_pad( dechex( $stores ), 32, '0', STR_PAD_LEFT ) . '.pdf',
		'original_name' => $file['name'],
		'mime_type' => 'application/pdf',
		'file_size' => 120,
		'sha256' => str_repeat( (string) $stores, 64 ),
	);
};
$file = array( 'name' => 'comprobante.pdf', 'tmp_name' => '/tmp/payment.pdf', 'error' => UPLOAD_ERR_OK );

$first = Nakama_Affiliates_Payments::record( 1, $file, 'SPEI-001', '2026-10-02 14:30:00', 42, $store );
$duplicate = Nakama_Affiliates_Payments::record( 1, $file, 'SPEI-001', '2026-10-02 14:30:00', 42, $store );
affiliates_payments_assert_same( true, $first['success'], 'An approved closure accepts one payment.' );
affiliates_payments_assert_same( 850.0, $first['payment']['paidNetMxn'], 'The paid net is frozen from the approved closure.' );
affiliates_payments_assert_same( 'duplicate', $duplicate['reason'], 'A repeated payment submission is idempotent.' );
affiliates_payments_assert_same( 1, $stores, 'A duplicate submission does not create another private file.' );

$premature = Nakama_Affiliates_Payments::record( 2, $file, 'SPEI-002', '2026-10-02 15:00:00', 42, $store );
affiliates_payments_assert_same( 'not_approved', $premature['reason'], 'An unapproved closure cannot be paid.' );
affiliates_payments_assert_same( 1, $stores, 'Rejected payment state is checked before storing a file.' );

$missing_data = Nakama_Affiliates_Payments::record( 3, $file, '', '', 42, $store );
affiliates_payments_assert_same( 'payment_data_required', $missing_data['reason'], 'Date and reference are mandatory.' );

global $affiliate_payment_admin, $affiliate_payment_user_id;
$affiliate_payment_admin = false;
$affiliate_payment_user_id = 7;
affiliates_payments_assert_same( true, Nakama_Affiliates_Payments::downloadable( $first['payment']['documentId'] )['success'], 'The affiliate owner can download their receipt.' );
$affiliate_payment_user_id = 8;
affiliates_payments_assert_same( 'forbidden', Nakama_Affiliates_Payments::downloadable( $first['payment']['documentId'] )['reason'], 'Another affiliate cannot download the receipt.' );
$affiliate_payment_admin = true;
affiliates_payments_assert_same( true, Nakama_Affiliates_Payments::downloadable( $first['payment']['documentId'] )['success'], 'Administration can download a receipt for support.' );

$no_reason = Nakama_Affiliates_Payments::replace_receipt( 1, $file, '', 42, $store );
affiliates_payments_assert_same( 'reason_required', $no_reason['reason'], 'Receipt replacement requires a reason.' );
$replacement = Nakama_Affiliates_Payments::replace_receipt( 1, $file, 'El banco emitió un comprobante corregido.', 42, $store );
affiliates_payments_assert_same( true, $replacement['success'], 'A paid closure accepts an audited replacement receipt.' );
affiliates_payments_assert_same( 0, Nakama_Affiliates_Repository::$documents[ $first['payment']['documentId'] ]['is_current'], 'The previous receipt remains as non-current history.' );
affiliates_payments_assert_same( 2, count( Nakama_Affiliates_Repository::$documents ), 'Replacement preserves both document versions.' );

$reversed = Nakama_Affiliates_Payments::reverse( 1, 'Transferencia devuelta por el banco.', 42 );
affiliates_payments_assert_same( true, $reversed['success'], 'A payment reversal is an explicit audited event.' );
affiliates_payments_assert_same( 'Transferencia devuelta por el banco.', Nakama_Affiliates_Repository::$closures[1]['payment_reversal_reason'], 'Reversal keeps its reason without deleting payment evidence.' );
affiliates_payments_assert_same( 2, count( Nakama_Affiliates_Repository::$documents ), 'Reversal does not delete payment files or history.' );
$repeated_reversal = Nakama_Affiliates_Payments::reverse( 1, 'Otra vez', 42 );
affiliates_payments_assert_same( 'already_reversed', $repeated_reversal['reason'], 'A reversal event is idempotent.' );

echo "PHP Nakama Affiliates payment tests passed.\n";
