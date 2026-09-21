<?php
declare(strict_types=1);

function affiliates_admin_ui_assert( $condition, string $message ): void {
	if ( ! $condition ) throw new RuntimeException( $message );
}

$root = dirname( __DIR__ ) . '/nakama-affiliates/';
$php = file_get_contents( $root . 'includes/class-affiliates-admin.php' );
$css = file_get_contents( $root . 'assets/admin.css' );
$js = file_get_contents( $root . 'assets/admin.js' );

foreach ( array( 'Resumen', 'Afiliados', 'Documentos', 'Ventas', 'Cierres / Pagos', 'Prendas', 'Evidencias', 'Configuración' ) as $label ) {
	affiliates_admin_ui_assert( false !== strpos( $php, $label ), 'The admin navigation includes ' . $label . '.' );
}
foreach ( array( 'Constancias pendientes', 'Reembolsos por revisar', 'Cierres por aprobar', 'Pagos pendientes' ) as $label ) {
	affiliates_admin_ui_assert( false !== strpos( $php, $label ), 'The operations summary includes ' . $label . '.' );
}
foreach ( array( 'affiliate_code', 'discount_percentage', 'profile_status', 'affiliate_vip' ) as $field ) {
	affiliates_admin_ui_assert( false !== strpos( $php, 'name="' . $field . '"' ), 'Affiliate records expose the safe field ' . $field . '.' );
}
affiliates_admin_ui_assert( false === stripos( $php, 'password' ), 'The affiliate admin never renders passwords or secrets.' );
affiliates_admin_ui_assert( false !== strpos( $php, 'Vista previa del cierre' ), 'Closure preview is visible before confirmation.' );
affiliates_admin_ui_assert( false !== strpos( $php, 'name="confirmed"' ), 'Closing and approval retain a server-verifiable confirmation.' );
affiliates_admin_ui_assert( false !== strpos( $php, 'name="reason"' ) && false !== strpos( $php, 'required' ), 'Rejections and manual adjustments request a reason.' );
affiliates_admin_ui_assert( substr_count( $php, "render_delivery_placeholder( '" ) >= 2 && false !== strpos( $php, 'Disponible en Entrega 3' ), 'Future garments and evidence sections explain their staged availability.' );
affiliates_admin_ui_assert( false !== strpos( $css, ':focus-visible' ), 'Keyboard focus is visible in the panel.' );
affiliates_admin_ui_assert( preg_match( '/min-height:\s*44px/', $css ) === 1, 'Interactive controls preserve a 44px target.' );
affiliates_admin_ui_assert( false !== strpos( $css, '@media (max-width: 782px)' ), 'Admin tables adapt to mobile screens.' );
affiliates_admin_ui_assert( false !== strpos( $js, 'data-nakama-confirm' ), 'JavaScript adds confirmation copy only as progressive enhancement.' );
affiliates_admin_ui_assert( false === strpos( $js, 'fetch(' ), 'Economic actions do not depend on JavaScript requests.' );

echo "PHP Nakama Affiliates admin UI tests passed.\n";
