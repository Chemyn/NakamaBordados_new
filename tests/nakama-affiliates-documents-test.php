<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$affiliate_document_user_id = 7;
$affiliate_document_manage = false;
$affiliate_documents = array();
$affiliate_document_audits = array();

function get_current_user_id() {
	global $affiliate_document_user_id;
	return $affiliate_document_user_id;
}
function current_user_can( $capability ) {
	global $affiliate_document_manage;
	return 'manage_woocommerce' === $capability ? $affiliate_document_manage : false;
}

final class Nakama_Affiliates_Permissions {
	public static function current_user_can_access() { return 7 === get_current_user_id() || current_user_can( 'manage_woocommerce' ); }
}

final class Nakama_Affiliates_Repository {
	public static function profile_by_user( $user_id ) {
		return 7 === (int) $user_id ? array( 'id' => 4, 'user_id' => 7, 'status' => 'active' ) : null;
	}
	public static function profile_by_id( $affiliate_id ) {
		return 4 === (int) $affiliate_id ? array( 'id' => 4, 'user_id' => 7, 'status' => 'active' ) : null;
	}
	public static function insert_document( array $record ) {
		global $affiliate_documents;
		foreach ( $affiliate_documents as &$existing ) {
			if ( (int) $existing['affiliate_id'] === (int) $record['affiliate_id'] && 'fiscal' === $existing['document_type'] ) {
				$existing['is_current'] = 0;
			}
		}
		unset( $existing );
		$record['id'] = count( $affiliate_documents ) + 1;
		$affiliate_documents[ $record['id'] ] = $record;
		return $record['id'];
	}
	public static function document_by_id( $document_id ) {
		global $affiliate_documents;
		return $affiliate_documents[ (int) $document_id ] ?? null;
	}
	public static function update_document( $document_id, array $updates ) {
		global $affiliate_documents;
		if ( ! isset( $affiliate_documents[ (int) $document_id ] ) ) return false;
		$affiliate_documents[ (int) $document_id ] = array_merge( $affiliate_documents[ (int) $document_id ], $updates );
		return true;
	}
	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor = null ) {
		global $affiliate_document_audits;
		$affiliate_document_audits[] = compact( 'action', 'entity_type', 'entity_id', 'description', 'actor' );
		return true;
	}
	public static function now_gmt() { return '2026-09-20 12:00:00'; }
}

function affiliates_documents_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-private-files.php';
require dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-documents.php';

$valid_temp = tempnam( sys_get_temp_dir(), 'nk-pdf-' );
$fake_temp = tempnam( sys_get_temp_dir(), 'nk-fake-' );
$empty_temp = tempnam( sys_get_temp_dir(), 'nk-empty-' );
file_put_contents( $valid_temp, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF" );
file_put_contents( $fake_temp, 'This is not a PDF.' );
file_put_contents( $empty_temp, '' );

$valid_file = array(
	'name' => 'constancia.pdf',
	'tmp_name' => $valid_temp,
	'size' => filesize( $valid_temp ),
	'error' => UPLOAD_ERR_OK,
);
$pdf_mime = static fn( $path ) => 'application/pdf';
affiliates_documents_assert_same( true, Nakama_Affiliates_Private_Files::validate_pdf_upload( $valid_file, null, $pdf_mime )['success'], 'A real PDF upload is accepted.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Private_Files::validate_pdf_upload( array_merge( $valid_file, array( 'name' => 'constancia.txt' ) ), null, $pdf_mime )['success'], 'A false extension is rejected.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Private_Files::validate_pdf_upload( array_merge( $valid_file, array( 'tmp_name' => $fake_temp ) ), null, static fn( $path ) => 'text/plain' )['success'], 'A fake PDF MIME is rejected.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Private_Files::validate_pdf_upload( array_merge( $valid_file, array( 'tmp_name' => $empty_temp, 'size' => 0 ) ), null, $pdf_mime )['success'], 'An empty file is rejected.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Private_Files::validate_pdf_upload( $valid_file, 5, $pdf_mime )['success'], 'A document over the configured limit is rejected.' );

$private_base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'nakama-affiliates-' . bin2hex( random_bytes( 4 ) );
$stored = Nakama_Affiliates_Private_Files::store_pdf(
	$valid_file,
	'fiscal',
	static function ( $from, $to ) { return copy( $from, $to ); },
	$private_base,
	$pdf_mime
);
affiliates_documents_assert_same( true, $stored['success'], 'A valid document can be moved to private storage.' );
affiliates_documents_assert_same( true, is_file( $private_base . DIRECTORY_SEPARATOR . $stored['storage_key'] ), 'The stored file exists only below the private root.' );
affiliates_documents_assert_same( false, false !== strpos( $stored['storage_key'], 'constancia' ), 'The storage key never exposes the original filename.' );
affiliates_documents_assert_same( true, is_file( $private_base . DIRECTORY_SEPARATOR . '.htaccess' ), 'Private storage includes a deny-all web-server defense.' );

$store_callback = static function ( $file ) {
	return array(
		'success' => true,
		'storage_key' => 'fiscal/' . bin2hex( random_bytes( 16 ) ) . '.pdf',
		'original_name' => $file['name'],
		'mime_type' => 'application/pdf',
		'file_size' => (int) $file['size'],
		'sha256' => str_repeat( 'a', 64 ),
	);
};
$first = Nakama_Affiliates_Documents::upload_for_current_user( $valid_file, $store_callback );
$second = Nakama_Affiliates_Documents::upload_for_current_user( $valid_file, $store_callback );
affiliates_documents_assert_same( true, $first['success'], 'The authenticated affiliate can upload a fiscal document.' );
affiliates_documents_assert_same( 'pending', $affiliate_documents[2]['status'], 'Every replacement starts a new pending review.' );
affiliates_documents_assert_same( 0, $affiliate_documents[1]['is_current'], 'Replacing the document preserves the prior version as history.' );
affiliates_documents_assert_same( 2, count( $affiliate_documents ), 'Replacing a fiscal document never overwrites its history.' );
affiliates_documents_assert_same( false, isset( $second['document']['storage_key'] ), 'The upload response never exposes a physical path or storage key.' );

$affiliate_document_user_id = 8;
$denied = Nakama_Affiliates_Documents::upload_for_current_user( $valid_file, $store_callback );
affiliates_documents_assert_same( false, $denied['success'], 'A user without an affiliate profile cannot upload.' );

$affiliate_document_user_id = 7;
affiliates_documents_assert_same( true, Nakama_Affiliates_Documents::can_download( $affiliate_documents[2], 7 ), 'The owner can download their authorized private version.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Documents::can_download( $affiliate_documents[2], 8 ), 'Another user cannot download the document.' );
$affiliate_document_manage = true;
affiliates_documents_assert_same( true, Nakama_Affiliates_Documents::can_download( $affiliate_documents[2], 8 ), 'Administration can download documents for review.' );
affiliates_documents_assert_same( false, Nakama_Affiliates_Documents::review( 2, 'rejected', '' )['success'], 'A rejection requires a reason.' );
$reviewed = Nakama_Affiliates_Documents::review( 2, 'rejected', 'El PDF está borroso.' );
affiliates_documents_assert_same( true, $reviewed['success'], 'Administration can reject with a reason.' );
affiliates_documents_assert_same( 'rejected', $affiliate_documents[2]['status'], 'Review status is persisted.' );
affiliates_documents_assert_same( true, ! empty( $affiliate_document_audits ), 'Upload and review actions are audited.' );

unlink( $valid_temp );
unlink( $fake_temp );
unlink( $empty_temp );

echo "PHP Nakama Affiliates fiscal document tests passed.\n";
