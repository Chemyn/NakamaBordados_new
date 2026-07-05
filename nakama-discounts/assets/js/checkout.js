/* global jQuery, NakamaDisc */
( function ( $ ) {
	'use strict';

	// Clic en un botón de promoción especial (o "usar fidelidad").
	$( document.body ).on( 'click', '.nakama-promo-btn', function ( e ) {
		e.preventDefault();
		var $btn  = $( this );
		var promo = $btn.data( 'promo' ) || '';

		$( '.nakama-promo-btn' ).removeClass( 'is-active' );
		$btn.addClass( 'is-active' );

		$.post( NakamaDisc.ajax_url, {
			action: 'nakama_select_promo',
			nonce:  NakamaDisc.nonce,
			promo:  promo
		} ).done( function () {
			// Refrescar totales.
			if ( NakamaDisc.is_checkout ) {
				$( document.body ).trigger( 'update_checkout' );
			} else {
				// En carrito: forzar recálculo vía fragmentos.
				$( document.body ).trigger( 'wc_update_cart' );
				// Fallback: recargar si no hay fragments.
				setTimeout( function () {
					if ( ! $( '.woocommerce-cart-form' ).length ) { return; }
					$( '[name="update_cart"]' ).prop( 'disabled', false ).trigger( 'click' );
				}, 100 );
			}
		} );
	} );

	// El cambio de método de pago ya dispara update_checkout en WooCommerce,
	// lo que recalcula el descuento por transferencia server-side. No requiere
	// nada extra aquí, pero dejamos el hook por si quieres feedback visual.
	$( document.body ).on( 'payment_method_selected', function () {
		// noop: el server recalcula el 3% de transferencia.
	} );

} )( jQuery );
