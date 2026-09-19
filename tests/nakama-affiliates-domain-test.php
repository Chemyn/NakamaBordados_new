<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

function affiliates_assert_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new RuntimeException( sprintf(
			"%s\nExpected: %s\nActual: %s",
			$message,
			var_export( $expected, true ),
			var_export( $actual, true )
		) );
	}
}

$domain_file = dirname( __DIR__ ) . '/nakama-affiliates/includes/class-affiliates-domain.php';
affiliates_assert_same( true, file_exists( $domain_file ), 'The affiliate domain class exists.' );
require $domain_file;

$hermosillo = new DateTimeZone( 'America/Hermosillo' );
$instant = new DateTimeImmutable( '2026-10-01 05:30:00', new DateTimeZone( 'UTC' ) );

affiliates_assert_same(
	'2026-09',
	Nakama_Affiliates_Domain::period_key( $instant, $hermosillo ),
	'Monthly periods use the WordPress timezone rather than UTC.'
);
affiliates_assert_same(
	0.10,
	Nakama_Affiliates_Domain::bounded_rate( '0.15', 0.10 ),
	'Rates are capped at the approved maximum.'
);
affiliates_assert_same(
	0.0,
	Nakama_Affiliates_Domain::bounded_rate( '-0.20', 0.10 ),
	'Negative rates normalize to zero.'
);
affiliates_assert_same(
	-10.01,
	Nakama_Affiliates_Domain::money( '-10.005' ),
	'Signed monetary adjustments use two-decimal half-up rounding.'
);
affiliates_assert_same(
	123.46,
	Nakama_Affiliates_Domain::commission( 1234.56 ),
	'The commission is fixed at ten percent of the eligible MXN base.'
);

$base = Nakama_Affiliates_Domain::benefit_tier( 9999.99 );
affiliates_assert_same( 1, $base['quota'], 'Sales below 10k grant one product.' );
affiliates_assert_same( 10000.0, $base['next_threshold'], 'The first visible target is 10k.' );

$second = Nakama_Affiliates_Domain::benefit_tier( 10000 );
affiliates_assert_same( 2, $second['quota'], 'Sales at 10k grant two products.' );
affiliates_assert_same( 30000.0, $second['next_threshold'], 'The second visible target is 30k.' );

$third = Nakama_Affiliates_Domain::benefit_tier( 30000 );
affiliates_assert_same( 3, $third['quota'], 'Sales at 30k grant three products.' );
affiliates_assert_same( null, $third['next_threshold'], 'The top tier has no higher threshold.' );

echo "PHP Nakama Affiliates domain tests passed.\n";

