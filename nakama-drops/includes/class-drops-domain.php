<?php
/**
 * Pure domain rules shared by the admin, lifecycle and REST layers.
 *
 * @package NakamaDrops
 */

if ( ! class_exists( 'Nakama_Drops_Domain' ) ) {
	final class Nakama_Drops_Domain {
		/**
		 * Resolve the customer-facing state at an exact instant.
		 */
		public static function public_status( $status, DateTimeImmutable $launch, DateTimeImmutable $now, $capacity, $reserved ) {
			if ( 'released' === $status || $now >= $launch ) {
				return 'released';
			}

			if ( null !== $capacity && (int) $reserved >= (int) $capacity ) {
				return 'sold_out';
			}

			return 'presale';
		}

		/**
		 * Return the remaining presale allocation, or null when unlimited.
		 */
		public static function remaining( $capacity, $reserved ) {
			if ( null === $capacity ) {
				return null;
			}

			return max( 0, (int) $capacity - max( 0, (int) $reserved ) );
		}

		/**
		 * Validate and normalize an admin payload without relying on WordPress.
		 */
		public static function validate_configuration( array $input, DateTimeImmutable $now ) {
			$errors = array();
			$product_id = isset( $input['product_id'] ) ? (int) $input['product_id'] : 0;
			if ( $product_id < 1 ) {
				$errors[] = 'product_required';
			}

			$timezone_name = isset( $input['timezone'] ) ? trim( (string) $input['timezone'] ) : 'UTC';
			try {
				$timezone = new DateTimeZone( $timezone_name ?: 'UTC' );
			} catch ( Exception $exception ) {
				$timezone = new DateTimeZone( 'UTC' );
				$timezone_name = 'UTC';
				$errors[] = 'timezone_invalid';
			}

			$launch_local_raw = isset( $input['launch_at_local'] ) ? trim( (string) $input['launch_at_local'] ) : '';
			$launch = self::parse_local_datetime( $launch_local_raw, $timezone );
			if ( ! $launch ) {
				$errors[] = 'launch_invalid';
			} elseif ( $launch <= $now ) {
				$errors[] = 'launch_must_be_future';
			}

			$capacity = null;
			if ( array_key_exists( 'capacity', $input ) && null !== $input['capacity'] && '' !== $input['capacity'] ) {
				$capacity_raw = $input['capacity'];
				if ( false === filter_var( $capacity_raw, FILTER_VALIDATE_INT ) || (int) $capacity_raw < 1 ) {
					$errors[] = 'capacity_invalid';
				} else {
					$capacity = (int) $capacity_raw;
				}
			}

			$timer_position = isset( $input['timer_position'] ) ? (string) $input['timer_position'] : 'overlay';
			if ( ! in_array( $timer_position, array( 'overlay', 'below' ), true ) ) {
				$errors[] = 'timer_position_invalid';
				$timer_position = 'overlay';
			}

			$prices = array();
			foreach ( isset( $input['prices'] ) && is_array( $input['prices'] ) ? $input['prices'] : array() as $price ) {
				$item_id = isset( $price['item_id'] ) ? (int) $price['item_id'] : 0;
				$presale = self::normalize_price( isset( $price['presale'] ) ? $price['presale'] : null );
				$launch_price = self::normalize_price( isset( $price['launch'] ) ? $price['launch'] : null );
				if ( null !== $presale && null !== $launch_price && (float) $presale >= (float) $launch_price ) {
					$errors[] = 'price_relation_invalid';
				}
				if ( $item_id < 1 || null === $presale || null === $launch_price ) {
					$errors[] = 'price_required';
					continue;
				}
				$prices[] = array(
					'item_id'  => $item_id,
					'presale'  => $presale,
					'launch'   => $launch_price,
				);
			}
			if ( empty( $prices ) ) {
				$errors[] = 'prices_required';
			}

			$launch_utc = $launch ? $launch->setTimezone( new DateTimeZone( 'UTC' ) ) : null;

			return array(
				'errors'   => array_values( array_unique( $errors ) ),
				'campaign' => array(
					'product_id'      => $product_id,
					'launch_at_local' => $launch_local_raw,
					'launch_at_gmt'   => $launch_utc ? $launch_utc->format( 'Y-m-d H:i:s' ) : '',
					'timezone'        => $timezone_name,
					'capacity'        => $capacity,
					'timer_position'  => $timer_position,
				),
				'prices'   => $prices,
			);
		}

		/**
		 * Restrict a database record to the stable public REST contract.
		 */
		public static function to_public( array $campaign, array $prices, DateTimeImmutable $now ) {
			$utc = new DateTimeZone( 'UTC' );
			$launch = new DateTimeImmutable( $campaign['launch_at_gmt'], $utc );
			$capacity = isset( $campaign['capacity'] ) ? (int) $campaign['capacity'] : null;
			$reserved = isset( $campaign['reserved'] ) ? (int) $campaign['reserved'] : 0;
			$public_prices = array();

			foreach ( $prices as $price ) {
				$public_prices[] = array(
					'itemId'        => (int) $price['item_id'],
					'presalePrice'  => (string) $price['presale_price'],
					'launchPrice'   => (string) $price['launch_price'],
				);
			}

			return array(
				'id'            => (int) $campaign['id'],
				'productId'     => (int) $campaign['product_id'],
				'productSlug'   => (string) $campaign['product_slug'],
				'status'        => self::public_status( (string) $campaign['status'], $launch, $now, $capacity, $reserved ),
				'launchAt'      => $launch->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ),
				'serverNow'     => $now->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ),
				'unlimited'     => null === $capacity,
				'remaining'     => self::remaining( $capacity, $reserved ),
				'timerPosition' => isset( $campaign['timer_position'] ) && 'below' === $campaign['timer_position'] ? 'below' : 'overlay',
				'prices'        => $public_prices,
			);
		}

		private static function parse_local_datetime( $value, DateTimeZone $timezone ) {
			if ( '' === $value ) {
				return null;
			}
			$date = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i', $value, $timezone );
			$errors = DateTimeImmutable::getLastErrors();
			if ( false === $date || ( is_array( $errors ) && ( $errors['warning_count'] || $errors['error_count'] ) ) ) {
				return null;
			}
			return $date;
		}

		private static function normalize_price( $value ) {
			if ( null === $value || '' === trim( (string) $value ) || ! is_numeric( $value ) || (float) $value <= 0 ) {
				return null;
			}
			return number_format( (float) $value, 2, '.', '' );
		}
	}
}
