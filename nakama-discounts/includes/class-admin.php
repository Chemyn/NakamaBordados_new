<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Administración: WooCommerce > Nakama Descuentos.
 * Incluye el apartado dedicado de CAMPAÑAS ESPECIALES (activar/desactivar)
 * con estado en vivo, más los parámetros generales y el aviso de Mi Cuenta.
 */
class Nakama_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	public static function menu() {
		add_submenu_page(
			'woocommerce',
			'Nakama Descuentos',
			'Nakama Descuentos',
			'manage_woocommerce',
			'nakama-discounts',
			array( __CLASS__, 'render' )
		);
	}

	public static function register() {
		register_setting( 'nakama_discounts_group', NAKAMA_DISC_OPTION, array(
			'sanitize_callback' => array( __CLASS__, 'sanitize' ),
		) );
	}

	public static function sanitize( $input ) {
		$out = Nakama_Settings::all();

		$checkboxes = array(
			'welcome_enabled', 'welcome_account_only',
			'special_10_enabled', 'special_3x2_enabled', 'special_auto_if_better',
			'free_ship_enabled', 'transfer_enabled', 'msi_enabled',
			'account_notice_enabled', 'account_notice_complete',
		);
		foreach ( $checkboxes as $c ) {
			$out[ $c ] = isset( $input[ $c ] ) ? 'yes' : 'no';
		}

		$floats = array(
			'welcome_rate_1', 'welcome_rate_2', 'welcome_rate_3',
			'special_10_rate', 'transfer_rate',
			'free_ship_threshold', 'free_ship_cap',
			'msi_3_threshold', 'msi_6_threshold',
		);
		foreach ( $floats as $f ) {
			if ( isset( $input[ $f ] ) ) {
				$out[ $f ] = (float) $input[ $f ];
			}
		}

		foreach ( array( 'welcome_days_2', 'welcome_days_3' ) as $i ) {
			if ( isset( $input[ $i ] ) ) {
				$out[ $i ] = (int) $input[ $i ];
			}
		}

		$texts = array(
			'transfer_gateway_id',
			'special_10_start', 'special_10_end',
			'special_3x2_start', 'special_3x2_end',
		);
		foreach ( $texts as $t ) {
			if ( isset( $input[ $t ] ) ) {
				$out[ $t ] = sanitize_text_field( $input[ $t ] );
			}
		}

		if ( isset( $input['special_3x2_categories'] ) ) {
			$out['special_3x2_categories'] = array_filter( array_map( 'sanitize_title',
				array_map( 'trim', explode( ',', $input['special_3x2_categories'] ) )
			) );
		}

		// Overrides por moneda (texto "USD:80" -> array).
		foreach ( array( 'free_ship_threshold_map', 'free_ship_cap_map', 'msi_3_threshold_map', 'msi_6_threshold_map' ) as $mk ) {
			if ( isset( $input[ $mk ] ) ) {
				$out[ $mk ] = Nakama_Settings::parse_currency_map( $input[ $mk ] );
			}
		}

		return $out;
	}

	/** Pill de estado en vivo para una campaña. */
	private static function status_pill( $active ) {
		if ( $active ) {
			return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600;">● Activa ahora</span>';
		}
		return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-size:12px;font-weight:600;">○ Inactiva</span>';
	}

	public static function render() {
		$s   = Nakama_Settings::all();
		$opt = NAKAMA_DISC_OPTION;
		$cb  = function ( $key ) use ( $s ) {
			return checked( 'yes', $s[ $key ], false );
		};
		?>
		<div class="wrap">
			<h1>Nakama Descuentos</h1>
			<form method="post" action="options.php">
				<?php settings_fields( 'nakama_discounts_group' ); ?>

				<!-- ================= CAMPAÑAS ESPECIALES ================= -->
				<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin:16px 0;">
					<h2 style="margin-top:0;">🔥 Campañas especiales</h2>
					<p class="description">Activa o desactiva las promociones especiales. Si defines fechas, la campaña se enciende sola dentro del rango.</p>

					<table class="form-table">
						<tr>
							<th>Especial 10% <br><?php echo self::status_pill( Nakama_Campaigns::special_10_active() ); ?></th>
							<td>
								<label style="font-weight:600;">
									<input type="checkbox" name="<?php echo $opt; ?>[special_10_enabled]" <?php echo $cb('special_10_enabled'); ?>>
									Activar 10% de descuento especial
								</label>
								<p>Agenda opcional:
									desde <input type="date" name="<?php echo $opt; ?>[special_10_start]" value="<?php echo esc_attr($s['special_10_start']); ?>">
									hasta <input type="date" name="<?php echo $opt; ?>[special_10_end]" value="<?php echo esc_attr($s['special_10_end']); ?>">
								</p>
							</td>
						</tr>
						<tr>
							<th>3x2 por categoría <br><?php echo self::status_pill( Nakama_Campaigns::special_3x2_active() ); ?></th>
							<td>
								<label style="font-weight:600;">
									<input type="checkbox" name="<?php echo $opt; ?>[special_3x2_enabled]" <?php echo $cb('special_3x2_enabled'); ?>>
									Activar 3x2 (la prenda gratis es la de menor precio)
								</label>
								<p>Categorías (slugs separados por coma):
									<input type="text" class="regular-text" name="<?php echo $opt; ?>[special_3x2_categories]" value="<?php echo esc_attr( implode( ',', (array) $s['special_3x2_categories'] ) ); ?>">
								</p>
								<p>Agenda opcional:
									desde <input type="date" name="<?php echo $opt; ?>[special_3x2_start]" value="<?php echo esc_attr($s['special_3x2_start']); ?>">
									hasta <input type="date" name="<?php echo $opt; ?>[special_3x2_end]" value="<?php echo esc_attr($s['special_3x2_end']); ?>">
								</p>
							</td>
						</tr>
						<tr>
							<th>Auto-aplicar la mejor</th>
							<td><label><input type="checkbox" name="<?php echo $opt; ?>[special_auto_if_better]" <?php echo $cb('special_auto_if_better'); ?>>
								Aplicar la promo especial sin botón si conviene más que la fidelidad</label></td>
						</tr>
					</table>
				</div>

				<!-- ================= BIENVENIDA / FIDELIDAD ================= -->
				<h2>Bienvenida / Fidelidad (automático)</h2>
				<table class="form-table">
					<tr><th>Activo</th><td><label><input type="checkbox" name="<?php echo $opt; ?>[welcome_enabled]" <?php echo $cb('welcome_enabled'); ?>> Habilitar escalera 5/10/20%</label></td></tr>
					<tr><th>Solo usuarios con cuenta</th><td><label><input type="checkbox" name="<?php echo $opt; ?>[welcome_account_only]" <?php echo $cb('welcome_account_only'); ?>> La fidelidad solo aplica a clientes registrados (recomendado)</label></td></tr>
					<tr><th>Días vigencia 2a compra</th><td><input type="number" name="<?php echo $opt; ?>[welcome_days_2]" value="<?php echo esc_attr($s['welcome_days_2']); ?>"></td></tr>
					<tr><th>Días vigencia 3a compra</th><td><input type="number" name="<?php echo $opt; ?>[welcome_days_3]" value="<?php echo esc_attr($s['welcome_days_3']); ?>"></td></tr>
				</table>

				<!-- ================= AVISO EN MI CUENTA ================= -->
				<h2>Aviso en “Mi Cuenta”</h2>
				<table class="form-table">
					<tr><th>Mostrar aviso</th><td><label><input type="checkbox" name="<?php echo $opt; ?>[account_notice_enabled]" <?php echo $cb('account_notice_enabled'); ?>> Avisar al cliente del descuento disponible y del siguiente nivel</label></td></tr>
					<tr><th>Mensaje al terminar</th><td><label><input type="checkbox" name="<?php echo $opt; ?>[account_notice_complete]" <?php echo $cb('account_notice_complete'); ?>> Mostrar un mensaje de agradecimiento al completar la escalera</label></td></tr>
				</table>

				<!-- ================= MODIFICADORES ================= -->
				<h2>Modificadores</h2>
				<table class="form-table">
					<tr><th>Envío gratis</th><td>
						<label><input type="checkbox" name="<?php echo $opt; ?>[free_ship_enabled]" <?php echo $cb('free_ship_enabled'); ?>> Activar</label>
						desde $<input type="number" step="0.01" name="<?php echo $opt; ?>[free_ship_threshold]" value="<?php echo esc_attr($s['free_ship_threshold']); ?>">
						tope $<input type="number" step="0.01" name="<?php echo $opt; ?>[free_ship_cap]" value="<?php echo esc_attr($s['free_ship_cap']); ?>">
						<p class="description">Overrides por moneda (ej. <code>USD:80</code>, separa con coma):</p>
						umbral: <input type="text" class="regular-text" name="<?php echo $opt; ?>[free_ship_threshold_map]" value="<?php echo esc_attr( Nakama_Settings::currency_map_to_string( $s['free_ship_threshold_map'] ) ); ?>" placeholder="USD:80">
						tope: <input type="text" class="regular-text" name="<?php echo $opt; ?>[free_ship_cap_map]" value="<?php echo esc_attr( Nakama_Settings::currency_map_to_string( $s['free_ship_cap_map'] ) ); ?>" placeholder="USD:8">
					</td></tr>
					<tr><th>Transferencia</th><td>
						<label><input type="checkbox" name="<?php echo $opt; ?>[transfer_enabled]" <?php echo $cb('transfer_enabled'); ?>> Activar</label>
						<input type="number" step="0.01" name="<?php echo $opt; ?>[transfer_rate]" value="<?php echo esc_attr($s['transfer_rate']); ?>"> (0.03 = 3%)
						gateway id: <input type="text" name="<?php echo $opt; ?>[transfer_gateway_id]" value="<?php echo esc_attr($s['transfer_gateway_id']); ?>">
					</td></tr>
					<tr><th>MSI</th><td>
						<label><input type="checkbox" name="<?php echo $opt; ?>[msi_enabled]" <?php echo $cb('msi_enabled'); ?>> Activar</label>
						3 MSI desde $<input type="number" step="0.01" name="<?php echo $opt; ?>[msi_3_threshold]" value="<?php echo esc_attr($s['msi_3_threshold']); ?>">
						6 MSI desde $<input type="number" step="0.01" name="<?php echo $opt; ?>[msi_6_threshold]" value="<?php echo esc_attr($s['msi_6_threshold']); ?>">
						<p class="description">Overrides por moneda (ej. <code>USD:110</code>):</p>
						3 MSI: <input type="text" name="<?php echo $opt; ?>[msi_3_threshold_map]" value="<?php echo esc_attr( Nakama_Settings::currency_map_to_string( $s['msi_3_threshold_map'] ) ); ?>" placeholder="USD:110">
						6 MSI: <input type="text" name="<?php echo $opt; ?>[msi_6_threshold_map]" value="<?php echo esc_attr( Nakama_Settings::currency_map_to_string( $s['msi_6_threshold_map'] ) ); ?>" placeholder="USD:165">
					</td></tr>
				</table>

				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
