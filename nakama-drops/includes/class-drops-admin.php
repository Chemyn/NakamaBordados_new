<?php
/**
 * WooCommerce administration screen for Drop campaigns.
 *
 * @package NakamaDrops
 */

final class Nakama_Drops_Admin {
	const PAGE = 'nakama-drops';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'admin_post_nakama_drops_save', array( __CLASS__, 'handle_save' ) );
		add_action( 'admin_post_nakama_drops_cancel', array( __CLASS__, 'handle_cancel' ) );
		add_action( 'admin_post_nakama_drops_schedule', array( __CLASS__, 'handle_schedule' ) );
		add_action( 'admin_post_nakama_drops_retry', array( __CLASS__, 'handle_retry' ) );
	}

	public static function register_menu() {
		add_menu_page(
			__( 'Nakama Drops', 'nakama-drops' ),
			__( 'Nakama Drops', 'nakama-drops' ),
			'manage_woocommerce',
			self::PAGE,
			array( __CLASS__, 'render' ),
			'dashicons-clock',
			56
		);
	}

	public static function enqueue_assets( $hook ) {
		if ( 'toplevel_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'woocommerce_admin_styles' );
		wp_enqueue_script( 'wc-enhanced-select' );
		wp_enqueue_style( 'nakama-drops-admin', NAKAMA_DROPS_URL . 'assets/admin.css', array(), NAKAMA_DROPS_VERSION );
		wp_enqueue_script( 'nakama-drops-admin', NAKAMA_DROPS_URL . 'assets/admin.js', array( 'jquery', 'wc-enhanced-select' ), NAKAMA_DROPS_VERSION, true );
	}

	public static function render() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		Nakama_Drops_Lifecycle::reconcile_due();
		$product_id = isset( $_GET['product_id'] ) ? absint( $_GET['product_id'] ) : 0;
		$product = $product_id ? wc_get_product( $product_id ) : null;
		$items = self::price_items( $product );
		?>
		<div class="wrap nakama-drops-admin">
			<header class="nakama-drops-admin__header">
				<div><p class="nakama-drops-admin__eyebrow">NAKAMA BORDADOS</p><h1><?php esc_html_e( 'Drops y preventas', 'nakama-drops' ); ?></h1></div>
				<p><?php esc_html_e( 'Programa el precio de preventa, el lanzamiento y el cupo desde un solo lugar.', 'nakama-drops' ); ?></p>
			</header>

			<?php self::render_notice(); ?>

			<section class="nakama-drops-panel">
				<h2><?php esc_html_e( 'Nueva campaña', 'nakama-drops' ); ?></h2>
				<form method="get" class="nakama-drops-product-loader">
					<input type="hidden" name="page" value="<?php echo esc_attr( self::PAGE ); ?>">
					<label for="nakama-drop-product"><?php esc_html_e( 'Producto', 'nakama-drops' ); ?></label>
					<select id="nakama-drop-product" class="wc-product-search" name="product_id" data-placeholder="<?php esc_attr_e( 'Buscar un producto…', 'nakama-drops' ); ?>" data-action="woocommerce_json_search_products_and_variations" data-allow_clear="true">
						<?php if ( $product ) : ?><option value="<?php echo esc_attr( $product_id ); ?>" selected><?php echo esc_html( $product->get_formatted_name() ); ?></option><?php endif; ?>
					</select>
					<button class="button"><?php esc_html_e( 'Configurar', 'nakama-drops' ); ?></button>
				</form>

				<?php if ( $product ) : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nakama-drops-form">
					<input type="hidden" name="action" value="nakama_drops_save">
					<input type="hidden" name="product_id" value="<?php echo esc_attr( $product_id ); ?>">
					<?php wp_nonce_field( 'nakama_drops_save' ); ?>

					<div class="nakama-drops-grid">
						<div>
							<h3><?php esc_html_e( 'Producto y lanzamiento', 'nakama-drops' ); ?></h3>
							<label><?php esc_html_e( 'Fecha y hora de lanzamiento', 'nakama-drops' ); ?><input type="datetime-local" name="launch_at_local" required></label>
							<p class="description"><?php echo esc_html( sprintf( __( 'Zona horaria: %s', 'nakama-drops' ), wp_timezone_string() ) ); ?></p>
							<label class="nakama-drops-check"><input type="checkbox" name="unlimited" value="1" checked data-drop-unlimited> <?php esc_html_e( 'Preventa ilimitada', 'nakama-drops' ); ?></label>
							<label data-drop-capacity hidden><?php esc_html_e( 'Prendas disponibles en preventa', 'nakama-drops' ); ?><input type="number" min="1" step="1" name="capacity"></label>
							<label><?php esc_html_e( 'Posición del contador', 'nakama-drops' ); ?>
								<select name="timer_position"><option value="overlay"><?php esc_html_e( 'Sobre la imagen', 'nakama-drops' ); ?></option><option value="below"><?php esc_html_e( 'Debajo de la tarjeta', 'nakama-drops' ); ?></option></select>
							</label>
						</div>
						<aside>
							<h3><?php esc_html_e( 'Qué ocurrirá', 'nakama-drops' ); ?></h3>
							<ol><li><?php esc_html_e( 'Se publicará como preventa en DROPS.', 'nakama-drops' ); ?></li><li><?php esc_html_e( 'Se cobrará el precio especial hasta la fecha indicada.', 'nakama-drops' ); ?></li><li><?php esc_html_e( 'Al lanzar, pasará a Ya disponible y al precio final.', 'nakama-drops' ); ?></li></ol>
						</aside>
					</div>

					<div class="nakama-drops-prices">
						<h3><?php esc_html_e( 'Precios', 'nakama-drops' ); ?></h3>
						<?php if ( count( $items ) > 1 ) : ?>
						<div class="nakama-drops-price-bulk"><label><?php esc_html_e( 'Preventa general', 'nakama-drops' ); ?><input type="number" min="0.01" step="0.01" data-drop-general-presale></label><label><?php esc_html_e( 'Lanzamiento general', 'nakama-drops' ); ?><input type="number" min="0.01" step="0.01" data-drop-general-launch></label><button type="button" class="button" data-drop-apply><?php esc_html_e( 'Aplicar a todas', 'nakama-drops' ); ?></button></div>
						<?php endif; ?>
						<div class="nakama-drops-price-list">
						<?php foreach ( $items as $item ) : ?>
							<div class="nakama-drops-price-row">
								<strong><?php echo esc_html( $item['label'] ); ?></strong>
								<label><?php esc_html_e( 'Preventa', 'nakama-drops' ); ?><input type="number" min="0.01" step="0.01" name="prices[<?php echo esc_attr( $item['id'] ); ?>][presale]" required data-drop-presale></label>
								<label><?php esc_html_e( 'Precio al lanzamiento', 'nakama-drops' ); ?><input type="number" min="0.01" step="0.01" name="prices[<?php echo esc_attr( $item['id'] ); ?>][launch]" value="<?php echo esc_attr( $item['regular'] ); ?>" required data-drop-launch></label>
							</div>
						<?php endforeach; ?>
						</div>
					</div>
					<div class="nakama-drops-actions"><button class="button" name="campaign_action" value="draft"><?php esc_html_e( 'Guardar borrador', 'nakama-drops' ); ?></button><button class="button button-primary" name="campaign_action" value="schedule"><?php esc_html_e( 'Programar DROP', 'nakama-drops' ); ?></button></div>
				</form>
				<?php endif; ?>
			</section>

			<section class="nakama-drops-panel">
				<h2><?php esc_html_e( 'Campañas', 'nakama-drops' ); ?></h2>
				<?php self::render_campaigns(); ?>
			</section>
		</div>
		<?php
	}

	public static function handle_save() {
		self::guard( 'nakama_drops_save' );
		$raw_prices = isset( $_POST['prices'] ) ? (array) wp_unslash( $_POST['prices'] ) : array();
		$prices = array();
		foreach ( $raw_prices as $item_id => $price ) {
			$prices[] = array(
				'item_id'  => absint( $item_id ),
				'presale'  => isset( $price['presale'] ) ? wc_clean( $price['presale'] ) : '',
				'launch'   => isset( $price['launch'] ) ? wc_clean( $price['launch'] ) : '',
			);
		}
		$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$normalized = Nakama_Drops_Domain::validate_configuration( array(
			'product_id'      => $product_id,
			'launch_at_local' => isset( $_POST['launch_at_local'] ) ? sanitize_text_field( wp_unslash( $_POST['launch_at_local'] ) ) : '',
			'timezone'        => wp_timezone_string() ?: 'UTC',
			'capacity'        => isset( $_POST['unlimited'] ) ? null : ( isset( $_POST['capacity'] ) ? sanitize_text_field( wp_unslash( $_POST['capacity'] ) ) : '' ),
			'timer_position'  => isset( $_POST['timer_position'] ) ? sanitize_key( wp_unslash( $_POST['timer_position'] ) ) : 'overlay',
			'prices'          => $prices,
		), new DateTimeImmutable( 'now', new DateTimeZone( 'UTC' ) ) );

		if ( ! empty( $normalized['errors'] ) ) {
			self::redirect( 'error', implode( ',', $normalized['errors'] ), $product_id );
		}
		if ( Nakama_Drops_Repository::active_for_product( $product_id ) ) {
			self::redirect( 'error', 'active_campaign_exists', $product_id );
		}

		$action = isset( $_POST['campaign_action'] ) && 'draft' === $_POST['campaign_action'] ? 'draft' : 'schedule';
		$campaign_id = Nakama_Drops_Repository::create( $normalized['campaign'], $normalized['prices'], 'draft' === $action ? 'draft' : 'scheduled' );
		if ( ! $campaign_id ) {
			self::redirect( 'error', 'storage_error', $product_id );
		}
		if ( 'schedule' === $action ) {
			try {
				Nakama_Drops_Lifecycle::schedule( $campaign_id );
			} catch ( Throwable $error ) {
				Nakama_Drops_Repository::update_status( $campaign_id, 'error', $error->getMessage() );
				self::redirect( 'error', 'schedule_error', $product_id );
			}
		}
		self::redirect( 'saved', (string) $campaign_id );
	}

	public static function handle_cancel() {
		self::guard( 'nakama_drops_cancel' );
		$campaign_id = isset( $_GET['campaign_id'] ) ? absint( $_GET['campaign_id'] ) : 0;
		self::redirect( Nakama_Drops_Lifecycle::cancel( $campaign_id ) ? 'cancelled' : 'error', 'cancel_failed' );
	}

	public static function handle_schedule() {
		self::guard( 'nakama_drops_schedule' );
		$campaign_id = isset( $_GET['campaign_id'] ) ? absint( $_GET['campaign_id'] ) : 0;
		$campaign = Nakama_Drops_Repository::get( $campaign_id );
		if ( ! $campaign || 'draft' !== $campaign['status'] || Nakama_Drops_Repository::active_for_product( (int) $campaign['product_id'] ) ) {
			self::redirect( 'error', 'schedule_failed' );
		}
		try {
			$scheduled = Nakama_Drops_Lifecycle::schedule( $campaign_id );
		} catch ( Throwable $error ) {
			Nakama_Drops_Repository::update_status( $campaign_id, 'error', $error->getMessage() );
			$scheduled = false;
		}
		self::redirect( $scheduled ? 'saved' : 'error', 'schedule_failed' );
	}

	public static function handle_retry() {
		self::guard( 'nakama_drops_retry' );
		$campaign_id = isset( $_GET['campaign_id'] ) ? absint( $_GET['campaign_id'] ) : 0;
		self::redirect( Nakama_Drops_Lifecycle::retry( $campaign_id ) ? 'saved' : 'error', 'retry_failed' );
	}

	private static function price_items( $product ) {
		if ( ! $product ) {
			return array();
		}
		if ( $product->is_type( 'variable' ) ) {
			$items = array();
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation ) {
					$items[] = array( 'id' => $variation_id, 'label' => wc_get_formatted_variation( $variation, true, false, true ), 'regular' => $variation->get_regular_price() );
				}
			}
			return $items;
		}
		return array( array( 'id' => $product->get_id(), 'label' => $product->get_name(), 'regular' => $product->get_regular_price() ) );
	}

	private static function render_campaigns() {
		$campaigns = Nakama_Drops_Repository::admin_campaigns();
		if ( empty( $campaigns ) ) {
			echo '<p>' . esc_html__( 'Todavía no hay campañas.', 'nakama-drops' ) . '</p>';
			return;
		}
		echo '<div class="nakama-drops-table"><table class="widefat striped"><thead><tr><th>' . esc_html__( 'Producto', 'nakama-drops' ) . '</th><th>' . esc_html__( 'Estado', 'nakama-drops' ) . '</th><th>' . esc_html__( 'Lanzamiento', 'nakama-drops' ) . '</th><th>' . esc_html__( 'Cupo', 'nakama-drops' ) . '</th><th>' . esc_html__( 'Contador', 'nakama-drops' ) . '</th><th>' . esc_html__( 'Acciones', 'nakama-drops' ) . '</th></tr></thead><tbody>';
		foreach ( $campaigns as $campaign ) {
			$product = wc_get_product( (int) $campaign['product_id'] );
			$capacity = null === $campaign['capacity'] ? __( 'Ilimitado', 'nakama-drops' ) : sprintf( '%d / %d', (int) $campaign['reserved'], (int) $campaign['capacity'] );
			$actions = '';
			if ( 'draft' === $campaign['status'] ) {
				$actions = '<a href="' . esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nakama_drops_schedule&campaign_id=' . (int) $campaign['id'] ), 'nakama_drops_schedule' ) ) . '">' . esc_html__( 'Programar', 'nakama-drops' ) . '</a>';
			} elseif ( 'scheduled' === $campaign['status'] ) {
				$actions = '<a href="' . esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nakama_drops_cancel&campaign_id=' . (int) $campaign['id'] ), 'nakama_drops_cancel' ) ) . '">' . esc_html__( 'Cancelar', 'nakama-drops' ) . '</a>';
			} elseif ( 'error' === $campaign['status'] ) {
				$actions = '<a href="' . esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nakama_drops_retry&campaign_id=' . (int) $campaign['id'] ), 'nakama_drops_retry' ) ) . '">' . esc_html__( 'Reintentar', 'nakama-drops' ) . '</a>';
			}
			echo '<tr><td><strong>' . esc_html( $product ? $product->get_name() : '#' . (int) $campaign['product_id'] ) . '</strong></td><td><span class="nakama-drop-state nakama-drop-state--' . esc_attr( $campaign['status'] ) . '">' . esc_html( ucfirst( $campaign['status'] ) ) . '</span>' . ( $campaign['last_error'] ? '<small>' . esc_html( $campaign['last_error'] ) . '</small>' : '' ) . '</td><td>' . esc_html( get_date_from_gmt( $campaign['launch_at_gmt'], 'd/m/Y H:i' ) ) . '</td><td>' . esc_html( $capacity ) . '</td><td>' . esc_html( 'below' === $campaign['timer_position'] ? __( 'Debajo', 'nakama-drops' ) : __( 'Sobre imagen', 'nakama-drops' ) ) . '</td><td>' . $actions . '</td></tr>';
		}
		echo '</tbody></table></div>';
	}

	private static function render_notice() {
		if ( empty( $_GET['drop_notice'] ) ) {
			return;
		}
		$type = 'error' === $_GET['drop_notice'] ? 'notice-error' : 'notice-success';
		$message = 'error' === $_GET['drop_notice'] ? __( 'No se pudo guardar. Revisa la fecha, el cupo y que cada precio de preventa sea menor que el de lanzamiento.', 'nakama-drops' ) : __( 'La campaña se guardó correctamente.', 'nakama-drops' );
		echo '<div class="notice ' . esc_attr( $type ) . ' is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
	}

	private static function guard( $action ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'No tienes permisos para administrar Drops.', 'nakama-drops' ) );
		}
		check_admin_referer( $action );
	}

	private static function redirect( $notice, $detail = '', $product_id = 0 ) {
		$url = add_query_arg( array_filter( array( 'page' => self::PAGE, 'drop_notice' => $notice, 'drop_detail' => $detail, 'product_id' => $product_id ) ), admin_url( 'admin.php' ) );
		wp_safe_redirect( $url );
		exit;
	}
}
