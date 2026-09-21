<?php
/**
 * Manual commission payments and private receipt history.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Payments {
	public static function record( $closure_id, array $file, $reference, $paid_at_gmt, $actor_user_id, $store_callback = null ) {
		if ( ! self::admin_allowed() ) return self::failure( 'forbidden' );
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) return self::failure( 'not_found' );
		if ( 'paid' === ( $closure['status'] ?? '' ) ) {
			return self::failure( 'duplicate', array( 'payment' => self::public_payment( $closure ) ) );
		}
		if ( 'approved' !== ( $closure['status'] ?? '' ) ) return self::failure( 'not_approved' );

		$reference = trim( (string) $reference );
		$paid_at_gmt = trim( (string) $paid_at_gmt );
		if ( '' === $reference || strlen( $reference ) > 191 || ! self::valid_datetime( $paid_at_gmt ) || (int) $actor_user_id <= 0 ) {
			return self::failure( 'payment_data_required' );
		}

		$stored = self::store( $file, $store_callback );
		if ( empty( $stored['success'] ) ) return is_array( $stored ) ? $stored : self::failure( 'storage_failed' );
		$now = Nakama_Affiliates_Repository::now_gmt();
		$document = self::document_record( $closure, $stored, $now, $actor_user_id );
		$payment = array(
			'reference'    => $reference,
			'paid_at_gmt'  => $paid_at_gmt,
			'paid_net_mxn' => self::money( $closure['net_mxn'] ?? 0 ),
			'updated_at_gmt' => $now,
		);
		$document_id = Nakama_Affiliates_Repository::record_payment_with_document( (int) $closure_id, $document, $payment );
		if ( $document_id <= 0 ) {
			Nakama_Affiliates_Private_Files::delete( $stored['storage_key'] );
			$fresh = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
			return self::failure( $fresh && 'paid' === ( $fresh['status'] ?? '' ) ? 'duplicate' : 'database_failed' );
		}

		Nakama_Affiliates_Repository::audit( 'payment_recorded', 'closure', (int) $closure_id, 'Pago manual registrado con referencia ' . $reference . ' y comprobante privado.', (int) $actor_user_id );
		return array( 'success' => true, 'payment' => self::public_payment( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) ) );
	}

	public static function replace_receipt( $closure_id, array $file, $reason, $actor_user_id, $store_callback = null ) {
		if ( ! self::admin_allowed() ) return self::failure( 'forbidden' );
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) return self::failure( 'not_found' );
		if ( 'paid' !== ( $closure['status'] ?? '' ) ) return self::failure( 'not_paid' );
		$reason = trim( (string) $reason );
		if ( '' === $reason || (int) $actor_user_id <= 0 ) return self::failure( 'reason_required' );

		$stored = self::store( $file, $store_callback );
		if ( empty( $stored['success'] ) ) return is_array( $stored ) ? $stored : self::failure( 'storage_failed' );
		$old_document_id = (int) ( $closure['payment_document_id'] ?? 0 );
		$document = self::document_record( $closure, $stored, Nakama_Affiliates_Repository::now_gmt(), $actor_user_id );
		$new_document_id = Nakama_Affiliates_Repository::replace_payment_document( (int) $closure_id, $document );
		if ( $new_document_id <= 0 ) {
			Nakama_Affiliates_Private_Files::delete( $stored['storage_key'] );
			return self::failure( 'database_failed' );
		}

		Nakama_Affiliates_Repository::audit(
			'payment_receipt_replaced',
			'closure',
			(int) $closure_id,
			'Reemplazo de comprobante #' . $old_document_id . ' por #' . $new_document_id . '. Motivo: ' . $reason,
			(int) $actor_user_id
		);
		return array( 'success' => true, 'payment' => self::public_payment( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) ) );
	}

	/** Record a reversal event without erasing the payment or its documents. */
	public static function reverse( $closure_id, $reason, $actor_user_id ) {
		if ( ! self::admin_allowed() ) return self::failure( 'forbidden' );
		$closure = Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id );
		if ( ! $closure ) return self::failure( 'not_found' );
		if ( 'paid' !== ( $closure['status'] ?? '' ) ) return self::failure( 'not_paid' );
		if ( ! empty( $closure['payment_reversed_at_gmt'] ) ) return self::failure( 'already_reversed' );
		$reason = trim( (string) $reason );
		if ( '' === $reason || (int) $actor_user_id <= 0 ) return self::failure( 'reason_required' );

		$updated = Nakama_Affiliates_Repository::update_closure( (int) $closure_id, array(
			'payment_reversed_at_gmt' => Nakama_Affiliates_Repository::now_gmt(),
			'payment_reversed_by'     => (int) $actor_user_id,
			'payment_reversal_reason' => $reason,
			'updated_at_gmt'          => Nakama_Affiliates_Repository::now_gmt(),
		) );
		if ( ! $updated ) return self::failure( 'update_failed' );
		Nakama_Affiliates_Repository::audit( 'payment_reversed', 'closure', (int) $closure_id, $reason, (int) $actor_user_id );
		return array( 'success' => true, 'payment' => self::public_payment( Nakama_Affiliates_Repository::closure_by_id( (int) $closure_id ) ) );
	}

	public static function downloadable( $document_id, $user_id = null ) {
		$document = Nakama_Affiliates_Repository::document_by_id( (int) $document_id );
		if ( ! $document || 'payment' !== ( $document['document_type'] ?? '' ) ) return self::failure( 'not_found' );
		if ( self::admin_allowed() ) return array( 'success' => true, 'document' => $document );
		$user_id = null === $user_id && function_exists( 'get_current_user_id' ) ? get_current_user_id() : $user_id;
		$profile = Nakama_Affiliates_Repository::profile_by_id( (int) $document['affiliate_id'] );
		if ( ! $profile || (int) $profile['user_id'] !== (int) $user_id ) return self::failure( 'forbidden' );
		return array( 'success' => true, 'document' => $document );
	}

	public static function public_payment( $closure ) {
		if ( ! is_array( $closure ) ) return null;
		return array(
			'closureId'     => (int) $closure['id'],
			'affiliateId'   => (int) $closure['affiliate_id'],
			'status'        => (string) $closure['status'],
			'reference'     => (string) ( $closure['payment_reference'] ?? '' ),
			'paidAt'        => $closure['paid_at_gmt'] ?? null,
			'paidNetMxn'    => self::money( $closure['paid_net_mxn'] ?? ( $closure['net_mxn'] ?? 0 ) ),
			'documentId'    => (int) ( $closure['payment_document_id'] ?? 0 ),
			'reversedAt'    => $closure['payment_reversed_at_gmt'] ?? null,
			'reversalReason'=> $closure['payment_reversal_reason'] ?? null,
		);
	}

	private static function document_record( array $closure, array $stored, $now, $actor_user_id ) {
		return array(
			'affiliate_id'       => (int) $closure['affiliate_id'],
			'document_type'      => 'payment',
			'related_entity_type'=> 'closure',
			'related_entity_id'  => (int) $closure['id'],
			'storage_key'        => (string) $stored['storage_key'],
			'original_name'      => (string) $stored['original_name'],
			'mime_type'          => 'application/pdf',
			'file_size'          => (int) $stored['file_size'],
			'sha256'             => (string) $stored['sha256'],
			'status'             => 'approved',
			'is_current'         => 1,
			'review_reason'      => null,
			'uploaded_at_gmt'    => $now,
			'reviewed_at_gmt'    => $now,
			'reviewed_by'        => (int) $actor_user_id,
		);
	}

	private static function store( array $file, $store_callback ) {
		return is_callable( $store_callback )
			? call_user_func( $store_callback, $file )
			: Nakama_Affiliates_Private_Files::store_payment_pdf( $file );
	}

	private static function valid_datetime( $value ) {
		$date = DateTimeImmutable::createFromFormat( '!Y-m-d H:i:s', (string) $value, new DateTimeZone( 'UTC' ) );
		return $date && $date->format( 'Y-m-d H:i:s' ) === $value;
	}

	private static function admin_allowed() {
		return function_exists( 'current_user_can' ) && current_user_can( 'manage_woocommerce' );
	}

	private static function money( $amount ) {
		$amount = is_numeric( $amount ) ? round( (float) $amount, 2, PHP_ROUND_HALF_UP ) : 0.0;
		return 0.0 === $amount ? 0.0 : $amount;
	}

	private static function failure( $reason, array $extra = array() ) {
		return array_merge( array( 'success' => false, 'reason' => (string) $reason ), $extra );
	}
}
