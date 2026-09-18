<?php
declare(strict_types=1);

function assert_same( $expected, $actual, string $message ): void {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

$domain_file = dirname( __DIR__ ) . '/nakama-drops/includes/class-drops-domain.php';
assert_same( true, file_exists( $domain_file ), 'The Drops domain service exists.' );
require $domain_file;

$launch = new DateTimeImmutable( '2026-10-15 18:00:00', new DateTimeZone( 'UTC' ) );
$before = new DateTimeImmutable( '2026-10-15 17:59:59', new DateTimeZone( 'UTC' ) );
$at_launch = new DateTimeImmutable( '2026-10-15 18:00:00', new DateTimeZone( 'UTC' ) );

assert_same( 'presale', Nakama_Drops_Domain::public_status( 'scheduled', $launch, $before, 8, 3 ), 'A scheduled campaign remains in presale before launch.' );
assert_same( 'sold_out', Nakama_Drops_Domain::public_status( 'scheduled', $launch, $before, 3, 3 ), 'A limited campaign reports sold out when every presale unit is reserved.' );
assert_same( 'presale', Nakama_Drops_Domain::public_status( 'scheduled', $launch, $before, null, 900 ), 'Unlimited presale never reports sold out.' );
assert_same( 'released', Nakama_Drops_Domain::public_status( 'scheduled', $launch, $at_launch, 3, 3 ), 'The exact launch instant enables normal sales.' );
assert_same( 'released', Nakama_Drops_Domain::public_status( 'released', $launch, $before, 3, 3 ), 'A transitioned campaign remains released.' );

assert_same( null, Nakama_Drops_Domain::remaining( null, 99 ), 'Unlimited campaigns do not expose a numeric remainder.' );
assert_same( 4, Nakama_Drops_Domain::remaining( 10, 6 ), 'The remaining quota is capacity minus reserved units.' );
assert_same( 0, Nakama_Drops_Domain::remaining( 10, 14 ), 'The remaining quota never becomes negative.' );

$valid = Nakama_Drops_Domain::validate_configuration( array(
	'product_id'      => 41,
	'launch_at_local' => '2026-10-15T12:00',
	'timezone'        => 'America/Mexico_City',
	'capacity'        => 25,
	'timer_position'  => 'overlay',
	'prices'          => array(
		array( 'item_id' => 41, 'presale' => '899.00', 'launch' => '1199.00' ),
	),
), new DateTimeImmutable( '2026-09-18 12:00:00', new DateTimeZone( 'UTC' ) ) );

assert_same( array(), $valid['errors'], 'A complete future campaign passes validation.' );
assert_same( '2026-10-15 18:00:00', $valid['campaign']['launch_at_gmt'], 'Local WordPress time is normalized to UTC.' );
assert_same( 25, $valid['campaign']['capacity'], 'A limited positive capacity is retained.' );
assert_same( '899.00', $valid['prices'][0]['presale'], 'Prices retain exact decimal strings.' );

$invalid = Nakama_Drops_Domain::validate_configuration( array(
	'product_id'      => 0,
	'launch_at_local' => '2026-09-01T10:00',
	'timezone'        => 'UTC',
	'capacity'        => 0,
	'timer_position'  => 'sideways',
	'prices'          => array(
		array( 'item_id' => 0, 'presale' => '1200', 'launch' => '900' ),
	),
), new DateTimeImmutable( '2026-09-18 12:00:00', new DateTimeZone( 'UTC' ) ) );

assert_same( true, in_array( 'product_required', $invalid['errors'], true ), 'A product is required.' );
assert_same( true, in_array( 'launch_must_be_future', $invalid['errors'], true ), 'The launch date must be in the future.' );
assert_same( true, in_array( 'capacity_invalid', $invalid['errors'], true ), 'Limited capacity must be a positive integer.' );
assert_same( true, in_array( 'timer_position_invalid', $invalid['errors'], true ), 'Timer position is restricted to supported layouts.' );
assert_same( true, in_array( 'price_relation_invalid', $invalid['errors'], true ), 'Presale price must be lower than launch price.' );

$public = Nakama_Drops_Domain::to_public( array(
	'id'             => 7,
	'product_id'     => 41,
	'product_slug'   => 'sudadera-akira',
	'status'         => 'scheduled',
	'launch_at_gmt'  => '2026-10-15 18:00:00',
	'capacity'       => 10,
	'reserved'       => 6,
	'timer_position' => 'below',
	'last_error'     => 'secret database detail',
), array(
	array( 'item_id' => 41, 'presale_price' => '899.00', 'launch_price' => '1199.00', 'previous_price' => '1.00' ),
), $before );

assert_same( 'presale', $public['status'], 'Public projection exposes the computed state.' );
assert_same( 4, $public['remaining'], 'Public projection exposes remaining limited quota.' );
assert_same( false, array_key_exists( 'last_error', $public ), 'Internal errors are never exposed publicly.' );
assert_same( false, array_key_exists( 'previous_price', $public['prices'][0] ), 'Previous commercial state is private.' );

echo "PHP Nakama Drops domain tests passed.\n";
