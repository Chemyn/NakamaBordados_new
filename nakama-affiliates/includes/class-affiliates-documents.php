<?php
/**
 * Fiscal document versioning, ownership and manual review.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Documents {
	public static function upload_for_current_user( array $file, $store_callback = null ) {
		$user_id = function_exists( 'get_current_user_id' ) ? (int) get_current_user_id() : 0;
		$profile = $user_id > 0 ? Nakama_Affiliates_Repository::profile_by_user( $user_id ) : null;
		if ( ! $profile || ! Nakama_Affiliates_Permissions::current_user_can_access() ) {
			return self::failure( 'forbidden', 'No tienes acceso para cargar una constancia fiscal.' );
		}

		$stored = is_callable( $store_callback )
			? call_user_func( $store_callback, $file )
			: Nakama_Affiliates_Private_Files::store_pdf( $file, 'fiscal' );
		if ( ! is_array( $stored ) || empty( $stored['success'] ) ) {
			return is_array( $stored ) ? $stored : self::failure( 'storage_failed', 'No se pudo guardar la constancia.' );
		}

		$document_id = Nakama_Affiliates_Repository::insert_document( array(
			'affiliate_id'   => (int) $profile['id'],
			'document_type'  => 'fiscal',
			'storage_key'    => (string) $stored['storage_key'],
			'original_name'  => (string) $stored['original_name'],
			'mime_type'      => 'application/pdf',
			'file_size'      => (int) $stored['file_size'],
			'sha256'         => (string) $stored['sha256'],
			'status'         => 'pending',
			'is_current'     => 1,
			'review_reason'  => null,
			'uploaded_at_gmt'=> Nakama_Affiliates_Repository::now_gmt(),
			'reviewed_at_gmt'=> null,
			'reviewed_by'    => 0,
		) );
		if ( ! $document_id ) {
			Nakama_Affiliates_Private_Files::delete( $stored['storage_key'] );
			return self::failure( 'database_failed', 'No se pudo registrar la constancia.' );
		}

		Nakama_Affiliates_Repository::audit( 'fiscal_document_uploaded', 'document', $document_id, 'Nueva versión fiscal pendiente de revisión.', $user_id );
		$document = Nakama_Affiliates_Repository::document_by_id( $document_id );
		return array( 'success' => true, 'document' => self::public_document( $document ) );
	}

	public static function current_for_user( $user_id = null ) {
		$user_id = null === $user_id && function_exists( 'get_current_user_id' ) ? get_current_user_id() : $user_id;
		$profile = $user_id ? Nakama_Affiliates_Repository::profile_by_user( (int) $user_id ) : null;
		if ( ! $profile ) {
			return null;
		}
		return self::current_for_affiliate( (int) $profile['id'] );
	}

	public static function current_for_affiliate( $affiliate_id ) {
		$document = Nakama_Affiliates_Repository::current_document( (int) $affiliate_id, 'fiscal' );
		return $document ? self::public_document( $document ) : null;
	}

	public static function review( $document_id, $status, $reason = '' ) {
		if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_woocommerce' ) ) {
			return self::failure( 'forbidden', 'Solo administración puede revisar constancias.' );
		}
		$document = Nakama_Affiliates_Repository::document_by_id( (int) $document_id );
		$status   = strtolower( trim( (string) $status ) );
		$reason   = trim( (string) $reason );
		if ( ! $document || ! in_array( $status, array( 'approved', 'rejected' ), true ) ) {
			return self::failure( 'invalid_review', 'La revisión solicitada no es válida.' );
		}
		if ( 'rejected' === $status && '' === $reason ) {
			return self::failure( 'missing_reason', 'Indica el motivo del rechazo.' );
		}

		$reviewer = (int) get_current_user_id();
		$updated = Nakama_Affiliates_Repository::update_document( (int) $document_id, array(
			'status'          => $status,
			'review_reason'   => 'rejected' === $status ? $reason : null,
			'reviewed_at_gmt' => Nakama_Affiliates_Repository::now_gmt(),
			'reviewed_by'     => $reviewer,
		) );
		if ( ! $updated ) {
			return self::failure( 'update_failed', 'No se pudo guardar la revisión.' );
		}
		Nakama_Affiliates_Repository::audit( 'fiscal_document_' . $status, 'document', (int) $document_id, 'rejected' === $status ? $reason : 'Constancia fiscal aprobada.', $reviewer );
		return array( 'success' => true, 'document' => self::public_document( Nakama_Affiliates_Repository::document_by_id( (int) $document_id ) ) );
	}

	public static function can_download( array $document, $user_id = null ) {
		if ( function_exists( 'current_user_can' ) && current_user_can( 'manage_woocommerce' ) ) {
			return true;
		}
		$user_id = null === $user_id && function_exists( 'get_current_user_id' ) ? get_current_user_id() : $user_id;
		$profile = Nakama_Affiliates_Repository::profile_by_id( (int) $document['affiliate_id'] );
		return $profile && (int) $profile['user_id'] === (int) $user_id;
	}

	public static function downloadable_for_current_user( $document_id = 0 ) {
		if ( $document_id ) {
			$document = Nakama_Affiliates_Repository::document_by_id( (int) $document_id );
		} else {
			$user_id = function_exists( 'get_current_user_id' ) ? get_current_user_id() : 0;
			$profile = $user_id ? Nakama_Affiliates_Repository::profile_by_user( (int) $user_id ) : null;
			$document = $profile ? Nakama_Affiliates_Repository::current_document( (int) $profile['id'], 'fiscal' ) : null;
		}
		if ( ! $document || ! self::can_download( $document ) ) {
			return self::failure( 'forbidden', 'No tienes acceso a este documento.' );
		}
		return array( 'success' => true, 'document' => $document );
	}

	private static function public_document( $document ) {
		if ( ! is_array( $document ) ) {
			return null;
		}
		return array(
			'id'         => (int) $document['id'],
			'status'     => (string) $document['status'],
			'fileName'   => (string) $document['original_name'],
			'fileSize'   => (int) $document['file_size'],
			'uploadedAt' => (string) $document['uploaded_at_gmt'],
			'reviewedAt' => $document['reviewed_at_gmt'] ?? null,
			'reason'     => $document['review_reason'] ?? null,
		);
	}

	private static function failure( $code, $message ) {
		return array( 'success' => false, 'code' => (string) $code, 'message' => (string) $message );
	}
}
