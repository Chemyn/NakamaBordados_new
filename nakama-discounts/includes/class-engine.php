<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * EL CEREBRO.
 * Recibe un Nakama_Context y devuelve un "plan" de descuento consistente con
 * todas las reglas de combinación.
 *
 * Estructura del plan:
 * [
 *   'primary'    => null | ['type'=>..,'label'=>..,'amount'=>float,'free_items'=>[]],
 *   'options'    => [ opciones primarias elegibles -> botones ],
 *   'transfer'   => ['applies'=>bool,'amount'=>float],
 *   'free_ship'  => bool,
 *   'msi'        => ['months'=>0|3|6],
 *   'totals'     => ['subtotal'=>..,'after_primary'=>..,'final'=>..],
 * ]
 */
class Nakama_Engine {

	public static function resolve( Nakama_Context $ctx ) {
		$subtotal = $ctx->subtotal;

		// 1) Construir candidatos PRIMARIOS (grupo mutuamente excluyente A/B/C).
		$candidates = self::build_primary_candidates( $ctx );

		// 2) Elegir UNA primaria.
		$primary = self::choose_primary( $candidates, $ctx );

		$primary_amount = $primary ? $primary['amount'] : 0.0;
		$after_primary  = max( 0, $subtotal - $primary_amount );

		// 3) Modificador E: transferencia (3% sobre subtotal ya descontado).
		$transfer = array( 'applies' => false, 'amount' => 0.0 );
		if ( 'yes' === Nakama_Settings::get( 'transfer_enabled' )
			&& $ctx->payment_method === Nakama_Settings::get( 'transfer_gateway_id' ) ) {
			$rate               = (float) Nakama_Settings::get( 'transfer_rate' );
			$transfer['applies'] = true;
			$transfer['amount']  = round( $after_primary * $rate, 2 );
		}

		$final = max( 0, $after_primary - $transfer['amount'] );

		// 4) Modificador D: envío gratis (usa total DESPUÉS de descuentos).
		$free_ship = false;
		if ( 'yes' === Nakama_Settings::get( 'free_ship_enabled' ) ) {
			$threshold = Nakama_Settings::amount( 'free_ship_threshold' );
			$free_ship = $final >= $threshold;
		}

		// 5) Modificador F: MSI.
		$msi_months = self::resolve_msi( $final );

		return array(
			'primary'   => $primary,
			'options'   => $candidates, // para pintar botones
			'transfer'  => $transfer,
			'free_ship' => $free_ship,
			'msi'       => array( 'months' => $msi_months ),
			'totals'    => array(
				'subtotal'      => $subtotal,
				'after_primary' => $after_primary,
				'final'         => $final,
			),
		);
	}

	/**
	 * Devuelve TODAS las promos primarias para las que el cliente/carrito
	 * califica en este momento. Solo una se aplicará (choose_primary).
	 */
	private static function build_primary_candidates( Nakama_Context $ctx ) {
		$out      = array();
		$subtotal = $ctx->subtotal;

		// A) Bienvenida / Fidelidad.
		$tier = Nakama_Customer_History::get_welcome_tier( $ctx->customer_id, $ctx->email );
		if ( $tier ) {
			$out['welcome'] = array(
				'type'       => 'welcome',
				'label'      => $tier['label'],
				'rate'       => $tier['rate'],
				'amount'     => round( $subtotal * $tier['rate'], 2 ),
				'free_items' => array(),
				'auto'       => true, // se aplica sin botón
			);
		}

		// B) Especial 10%.
		if ( Nakama_Campaigns::special_10_active() ) {
			$rate = (float) Nakama_Settings::get( 'special_10_rate' );
			$out['special_10'] = array(
				'type'       => 'special_10',
				'label'      => 'Descuento especial 10%',
				'rate'       => $rate,
				'amount'     => round( $subtotal * $rate, 2 ),
				'free_items' => array(),
				'auto'       => false, // requiere botón
			);
		}

		// C) 3x2 por categoría.
		if ( Nakama_Campaigns::special_3x2_active() ) {
			$free = self::calc_3x2( $ctx->threexthree_prices );
			if ( $free['count'] > 0 ) {
				$out['special_3x2'] = array(
					'type'       => 'special_3x2',
					'label'      => sprintf( '3x2 (%d gratis)', $free['count'] ),
					'rate'       => 0,
					'amount'     => $free['amount'],
					'free_items' => $free['items'],
					'auto'       => false,
				);
			}
		}

		return $out;
	}

	/**
	 * Reglas de exclusividad ya están garantizadas: A/B/C nunca se apilan.
	 * Selección:
	 *   - Si el cliente eligió una por botón y sigue elegible -> esa.
	 *   - Si no, se aplica la 'welcome' (automática) si existe.
	 *   - Si 'special_auto_if_better' = yes, se aplica la de mayor valor.
	 */
	private static function choose_primary( array $candidates, Nakama_Context $ctx ) {
		if ( empty( $candidates ) ) {
			return null;
		}

		$selected = $ctx->selected_promo;
		if ( $selected && isset( $candidates[ $selected ] ) ) {
			return $candidates[ $selected ];
		}

		if ( 'yes' === Nakama_Settings::get( 'special_auto_if_better' ) ) {
			uasort( $candidates, function ( $a, $b ) {
				return $b['amount'] <=> $a['amount'];
			} );
			return reset( $candidates );
		}

		// Default: bienvenida es automática; las especiales requieren botón.
		if ( isset( $candidates['welcome'] ) ) {
			return $candidates['welcome'];
		}

		return null; // hay especiales disponibles pero el cliente no ha elegido
	}

	/**
	 * 3x2 COMBINADO: se cuentan juntos todos los ítems de las categorías
	 * habilitadas. Por cada 3 unidades en total, 1 gratis. Las prendas gratis
	 * son SIEMPRE las de menor precio del conjunto completo.
	 * Ej.: 2 gorras + 1 bordado = 3 -> 1 gratis (la más barata de las tres).
	 * @return array ['count'=>int,'amount'=>float,'items'=>float[]]
	 */
	private static function calc_3x2( array $prices ) {
		sort( $prices ); // menor -> mayor (sobre la bolsa combinada)
		$qty      = count( $prices );
		$free_qty = intdiv( $qty, 3 ); // 3->1, 4/5->1, 6->2, ...

		$amount = 0.0;
		$items  = array();
		for ( $i = 0; $i < $free_qty; $i++ ) {
			$amount  += $prices[ $i ]; // las más baratas del total
			$items[]  = $prices[ $i ];
		}

		return array(
			'count'  => $free_qty,
			'amount' => round( $amount, 2 ),
			'items'  => $items,
		);
	}

	private static function resolve_msi( $final_total ) {
		if ( 'yes' !== Nakama_Settings::get( 'msi_enabled' ) ) {
			return 0;
		}
		$t3 = Nakama_Settings::amount( 'msi_3_threshold' );
		$t6 = Nakama_Settings::amount( 'msi_6_threshold' );

		// 6 MSI solo durante campaña especial.
		if ( Nakama_Campaigns::any_special_active() && $final_total >= $t6 ) {
			return 6;
		}
		if ( $final_total >= $t3 ) {
			return 3;
		}
		return 0;
	}
}
