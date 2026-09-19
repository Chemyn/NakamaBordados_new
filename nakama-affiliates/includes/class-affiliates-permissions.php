<?php
/**
 * Individual affiliate and VIP permissions in WordPress user profiles.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Permissions {
	const ACCESS_CAP = 'access_affiliate_dashboard';
	const VIP_CAP    = 'nakama_affiliate_vip';

	public static function init() {
		add_action( 'show_user_profile', array( __CLASS__, 'render_user_fields' ) );
		add_action( 'edit_user_profile', array( __CLASS__, 'render_user_fields' ) );
		add_action( 'personal_options_update', array( __CLASS__, 'save_user_fields' ) );
		add_action( 'edit_user_profile_update', array( __CLASS__, 'save_user_fields' ) );
	}

	public static function current_user_can_access() {
		return current_user_can( self::ACCESS_CAP ) || current_user_can( 'manage_woocommerce' );
	}

	public static function current_user_is_vip() {
		return self::current_user_can_access() && current_user_can( self::VIP_CAP );
	}

	public static function render_user_fields( $user ) {
		if ( ! current_user_can( 'edit_users' ) ) {
			return;
		}

		$has_access = user_can( $user, self::ACCESS_CAP );
		$has_vip = user_can( $user, self::VIP_CAP );
		$profile = Nakama_Affiliates_Repository::profile_by_user( (int) $user->ID );
		$suspended = $profile && isset( $profile['status'] ) && 'suspended' === $profile['status'];
		$discount_percentage = $profile && isset( $profile['discount_rate'] )
			? (float) $profile['discount_rate'] * 100
			: 10;
		wp_nonce_field( 'nakama_affiliate_user_cap', 'nakama_affiliate_user_cap_nonce' );
		?>
		<h2><?php esc_html_e( 'Programa de Afiliados', 'nakama-affiliates' ); ?></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><?php esc_html_e( 'Acceso al Panel de Afiliados', 'nakama-affiliates' ); ?></th>
				<td>
					<label>
						<input type="checkbox" name="nakama_affiliate_access" value="1" <?php checked( $has_access ); ?> />
						<?php esc_html_e( 'Permitir consultar su código, ventas, comisiones y programa mensual.', 'nakama-affiliates' ); ?>
					</label>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Afiliado VIP', 'nakama-affiliates' ); ?></th>
				<td>
					<label>
						<input type="checkbox" name="nakama_affiliate_vip" value="1" <?php checked( $has_vip ); ?> />
						<?php esc_html_e( 'Permitir solicitar productos de Drops y Edición especial cuando estén disponibles.', 'nakama-affiliates' ); ?>
					</label>
					<p class="description"><?php esc_html_e( 'Conceder VIP también concede acceso al panel; no aumenta el cupo mensual.', 'nakama-affiliates' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Suspensión operativa', 'nakama-affiliates' ); ?></th>
				<td>
					<label>
						<input type="checkbox" name="nakama_affiliate_suspended" value="1" <?php checked( $suspended ); ?> />
						<?php esc_html_e( 'Suspender temporalmente códigos, evidencias y solicitudes nuevas sin borrar el historial.', 'nakama-affiliates' ); ?>
					</label>
				</td>
			</tr>
			<?php if ( $profile ) : ?>
			<tr>
				<th scope="row"><label for="nakama-affiliate-code"><?php esc_html_e( 'Código de afiliado', 'nakama-affiliates' ); ?></label></th>
				<td>
					<input id="nakama-affiliate-code" name="nakama_affiliate_code" type="text" maxlength="24" value="<?php echo esc_attr( $profile['code'] ); ?>" class="regular-text" autocomplete="off" />
					<p class="description"><?php esc_html_e( 'Máximo 24 caracteres: letras, números, guion y guion bajo.', 'nakama-affiliates' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="nakama-affiliate-discount"><?php esc_html_e( 'Descuento del código', 'nakama-affiliates' ); ?></label></th>
				<td>
					<input id="nakama-affiliate-discount" name="nakama_affiliate_discount" type="number" min="0.01" max="10" step="0.01" value="<?php echo esc_attr( $discount_percentage ); ?>" /> %
					<p class="description"><?php esc_html_e( 'Mayor que 0 y topado a 10%. No se combina con otras promociones.', 'nakama-affiliates' ); ?></p>
				</td>
			</tr>
			<?php endif; ?>
		</table>
		<?php
	}

	public static function save_user_fields( $user_id ) {
		if ( ! current_user_can( 'edit_users' ) ) {
			return;
		}

		if (
			empty( $_POST['nakama_affiliate_user_cap_nonce'] ) ||
			! wp_verify_nonce(
				sanitize_text_field( wp_unslash( $_POST['nakama_affiliate_user_cap_nonce'] ) ),
				'nakama_affiliate_user_cap'
			)
		) {
			return;
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return;
		}

		$has_vip = ! empty( $_POST['nakama_affiliate_vip'] );
		$has_access = $has_vip || ! empty( $_POST['nakama_affiliate_access'] );
		$suspended = $has_access && ! empty( $_POST['nakama_affiliate_suspended'] );

		if ( $has_access ) {
			$user->add_cap( self::ACCESS_CAP );
		} else {
			$user->remove_cap( self::ACCESS_CAP );
		}

		if ( $has_vip ) {
			$user->add_cap( self::VIP_CAP );
		} else {
			$user->remove_cap( self::VIP_CAP );
		}

		$profile_id = Nakama_Affiliates_Profiles::synchronize_user( $user, $has_access, $suspended );
		$profile = $profile_id ? Nakama_Affiliates_Repository::profile_by_user( (int) $user_id ) : null;
		if (
			$profile &&
			isset( $_POST['nakama_affiliate_code'], $_POST['nakama_affiliate_discount'] )
		) {
			$settings_result = Nakama_Affiliates_Codes::update_profile_settings(
				$profile,
				sanitize_text_field( wp_unslash( $_POST['nakama_affiliate_code'] ) ),
				sanitize_text_field( wp_unslash( $_POST['nakama_affiliate_discount'] ) )
			);
			if ( empty( $settings_result['success'] ) && function_exists( 'add_settings_error' ) ) {
				add_settings_error( 'nakama_affiliates', 'invalid_affiliate_settings', $settings_result['message'], 'error' );
			}
		}
		if ( $profile_id ) {
			Nakama_Affiliates_Repository::audit(
				'permissions_updated',
				'affiliate',
				$profile_id,
				sprintf(
					'Acceso: %s; VIP: %s; suspensión: %s.',
					$has_access ? 'sí' : 'no',
					$has_vip ? 'sí' : 'no',
					$suspended ? 'sí' : 'no'
				)
			);
		}
	}
}
