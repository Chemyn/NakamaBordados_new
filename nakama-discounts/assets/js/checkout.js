/* global jQuery, NakamaDisc */
( function ( $ ) {
	'use strict';

	// Clic en un botón de promoción especial (o "usar fidelidad").
	$( document.body ).on( 'click', '.nakama-promo-btn', function ( e ) {
		e.preventDefault();
		var $btn  = $( this );
		var promo = $btn.data( 'promo' ) || '';
		var $group = $btn.closest( '.nakama-promo-group' );
		var $buttons = $group.find( '.nakama-promo-btn' );
		var $feedback = $group.siblings( '.nakama-promo-feedback' );

		if ( $group.attr( 'aria-busy' ) === 'true' ) {
			return;
		}
		$group.attr( 'aria-busy', 'true' );
		$buttons.prop( 'disabled', true );
		$feedback.removeClass( 'is-error' ).text( NakamaDisc.messages.updating );

		$.post( NakamaDisc.ajax_url, {
			action: 'nakama_select_promo',
			nonce:  NakamaDisc.nonce,
			promo:  promo
		} ).done( function () {
			// Actualizar el estado visual solo cuando el servidor confirmó que la
			// selección es elegible y retiró cualquier cupón nativo.
			$buttons.removeClass( 'is-active' ).attr( 'aria-pressed', 'false' );
			$btn.addClass( 'is-active' ).attr( 'aria-pressed', 'true' );
			$feedback.text( NakamaDisc.messages.updated );

			var restoreFocus = function () {
				$( '.nakama-promo-btn' ).filter( function () {
					return ( $( this ).data( 'promo' ) || '' ) === promo;
				} ).first().trigger( 'focus' );
			};
			$( document.body ).one( 'updated_checkout updated_wc_div', restoreFocus );

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
		} ).fail( function ( xhr ) {
			var response = xhr && xhr.responseJSON ? xhr.responseJSON : null;
			var message = response && response.data && response.data.message
				? response.data.message
				: NakamaDisc.messages.error;
			$feedback.addClass( 'is-error' ).text( message );
		} ).always( function () {
			$group.attr( 'aria-busy', 'false' );
			$buttons.prop( 'disabled', false );
		} );
	} );

	// El cambio de método de pago ya dispara update_checkout en WooCommerce,
	// lo que recalcula el descuento por transferencia server-side. No requiere
	// nada extra aquí, pero dejamos el hook por si quieres feedback visual.
	$( document.body ).on( 'payment_method_selected', function () {
		// noop: el server recalcula el 3% de transferencia.
	} );

} )( jQuery );
