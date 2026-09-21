<?php
/**
 * Persistence gateway for Nakama Affiliates.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Repository {
	const TABLES = array(
		'profiles'      => 'nakama_affiliates',
		'ledger'        => 'nakama_affiliate_ledger',
		'closures'      => 'nakama_affiliate_closures',
		'documents'     => 'nakama_affiliate_documents',
		'benefits'      => 'nakama_affiliate_benefit_periods',
		'requests'      => 'nakama_affiliate_requests',
		'request_items' => 'nakama_affiliate_request_items',
		'evidence'      => 'nakama_affiliate_evidence',
		'audit'         => 'nakama_affiliate_audit',
	);

	public static function table( $name ) {
		global $wpdb;

		if ( ! isset( self::TABLES[ $name ] ) ) {
			throw new InvalidArgumentException( 'Unknown Nakama Affiliates table.' );
		}

		return $wpdb->prefix . self::TABLES[ $name ];
	}

	public static function now_gmt() {
		return gmdate( 'Y-m-d H:i:s' );
	}

	public static function profile_by_id( $affiliate_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE id = %d LIMIT 1',
			(int) $affiliate_id
		), ARRAY_A );
	}

	public static function profile_by_user( $user_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE user_id = %d LIMIT 1',
			(int) $user_id
		), ARRAY_A );
	}

	public static function profile_by_code( $code ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'profiles' ) . ' WHERE code = %s LIMIT 1',
			(string) $code
		), ARRAY_A );
	}

	public static function insert_profile( array $data ) {
		global $wpdb;
		$now = self::now_gmt();
		$record = array_merge( array(
			'status'           => 'active',
			'discount_rate'    => Nakama_Affiliates_Domain::MAX_DISCOUNT_RATE,
			'commission_rate'  => Nakama_Affiliates_Domain::COMMISSION_RATE,
			'attribution_days' => Nakama_Affiliates_Domain::ATTRIBUTION_DAYS,
			'created_at_gmt'   => $now,
			'updated_at_gmt'   => $now,
		), $data );

		$inserted = $wpdb->insert( self::table( 'profiles' ), $record );
		return $inserted ? (int) $wpdb->insert_id : 0;
	}

	public static function update_profile( $affiliate_id, array $data ) {
		global $wpdb;
		$data['updated_at_gmt'] = self::now_gmt();
		return false !== $wpdb->update(
			self::table( 'profiles' ),
			$data,
			array( 'id' => (int) $affiliate_id )
		);
	}

	public static function ledger_by_event_key( $event_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'ledger' ) . ' WHERE event_key = %s LIMIT 1',
			(string) $event_key
		), ARRAY_A );
	}

	public static function ledger_events_for_order( $order_id ) {
		global $wpdb;
		return $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'ledger' ) . ' WHERE order_id = %d ORDER BY id ASC',
			(int) $order_id
		), ARRAY_A );
	}

	public static function closure_by_affiliate_period( $affiliate_id, $period_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
	}

	public static function closure_by_id( $closure_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE id = %d LIMIT 1',
			(int) $closure_id
		), ARRAY_A );
	}

	/** Posted and review movements still available for a monthly close. */
	public static function closure_candidate_events( $affiliate_id, $period_key ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'ledger' ) . ' WHERE affiliate_id = %d AND period_key = %s AND closure_id = 0 AND status IN (\'posted\',\'review\') ORDER BY id ASC',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	/** Atomically freeze a closure and attach exactly the confirmed events. */
	public static function create_closure_with_events( array $data, array $event_ids ) {
		global $wpdb;
		$wpdb->query( 'START TRANSACTION' );
		$wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'profiles' ) . ' WHERE id = %d FOR UPDATE',
			(int) $data['affiliate_id']
		) );
		$existing = $wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'closures' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1 FOR UPDATE',
			(int) $data['affiliate_id'],
			(string) $data['period_key']
		) );
		if ( $existing ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}

		$inserted = $wpdb->insert( self::table( 'closures' ), $data );
		if ( ! $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$closure_id = (int) $wpdb->insert_id;
		$event_ids  = array_values( array_unique( array_filter( array_map( 'intval', $event_ids ) ) ) );
		if ( $event_ids ) {
			$placeholders = implode( ',', array_fill( 0, count( $event_ids ), '%d' ) );
			$sql = 'UPDATE ' . self::table( 'ledger' ) . ' SET closure_id = %d WHERE affiliate_id = %d AND period_key = %s AND closure_id = 0 AND status = \'posted\' AND id IN (' . $placeholders . ')';
			$args = array_merge( array( $closure_id, (int) $data['affiliate_id'], (string) $data['period_key'] ), $event_ids );
			$attached = $wpdb->query( $wpdb->prepare( $sql, $args ) );
			if ( false === $attached || count( $event_ids ) !== (int) $attached ) {
				$wpdb->query( 'ROLLBACK' );
				return 0;
			}
		}

		$wpdb->query( 'COMMIT' );
		return $closure_id;
	}

	public static function update_closure( $closure_id, array $data ) {
		global $wpdb;
		return false !== $wpdb->update(
			self::table( 'closures' ),
			$data,
			array( 'id' => (int) $closure_id )
		);
	}

	public static function benefit_by_affiliate_period( $affiliate_id, $period_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'benefits' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
	}

	public static function benefit_by_id( $benefit_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'benefits' ) . ' WHERE id = %d LIMIT 1',
			(int) $benefit_id
		), ARRAY_A );
	}

	/** Insert one frozen benefit per affiliate and month; duplicate races are idempotent. */
	public static function insert_benefit_period( array $data ) {
		global $wpdb;
		$existing = self::benefit_by_affiliate_period( (int) $data['affiliate_id'], (string) $data['period_key'] );
		if ( $existing ) {
			return (int) $existing['id'];
		}

		if ( $wpdb->insert( self::table( 'benefits' ), $data ) ) {
			return (int) $wpdb->insert_id;
		}

		$existing = self::benefit_by_affiliate_period( (int) $data['affiliate_id'], (string) $data['period_key'] );
		return $existing ? (int) $existing['id'] : 0;
	}

	public static function update_benefit_period( $benefit_id, array $data ) {
		global $wpdb;
		return false !== $wpdb->update(
			self::table( 'benefits' ),
			$data,
			array( 'id' => (int) $benefit_id )
		);
	}

	public static function request_by_affiliate_period( $affiliate_id, $period_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'requests' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
	}

	public static function request_by_id( $request_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'requests' ) . ' WHERE id = %d LIMIT 1',
			(int) $request_id
		), ARRAY_A );
	}

	public static function request_items( $request_id ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'request_items' ) . ' WHERE request_id = %d ORDER BY position ASC',
			(int) $request_id
		), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function latest_prior_request( $affiliate_id, $period_key ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'requests' ) . ' WHERE affiliate_id = %d AND period_key < %s AND status NOT IN (\'cancelled\',\'rejected\') ORDER BY period_key DESC,id DESC LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );
	}

	public static function request_has_approved_required_evidence( $request_id ) {
		global $wpdb;
		$count = $wpdb->get_var( $wpdb->prepare(
			'SELECT COUNT(DISTINCT slot_key) FROM ' . self::table( 'evidence' ) . ' WHERE request_id = %d AND status = \'approved\' AND slot_key IN (\'reel_1\',\'reel_2\',\'story_1\')',
			(int) $request_id
		) );
		return 3 === (int) $count;
	}

	/** Atomically create the non-commercial monthly request and its item snapshots. */
	public static function create_request_with_items( array $request, array $items ) {
		global $wpdb;
		$wpdb->query( 'START TRANSACTION' );
		$wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'profiles' ) . ' WHERE id = %d FOR UPDATE',
			(int) $request['affiliate_id']
		) );
		$existing = $wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'requests' ) . ' WHERE affiliate_id = %d AND period_key = %s LIMIT 1 FOR UPDATE',
			(int) $request['affiliate_id'],
			(string) $request['period_key']
		) );
		if ( $existing || ! $wpdb->insert( self::table( 'requests' ), $request ) ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$request_id = (int) $wpdb->insert_id;
		foreach ( array_values( $items ) as $index => $item ) {
			$record = array_merge( $item, array( 'request_id' => $request_id, 'position' => $index + 1 ) );
			if ( ! $wpdb->insert( self::table( 'request_items' ), $record ) ) {
				$wpdb->query( 'ROLLBACK' );
				return 0;
			}
		}
		$wpdb->query( 'COMMIT' );
		return $request_id;
	}

	public static function update_request( $request_id, array $data ) {
		global $wpdb;
		return false !== $wpdb->update(
			self::table( 'requests' ),
			$data,
			array( 'id' => (int) $request_id )
		);
	}

	public static function evidence_for_request( $request_id ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'evidence' ) . ' WHERE request_id = %d ORDER BY position ASC,id ASC',
			(int) $request_id
		), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function evidence_by_id( $evidence_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'evidence' ) . ' WHERE id = %d LIMIT 1',
			(int) $evidence_id
		), ARRAY_A );
	}

	public static function evidence_by_affiliate_period_hash( $affiliate_id, $period_key, $url_hash, $exclude_id = 0 ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT e.* FROM ' . self::table( 'evidence' ) . ' e INNER JOIN ' . self::table( 'requests' ) . ' r ON r.id = e.request_id WHERE e.affiliate_id = %d AND r.period_key = %s AND e.url_hash = %s AND e.id <> %d LIMIT 1',
			(int) $affiliate_id,
			(string) $period_key,
			(string) $url_hash,
			(int) $exclude_id
		), ARRAY_A );
	}

	/** Insert new slots or replace rejected slots as one auditable submission. */
	public static function save_evidence_batch( array $records ) {
		global $wpdb;
		if ( ! $records ) return true;
		$wpdb->query( 'START TRANSACTION' );
		$wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'requests' ) . ' WHERE id = %d FOR UPDATE',
			(int) $records[0]['request_id']
		) );
		foreach ( $records as $record ) {
			$evidence_id = (int) ( $record['id'] ?? 0 );
			unset( $record['id'] );
			if ( $evidence_id > 0 ) {
				$saved = $wpdb->update( self::table( 'evidence' ), $record, array( 'id' => $evidence_id, 'status' => 'rejected' ) );
				$ok = 1 === (int) $saved;
			} else {
				$ok = (bool) $wpdb->insert( self::table( 'evidence' ), $record );
			}
			if ( ! $ok ) {
				$wpdb->query( 'ROLLBACK' );
				return false;
			}
		}
		$wpdb->query( 'COMMIT' );
		return true;
	}

	public static function update_evidence( $evidence_id, array $data ) {
		global $wpdb;
		return false !== $wpdb->update(
			self::table( 'evidence' ),
			$data,
			array( 'id' => (int) $evidence_id )
		);
	}

	/** Atomically record the first payment and its private document. */
	public static function record_payment_with_document( $closure_id, array $document, array $payment ) {
		global $wpdb;
		$wpdb->query( 'START TRANSACTION' );
		$closure = $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE id = %d LIMIT 1 FOR UPDATE',
			(int) $closure_id
		), ARRAY_A );
		if ( ! $closure || 'approved' !== ( $closure['status'] ?? '' ) ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$inserted = $wpdb->insert( self::table( 'documents' ), $document );
		if ( ! $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$document_id = (int) $wpdb->insert_id;
		$updated = $wpdb->update( self::table( 'closures' ), array(
			'status'              => 'paid',
			'paid_at_gmt'         => (string) $payment['paid_at_gmt'],
			'payment_reference'   => (string) $payment['reference'],
			'payment_document_id' => $document_id,
			'paid_net_mxn'        => (float) $payment['paid_net_mxn'],
			'updated_at_gmt'      => (string) $payment['updated_at_gmt'],
		), array( 'id' => (int) $closure_id, 'status' => 'approved' ) );
		if ( 1 !== (int) $updated ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$wpdb->query( 'COMMIT' );
		return $document_id;
	}

	/** Preserve the previous receipt and point the closure at a new version. */
	public static function replace_payment_document( $closure_id, array $document ) {
		global $wpdb;
		$wpdb->query( 'START TRANSACTION' );
		$closure = $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE id = %d LIMIT 1 FOR UPDATE',
			(int) $closure_id
		), ARRAY_A );
		if ( ! $closure || 'paid' !== ( $closure['status'] ?? '' ) ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$old_document_id = (int) ( $closure['payment_document_id'] ?? 0 );
		if ( $old_document_id > 0 ) {
			$cleared = $wpdb->update( self::table( 'documents' ), array( 'is_current' => 0 ), array( 'id' => $old_document_id ) );
			if ( false === $cleared ) {
				$wpdb->query( 'ROLLBACK' );
				return 0;
			}
		}
		if ( ! $wpdb->insert( self::table( 'documents' ), $document ) ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$new_document_id = (int) $wpdb->insert_id;
		$updated = $wpdb->update( self::table( 'closures' ), array(
			'payment_document_id' => $new_document_id,
			'updated_at_gmt'      => self::now_gmt(),
		), array( 'id' => (int) $closure_id, 'status' => 'paid' ) );
		if ( 1 !== (int) $updated ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$wpdb->query( 'COMMIT' );
		return $new_document_id;
	}

	public static function closures_for_affiliate( $affiliate_id, $page = 1, $per_page = 20 ) {
		global $wpdb;
		$page = max( 1, (int) $page );
		$per_page = min( 50, max( 1, (int) $per_page ) );
		$rows = $wpdb->get_results( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'closures' ) . ' WHERE affiliate_id = %d ORDER BY period_key DESC,id DESC LIMIT %d OFFSET %d',
			(int) $affiliate_id,
			$per_page + 1,
			( $page - 1 ) * $per_page
		), ARRAY_A );
		$rows = is_array( $rows ) ? $rows : array();
		$has_more = count( $rows ) > $per_page;
		if ( $has_more ) array_pop( $rows );
		return array( 'items' => $rows, 'has_more' => $has_more );
	}

	public static function document_by_id( $document_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'documents' ) . ' WHERE id = %d LIMIT 1',
			(int) $document_id
		), ARRAY_A );
	}

	public static function current_document( $affiliate_id, $document_type = 'fiscal' ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare(
			'SELECT * FROM ' . self::table( 'documents' ) . ' WHERE affiliate_id = %d AND document_type = %s AND is_current = 1 ORDER BY id DESC LIMIT 1',
			(int) $affiliate_id,
			(string) $document_type
		), ARRAY_A );
	}

	public static function insert_document( array $data ) {
		global $wpdb;
		$wpdb->query( 'START TRANSACTION' );
		// Serialize replacements for the same affiliate so two simultaneous
		// uploads cannot both remain marked as the current version.
		$wpdb->get_var( $wpdb->prepare(
			'SELECT id FROM ' . self::table( 'profiles' ) . ' WHERE id = %d FOR UPDATE',
			(int) $data['affiliate_id']
		) );
		$cleared = $wpdb->update(
			self::table( 'documents' ),
			array( 'is_current' => 0 ),
			array(
				'affiliate_id'  => (int) $data['affiliate_id'],
				'document_type' => (string) $data['document_type'],
				'is_current'    => 1,
			)
		);
		$inserted = false !== $cleared && $wpdb->insert( self::table( 'documents' ), $data );
		if ( ! $inserted ) {
			$wpdb->query( 'ROLLBACK' );
			return 0;
		}
		$document_id = (int) $wpdb->insert_id;
		$wpdb->query( 'COMMIT' );
		return $document_id;
	}

	public static function update_document( $document_id, array $data ) {
		global $wpdb;
		return false !== $wpdb->update(
			self::table( 'documents' ),
			$data,
			array( 'id' => (int) $document_id )
		);
	}

	public static function ledger_summary( $affiliate_id, $period_key ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare(
			'SELECT
				SUM(CASE WHEN event_type = \'sale\' AND status = \'posted\' THEN 1 ELSE 0 END) AS sales_count,
				SUM(CASE WHEN event_type IN (\'refund\', \'reversal\') AND status = \'posted\' THEN 1 ELSE 0 END) AS refund_count,
				SUM(CASE WHEN status = \'posted\' THEN base_mxn ELSE 0 END) AS sales_mxn,
				SUM(CASE WHEN status = \'posted\' THEN commission_mxn ELSE 0 END) AS commission_mxn
			FROM ' . self::table( 'ledger' ) . ' WHERE affiliate_id = %d AND period_key = %s',
			(int) $affiliate_id,
			(string) $period_key
		), ARRAY_A );

		return $row ?: array(
			'sales_count'   => 0,
			'refund_count'  => 0,
			'sales_mxn'     => 0,
			'commission_mxn'=> 0,
		);
	}

	public static function ledger_for_affiliate( $affiliate_id, $page = 1, $per_page = 20 ) {
		global $wpdb;
		$page     = max( 1, (int) $page );
		$per_page = min( 50, max( 1, (int) $per_page ) );
		$rows = $wpdb->get_results( $wpdb->prepare(
			'SELECT id,event_type,order_id,period_key,source_currency,source_base,rate_to_mxn,base_mxn,commission_mxn,status,occurred_at_gmt
			FROM ' . self::table( 'ledger' ) . ' WHERE affiliate_id = %d ORDER BY occurred_at_gmt DESC,id DESC LIMIT %d OFFSET %d',
			(int) $affiliate_id,
			$per_page + 1,
			( $page - 1 ) * $per_page
		), ARRAY_A );
		$rows = is_array( $rows ) ? $rows : array();
		$has_more = count( $rows ) > $per_page;
		if ( $has_more ) {
			array_pop( $rows );
		}
		return array( 'items' => $rows, 'has_more' => $has_more );
	}

	/** Insert by unique event key and treat a duplicate race as success. */
	public static function insert_ledger_event( array $data ) {
		global $wpdb;
		$event_key = isset( $data['event_key'] ) ? (string) $data['event_key'] : '';
		if ( '' === $event_key ) {
			return array( 'created' => false, 'id' => 0, 'reason' => 'missing_event_key' );
		}

		$existing = self::ledger_by_event_key( $event_key );
		if ( $existing ) {
			return array( 'created' => false, 'id' => (int) $existing['id'], 'event' => $existing );
		}

		$data['created_at_gmt'] = self::now_gmt();
		$inserted = $wpdb->insert( self::table( 'ledger' ), $data );
		if ( $inserted ) {
			return array( 'created' => true, 'id' => (int) $wpdb->insert_id, 'event' => $data );
		}

		$existing = self::ledger_by_event_key( $event_key );
		return $existing
			? array( 'created' => false, 'id' => (int) $existing['id'], 'event' => $existing )
			: array( 'created' => false, 'id' => 0, 'reason' => 'insert_failed' );
	}

	public static function audit( $action, $entity_type, $entity_id, $description = '', $actor_user_id = null ) {
		global $wpdb;
		if ( null === $actor_user_id ) {
			$actor_user_id = function_exists( 'get_current_user_id' ) ? get_current_user_id() : 0;
		}

		return (bool) $wpdb->insert( self::table( 'audit' ), array(
			'actor_user_id' => (int) $actor_user_id,
			'action'        => (string) $action,
			'entity_type'   => (string) $entity_type,
			'entity_id'     => (int) $entity_id,
			'description'   => (string) $description,
			'created_at_gmt'=> self::now_gmt(),
		) );
	}
}
