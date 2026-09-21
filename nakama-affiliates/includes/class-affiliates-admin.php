<?php
/**
 * WordPress operations panel for the affiliate program.
 *
 * @package NakamaAffiliates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nakama_Affiliates_Admin {
	const SLUG         = 'nakama-affiliates';
	const CAPABILITY   = 'manage_woocommerce';
	const NONCE_ACTION = 'nakama_affiliates_admin_action';
	const NONCE_FIELD  = 'nakama_affiliates_nonce';
	const PER_PAGE     = 20;

	const TABS = array(
		'summary'    => 'Resumen',
		'affiliates' => 'Afiliados',
		'documents'  => 'Documentos',
		'sales'      => 'Ventas',
		'closures'   => 'Cierres / Pagos',
		'garments'   => 'Prendas',
		'evidence'   => 'Evidencias',
		'settings'   => 'Configuración',
	);

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'admin_post_nakama_affiliates_action', array( __CLASS__, 'handle_action' ) );
	}

	public static function menu() {
		return add_menu_page(
			'Operación de Afiliados',
			'Afiliados',
			self::CAPABILITY,
			self::SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-groups',
			56
		);
	}

	public static function enqueue_assets( $hook ) {
		if ( 'toplevel_page_' . self::SLUG !== $hook ) return;
		wp_enqueue_style( 'nakama-affiliates-admin', NAKAMA_AFFILIATES_URL . 'assets/admin.css', array(), NAKAMA_AFFILIATES_VERSION );
		wp_enqueue_script( 'nakama-affiliates-admin', NAKAMA_AFFILIATES_URL . 'assets/admin.js', array(), NAKAMA_AFFILIATES_VERSION, true );
	}

	public static function render() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'No tienes permisos para operar el programa de afiliados.', 'nakama-affiliates' ) );
		}
		$tab = self::current_tab();
		?>
		<div class="wrap nakama-affiliates-admin">
			<header class="nka-admin-hero">
				<p class="nka-kicker">Nakama Bordados</p>
				<h1>Operación de Afiliados</h1>
				<p>Ventas, expediente fiscal, cierres mensuales y beneficios en un solo lugar.</p>
			</header>
			<?php self::render_notice(); ?>
			<nav class="nav-tab-wrapper nka-tabs" aria-label="Secciones del programa de afiliados">
				<?php foreach ( self::TABS as $key => $label ) : ?>
					<a class="nav-tab <?php echo $tab === $key ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( self::tab_url( $key ) ); ?>" <?php echo $tab === $key ? 'aria-current="page"' : ''; ?>><?php echo esc_html( $label ); ?></a>
				<?php endforeach; ?>
			</nav>
			<main class="nka-panel" id="nka-admin-content">
				<?php
				switch ( $tab ) {
					case 'affiliates': self::render_affiliates(); break;
					case 'documents': self::render_documents(); break;
					case 'sales': self::render_sales(); break;
					case 'closures': self::render_closures(); break;
					case 'garments': self::render_garments(); break;
					case 'evidence': self::render_delivery_placeholder( 'Evidencias' ); break;
					case 'settings': self::render_settings(); break;
					default: self::render_summary();
				}
				?>
			</main>
		</div>
		<?php
	}

	private static function render_summary() {
		$cards = array(
			array( 'label' => 'Constancias pendientes', 'count' => self::count_rows( 'documents', "document_type = 'fiscal' AND is_current = 1 AND status = 'pending'" ), 'tab' => 'documents' ),
			array( 'label' => 'Reembolsos por revisar', 'count' => self::count_rows( 'ledger', "status = 'review'" ), 'tab' => 'sales' ),
			array( 'label' => 'Cierres por aprobar', 'count' => self::count_rows( 'closures', "status = 'closed'" ), 'tab' => 'closures' ),
			array( 'label' => 'Pagos pendientes', 'count' => self::count_rows( 'closures', "status = 'approved'" ), 'tab' => 'closures' ),
			array( 'label' => 'Prendas por aprobar', 'count' => self::count_rows( 'requests', "status = 'submitted'" ), 'tab' => 'garments' ),
		);
		?>
		<section aria-labelledby="nka-summary-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Atención operativa</p><h2 id="nka-summary-title">Resumen</h2></div></div>
			<div class="nka-summary-grid">
				<?php foreach ( $cards as $card ) : ?>
				<a class="nka-summary-card" href="<?php echo esc_url( self::tab_url( $card['tab'] ) ); ?>">
					<span><?php echo esc_html( $card['label'] ); ?></span>
					<strong><?php echo esc_html( (string) $card['count'] ); ?></strong>
					<small>Revisar sección</small>
				</a>
				<?php endforeach; ?>
			</div>
			<div class="nka-info-box"><strong>Regla fiscal de esta versión:</strong> ISR, IVA y otros ajustes se capturan como importes indicados por administración. El sistema no calcula tasas ni sustituye la revisión del contador.</div>
		</section>
		<?php
	}

	private static function render_affiliates() {
		$status = self::query_value( 'status' );
		$data = self::paged_rows( 'profiles', $status ? array( 'status' => $status ) : array(), 'id DESC' );
		?>
		<section aria-labelledby="nka-affiliates-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Perfiles y permisos</p><h2 id="nka-affiliates-title">Afiliados</h2></div></div>
			<?php self::render_status_filter( 'affiliates', array( '' => 'Todos', 'active' => 'Activos', 'suspended' => 'Suspendidos', 'inactive' => 'Inactivos' ), $status ); ?>
			<div class="nka-card-stack">
			<?php if ( ! $data['items'] ) : ?><p class="nka-empty">No hay perfiles con este filtro.</p><?php endif; ?>
			<?php foreach ( $data['items'] as $profile ) :
				$user = get_userdata( (int) $profile['user_id'] );
				$vip = $user && user_can( $user, Nakama_Affiliates_Permissions::VIP_CAP );
				?>
				<article class="nka-record-card">
					<header><div><span class="nka-status nka-status-<?php echo esc_attr( $profile['status'] ); ?>"><?php echo esc_html( $profile['status'] ); ?></span><h3><?php echo esc_html( $user ? $user->display_name : 'Usuario #' . $profile['user_id'] ); ?></h3></div><a href="<?php echo esc_url( get_edit_user_link( (int) $profile['user_id'] ) ); ?>">Abrir usuario</a></header>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-form-grid">
						<?php self::mutation_fields( 'save_profile' ); ?>
						<input type="hidden" name="affiliate_id" value="<?php echo esc_attr( $profile['id'] ); ?>" />
						<label>Código<input name="affiliate_code" maxlength="24" value="<?php echo esc_attr( $profile['code'] ); ?>" required /></label>
						<label>Descuento máximo<input name="discount_percentage" type="number" min="0.01" max="10" step="0.01" value="<?php echo esc_attr( (float) $profile['discount_rate'] * 100 ); ?>" required /></label>
						<label>Estado<select name="profile_status"><option value="active" <?php selected( $profile['status'], 'active' ); ?>>Activo</option><option value="suspended" <?php selected( $profile['status'], 'suspended' ); ?>>Suspendido</option><option value="inactive" <?php selected( $profile['status'], 'inactive' ); ?>>Inactivo</option></select></label>
						<label class="nka-check"><input name="affiliate_vip" type="checkbox" value="1" <?php checked( $vip ); ?> /> Afiliado VIP</label>
						<button class="button button-primary" type="submit">Guardar perfil</button>
					</form>
				</article>
			<?php endforeach; ?>
			</div>
			<?php self::render_pagination( $data, 'affiliates' ); ?>
		</section>
		<?php
	}

	private static function render_documents() {
		$status = self::query_value( 'status' );
		$filters = array( 'document_type' => 'fiscal', 'is_current' => 1 );
		if ( $status ) $filters['status'] = $status;
		$data = self::paged_rows( 'documents', $filters, 'uploaded_at_gmt DESC' );
		?>
		<section aria-labelledby="nka-documents-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Expediente privado</p><h2 id="nka-documents-title">Documentos</h2></div></div>
			<?php self::render_status_filter( 'documents', array( '' => 'Todos', 'pending' => 'Pendientes', 'approved' => 'Aprobados', 'rejected' => 'Rechazados' ), $status ); ?>
			<div class="nka-table-wrap"><table class="widefat striped"><thead><tr><th>Afiliado</th><th>Archivo</th><th>Recepción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
			<?php if ( ! $data['items'] ) : ?><tr><td colspan="5">No hay constancias con este filtro.</td></tr><?php endif; ?>
			<?php foreach ( $data['items'] as $document ) : ?>
			<tr><td>#<?php echo esc_html( $document['affiliate_id'] ); ?></td><td><?php echo esc_html( $document['original_name'] ); ?></td><td><?php echo esc_html( $document['uploaded_at_gmt'] ); ?></td><td><span class="nka-status nka-status-<?php echo esc_attr( $document['status'] ); ?>"><?php echo esc_html( $document['status'] ); ?></span></td><td class="nka-actions">
				<a class="button" href="<?php echo esc_url( self::document_download_url( (int) $document['id'] ) ); ?>">Descargar</a>
				<?php if ( 'pending' === $document['status'] ) : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"><?php self::mutation_fields( 'review_document' ); ?><input type="hidden" name="document_id" value="<?php echo esc_attr( $document['id'] ); ?>" /><input type="hidden" name="review_status" value="approved" /><button class="button button-primary" type="submit">Aprobar</button></form>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-reject-form"><?php self::mutation_fields( 'review_document' ); ?><input type="hidden" name="document_id" value="<?php echo esc_attr( $document['id'] ); ?>" /><input type="hidden" name="review_status" value="rejected" /><label>Motivo del rechazo<textarea name="reason" required></textarea></label><button class="button" type="submit">Rechazar</button></form>
				<?php endif; ?>
			</td></tr>
			<?php endforeach; ?>
			</tbody></table></div>
			<?php self::render_pagination( $data, 'documents' ); ?>
		</section>
		<?php
	}

	private static function render_sales() {
		$period = self::query_value( 'period' );
		$status = self::query_value( 'status' );
		$filters = array();
		if ( preg_match( '/^\d{4}-\d{2}$/', $period ) ) $filters['period_key'] = $period;
		if ( in_array( $status, array( 'posted', 'review' ), true ) ) $filters['status'] = $status;
		$data = self::paged_rows( 'ledger', $filters, 'occurred_at_gmt DESC' );
		?>
		<section aria-labelledby="nka-sales-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Ledger auditable</p><h2 id="nka-sales-title">Ventas</h2></div></div>
			<?php self::render_period_status_filter( 'sales', $period, $status, array( '' => 'Todos', 'posted' => 'Contabilizados', 'review' => 'Por revisar' ) ); ?>
			<div class="nka-table-wrap"><table class="widefat striped"><thead><tr><th>Evento</th><th>Afiliado</th><th>Pedido</th><th>Periodo</th><th>Base MXN</th><th>Comisión</th><th>Estado</th></tr></thead><tbody>
			<?php if ( ! $data['items'] ) : ?><tr><td colspan="7">No hay movimientos con este filtro.</td></tr><?php endif; ?>
			<?php foreach ( $data['items'] as $event ) : ?>
			<tr><td><?php echo esc_html( $event['event_type'] ); ?></td><td>#<?php echo esc_html( $event['affiliate_id'] ); ?></td><td><?php if ( (int) $event['order_id'] > 0 ) : ?><a href="<?php echo esc_url( admin_url( 'admin.php?page=wc-orders&action=edit&id=' . (int) $event['order_id'] ) ); ?>">#<?php echo esc_html( $event['order_id'] ); ?></a><?php else : ?>—<?php endif; ?></td><td><?php echo esc_html( $event['period_key'] ); ?></td><td><?php echo esc_html( self::money( $event['base_mxn'] ) ); ?></td><td><?php echo esc_html( self::money( $event['commission_mxn'] ) ); ?></td><td><span class="nka-status nka-status-<?php echo esc_attr( $event['status'] ); ?>"><?php echo esc_html( $event['status'] ); ?></span><?php if ( ! empty( $event['review_reason'] ) ) : ?><p><?php echo esc_html( $event['review_reason'] ); ?></p><?php endif; ?></td></tr>
			<?php endforeach; ?>
			</tbody></table></div>
			<?php self::render_pagination( $data, 'sales' ); ?>
		</section>
		<?php
	}

	private static function render_closures() {
		$period = self::query_value( 'period' );
		$status = self::query_value( 'status' );
		$preview_affiliate = absint( self::query_value( 'preview_affiliate' ) );
		$filters = array();
		if ( preg_match( '/^\d{4}-\d{2}$/', $period ) ) $filters['period_key'] = $period;
		if ( in_array( $status, Nakama_Affiliates_Closures::STATES, true ) ) $filters['status'] = $status;
		$data = self::paged_rows( 'closures', $filters, 'period_key DESC,id DESC' );
		?>
		<section aria-labelledby="nka-closures-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Retenciones manuales</p><h2 id="nka-closures-title">Cierres / Pagos</h2></div></div>
			<div class="nka-split">
				<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" class="nka-filter nka-preview-form"><input type="hidden" name="page" value="<?php echo esc_attr( self::SLUG ); ?>" /><input type="hidden" name="tab" value="closures" /><label>ID del afiliado<input name="preview_affiliate" type="number" min="1" value="<?php echo esc_attr( $preview_affiliate ?: '' ); ?>" required /></label><label>Periodo<input name="period" type="month" value="<?php echo esc_attr( $period ); ?>" required /></label><button class="button button-primary" type="submit">Previsualizar cierre</button></form>
				<div class="nka-info-box"><strong>Sin cálculo fiscal automático.</strong> Captura únicamente los importes y el motivo que indique el contador.</div>
			</div>
			<?php if ( $preview_affiliate && preg_match( '/^\d{4}-\d{2}$/', $period ) ) : self::render_closure_preview( $preview_affiliate, $period ); endif; ?>
			<?php self::render_period_status_filter( 'closures', $period, $status, array( '' => 'Todos', 'draft' => 'Borradores', 'closed' => 'Por aprobar', 'approved' => 'Por pagar', 'paid' => 'Pagados' ) ); ?>
			<div class="nka-card-stack">
			<?php if ( ! $data['items'] ) : ?><p class="nka-empty">No hay cierres con este filtro.</p><?php endif; ?>
			<?php foreach ( $data['items'] as $closure ) : self::render_closure_card( $closure ); endforeach; ?>
			</div>
			<?php self::render_pagination( $data, 'closures' ); ?>
		</section>
		<?php
	}

	private static function render_closure_preview( $affiliate_id, $period ) {
		$preview = Nakama_Affiliates_Closures::preview( $affiliate_id, $period );
		?>
		<article class="nka-preview" aria-labelledby="nka-preview-title">
			<h3 id="nka-preview-title">Vista previa del cierre</h3>
			<dl><div><dt>Ventas</dt><dd><?php echo esc_html( $preview['sales_count'] ); ?> · <?php echo esc_html( self::money( $preview['sales_mxn'] ) ); ?></dd></div><div><dt>Devoluciones</dt><dd><?php echo esc_html( $preview['refund_count'] ); ?> · <?php echo esc_html( self::money( $preview['refunds_mxn'] ) ); ?></dd></div><div><dt>Ajustes</dt><dd><?php echo esc_html( $preview['adjustment_count'] ); ?> · <?php echo esc_html( self::money( $preview['adjustments_mxn'] ) ); ?></dd></div><div><dt>Comisión bruta</dt><dd><?php echo esc_html( self::money( $preview['commission_gross_mxn'] ) ); ?></dd></div></dl>
			<?php if ( $preview['review_count'] > 0 ) : ?><p class="notice notice-error inline">Hay <?php echo esc_html( $preview['review_count'] ); ?> movimiento(s) por revisar. Resuélvelos antes de cerrar.</p><?php else : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"><?php self::mutation_fields( 'close_period' ); ?><input type="hidden" name="affiliate_id" value="<?php echo esc_attr( $affiliate_id ); ?>" /><input type="hidden" name="period" value="<?php echo esc_attr( $period ); ?>" /><label class="nka-check"><input name="confirmed" type="checkbox" value="1" required /> Confirmo que revisé esta vista previa y deseo congelar el periodo.</label><button class="button button-primary" type="submit" data-nakama-confirm="El cierre congelará estos movimientos. ¿Deseas continuar?">Confirmar cierre</button></form>
			<?php endif; ?>
		</article>
		<?php
	}

	private static function render_closure_card( array $closure ) {
		?>
		<article class="nka-record-card">
			<header><div><span class="nka-status nka-status-<?php echo esc_attr( $closure['status'] ); ?>"><?php echo esc_html( $closure['status'] ); ?></span><h3>Afiliado #<?php echo esc_html( $closure['affiliate_id'] ); ?> · <?php echo esc_html( $closure['period_key'] ); ?></h3></div><strong><?php echo esc_html( self::money( $closure['net_mxn'] ) ); ?></strong></header>
			<dl class="nka-closure-values"><div><dt>Bruto</dt><dd><?php echo esc_html( self::money( $closure['commission_gross_mxn'] ) ); ?></dd></div><div><dt>ISR manual</dt><dd><?php echo esc_html( self::money( $closure['isr_withheld_mxn'] ) ); ?></dd></div><div><dt>IVA manual</dt><dd><?php echo esc_html( self::money( $closure['iva_withheld_mxn'] ) ); ?></dd></div><div><dt>Otros ajustes</dt><dd><?php echo esc_html( self::money( $closure['other_adjustments_mxn'] ) ); ?></dd></div></dl>
			<?php if ( in_array( $closure['status'], array( 'draft', 'closed' ), true ) ) : ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-form-grid nka-adjustments-form"><?php self::mutation_fields( 'manual_amounts' ); ?><input type="hidden" name="closure_id" value="<?php echo esc_attr( $closure['id'] ); ?>" /><label>ISR retenido (MXN)<input name="isr_mxn" type="number" min="0" step="0.01" value="<?php echo esc_attr( $closure['isr_withheld_mxn'] ); ?>" required /></label><label>IVA retenido (MXN)<input name="iva_mxn" type="number" min="0" step="0.01" value="<?php echo esc_attr( $closure['iva_withheld_mxn'] ); ?>" required /></label><label>Otros ajustes firmados<input name="other_mxn" type="number" step="0.01" value="<?php echo esc_attr( $closure['other_adjustments_mxn'] ); ?>" required /></label><label class="nka-wide">Motivo y referencia del contador<textarea name="reason" required><?php echo esc_textarea( $closure['adjustment_reason'] ); ?></textarea></label><button class="button" type="submit">Guardar importes manuales</button></form>
			<?php endif; ?>
			<?php if ( 'closed' === $closure['status'] ) : ?><form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-approve-form"><?php self::mutation_fields( 'approve_closure' ); ?><input type="hidden" name="closure_id" value="<?php echo esc_attr( $closure['id'] ); ?>" /><label class="nka-check"><input name="confirmed" type="checkbox" value="1" required /> Confirmo bruto, retenciones, ajustes y neto.</label><button class="button button-primary" type="submit" data-nakama-confirm="Después de aprobar no podrás editar los importes. ¿Continuar?">Aprobar cierre</button></form><?php endif; ?>
			<?php if ( 'approved' === $closure['status'] ) : ?>
			<form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-form-grid nka-payment-form"><?php self::mutation_fields( 'record_payment' ); ?><input type="hidden" name="closure_id" value="<?php echo esc_attr( $closure['id'] ); ?>" /><label>Fecha y hora del pago<input name="paid_at" type="datetime-local" required /></label><label>Referencia<input name="payment_reference" maxlength="191" required /></label><label class="nka-wide">Comprobante PDF<input name="receipt" type="file" accept="application/pdf,.pdf" required /></label><button class="button button-primary" type="submit" data-nakama-confirm="Se congelará el neto pagado y se guardará el comprobante. ¿Continuar?">Registrar pago</button></form>
			<?php endif; ?>
			<?php if ( 'paid' === $closure['status'] ) : ?>
			<div class="nka-payment-detail"><p><strong>Pagado:</strong> <?php echo esc_html( self::money( $closure['paid_net_mxn'] ?? $closure['net_mxn'] ) ); ?> · <?php echo esc_html( $closure['paid_at_gmt'] ); ?> · Ref. <?php echo esc_html( $closure['payment_reference'] ); ?></p><a class="button" href="<?php echo esc_url( self::payment_download_url( (int) $closure['payment_document_id'] ) ); ?>">Descargar comprobante</a></div>
			<?php if ( empty( $closure['payment_reversed_at_gmt'] ) ) : ?>
			<form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-form-grid nka-replace-payment-form"><?php self::mutation_fields( 'replace_receipt' ); ?><input type="hidden" name="closure_id" value="<?php echo esc_attr( $closure['id'] ); ?>" /><label>Nuevo comprobante PDF<input name="receipt" type="file" accept="application/pdf,.pdf" required /></label><label class="nka-wide">Motivo del reemplazo<textarea name="reason" required></textarea></label><button class="button" type="submit">Reemplazar comprobante</button></form>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-reverse-payment-form"><?php self::mutation_fields( 'reverse_payment' ); ?><input type="hidden" name="closure_id" value="<?php echo esc_attr( $closure['id'] ); ?>" /><label>Motivo de la reversión<textarea name="reason" required></textarea></label><label class="nka-check"><input name="confirmed" type="checkbox" value="1" required /> Confirmo que registraré una reversión sin borrar el pago original.</label><button class="button" type="submit" data-nakama-confirm="La reversión quedará en el historial. ¿Continuar?">Registrar reversión</button></form>
			<?php else : ?><div class="notice notice-error inline"><p><strong>Pago revertido:</strong> <?php echo esc_html( $closure['payment_reversal_reason'] ); ?> · <?php echo esc_html( $closure['payment_reversed_at_gmt'] ); ?></p></div><?php endif; ?>
			<?php endif; ?>
		</article>
		<?php
	}

	private static function render_delivery_placeholder( $title ) {
		?><section class="nka-empty-stage" aria-labelledby="nka-stage-title"><p class="nka-kicker">Programa mensual</p><h2 id="nka-stage-title"><?php echo esc_html( $title ); ?></h2><strong>Disponible en Entrega 3</strong><p>Esta sección se activará cuando estén listas las reglas de cupo, catálogo elegible y validación manual de publicaciones.</p></section><?php
	}

	private static function render_garments() {
		$status = self::query_value( 'status' );
		$filters = in_array( $status, Nakama_Affiliates_Requests::STATES, true ) ? array( 'status' => $status ) : array();
		$data = self::paged_rows( 'requests', $filters, 'period_key DESC,id DESC' );
		?>
		<section aria-labelledby="nka-garments-title">
			<div class="nka-section-heading"><div><p class="nka-kicker">Beneficio gratuito · Envío Nakama</p><h2 id="nka-garments-title">Solicitudes de prendas</h2></div></div>
			<?php self::render_status_filter( 'garments', array( '' => 'Todos', 'submitted' => 'Enviada', 'approved' => 'Aprobada', 'preparing' => 'Preparando', 'shipped' => 'Enviada por paquetería', 'completed' => 'Completada', 'rejected' => 'Rechazada', 'cancelled' => 'Cancelada' ), $status ); ?>
			<div class="nka-table-wrap"><table class="widefat striped"><thead><tr><th>Periodo</th><th>Afiliado</th><th>Selección</th><th>Estado</th><th>Operación</th></tr></thead><tbody>
			<?php foreach ( $data['items'] as $request ) : $profile = Nakama_Affiliates_Repository::profile_by_id( (int) $request['affiliate_id'] ); $items = Nakama_Affiliates_Repository::request_items( (int) $request['id'] ); ?>
				<tr>
					<td><?php echo esc_html( $request['period_key'] ); ?><br /><small>#<?php echo esc_html( $request['id'] ); ?></small></td>
					<td><?php echo esc_html( $profile['code'] ?? ( 'ID ' . $request['affiliate_id'] ) ); ?></td>
					<td><?php foreach ( $items as $item ) : ?><div><?php echo esc_html( $item['product_name'] . ( $item['variation_label'] ? ' · ' . $item['variation_label'] : '' ) ); ?></div><?php endforeach; ?></td>
					<td><strong><?php echo esc_html( $request['status'] ); ?></strong><?php if ( ! empty( $request['tracking_code'] ) ) : ?><br /><small><?php echo esc_html( $request['carrier'] . ' · ' . $request['tracking_code'] ); ?></small><?php endif; ?></td>
					<td><?php self::render_request_actions( $request ); ?></td>
				</tr>
			<?php endforeach; ?>
			<?php if ( ! $data['items'] ) : ?><tr><td colspan="5">No hay solicitudes con este filtro.</td></tr><?php endif; ?>
			</tbody></table></div>
			<?php self::render_pagination( $data, 'garments' ); ?>
		</section>
		<?php
	}

	private static function render_request_actions( array $request ) {
		$status = (string) $request['status'];
		if ( 'submitted' === $status ) {
			self::request_action_form( $request, 'approved', 'Aprobar' );
			self::request_action_form( $request, 'rejected', 'Rechazar', true );
		} elseif ( 'approved' === $status ) {
			self::request_action_form( $request, 'preparing', 'Preparar' );
			self::request_action_form( $request, 'rejected', 'Rechazar', true );
		} elseif ( 'preparing' === $status ) {
			?><form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-inline-form"><?php self::mutation_fields( 'update_request' ); ?><input type="hidden" name="request_id" value="<?php echo esc_attr( $request['id'] ); ?>" /><input type="hidden" name="request_status" value="shipped" /><label>Paquetería<input name="carrier" required /></label><label>Guía<input name="tracking_code" required /></label><button class="button" type="submit">Registrar envío</button></form><?php
		} elseif ( 'shipped' === $status ) {
			self::request_action_form( $request, 'completed', 'Completar' );
		} elseif ( 'rejected' === $status && ! empty( $request['rejection_reason'] ) ) {
			echo '<small>' . esc_html( $request['rejection_reason'] ) . '</small>';
		} else {
			echo '<span aria-hidden="true">—</span>';
		}
	}

	private static function request_action_form( array $request, $status, $label, $requires_reason = false ) {
		?><form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-inline-form"><?php self::mutation_fields( 'update_request' ); ?><input type="hidden" name="request_id" value="<?php echo esc_attr( $request['id'] ); ?>" /><input type="hidden" name="request_status" value="<?php echo esc_attr( $status ); ?>" /><?php if ( $requires_reason ) : ?><label>Motivo<textarea name="reason" required></textarea></label><?php endif; ?><button class="button" type="submit"><?php echo esc_html( $label ); ?></button></form><?php
	}

	private static function render_settings() {
		$category_ids = implode( ', ', Nakama_Affiliates_Products::restricted_category_ids() );
		$accounts = implode( "\n", Nakama_Affiliates_Products::official_accounts() );
		?><section aria-labelledby="nka-settings-title"><div class="nka-section-heading"><div><p class="nka-kicker">Reglas vigentes</p><h2 id="nka-settings-title">Configuración</h2></div></div><div class="nka-settings-grid"><article><h3>Descuento</h3><strong>Máximo 10%</strong><p>Exclusivo; sustituye otras promociones.</p></article><article><h3>Comisión</h3><strong>10%</strong><p>Sobre subtotal elegible antes del descuento; excluye envío y se revierte con devoluciones.</p></article><article><h3>Fiscal</h3><strong>Captura manual</strong><p>Sin facturación automática ni cálculo de ISR/IVA en esta versión.</p></article></div><form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="nka-form-grid"><?php self::mutation_fields( 'save_program_settings' ); ?><label class="nka-wide">IDs de categorías restringidas<input name="restricted_category_ids" value="<?php echo esc_attr( $category_ids ); ?>" placeholder="123, 456" /><small>Drops y Edición especial. Los afiliados VIP sí podrán ver estas categorías.</small></label><label class="nka-wide">Cuentas oficiales de Nakama<textarea name="official_accounts" placeholder="@nakamabordados&#10;@otra_cuenta"><?php echo esc_textarea( $accounts ); ?></textarea><small>Una cuenta por línea. Administración verificará manualmente las etiquetas en Reels e Historias.</small></label><button class="button button-primary" type="submit">Guardar configuración</button></form></section><?php
	}

	public static function handle_action() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'No tienes permisos para realizar esta acción.', 'nakama-affiliates' ) );
		}
		check_admin_referer( self::NONCE_ACTION, self::NONCE_FIELD );
		$action = isset( $_POST['nakama_action'] ) ? sanitize_key( wp_unslash( $_POST['nakama_action'] ) ) : '';
		$data = wp_unslash( $_POST );
		$data['_files'] = $_FILES;
		$result = self::process_action( $action, $data, get_current_user_id() );
		$tab = self::action_tab( $action );
		$url = add_query_arg( array(
			'page' => self::SLUG,
			'tab' => $tab,
			'nakama_notice' => ! empty( $result['success'] ) ? 'success' : 'error',
			'nakama_reason' => sanitize_key( $result['reason'] ?? ( ! empty( $result['success'] ) ? 'saved' : 'failed' ) ),
		), admin_url( 'admin.php' ) );
		wp_safe_redirect( $url );
		exit;
	}

	public static function process_action( $action, array $data, $actor_user_id ) {
		switch ( (string) $action ) {
			case 'review_document':
				$status = sanitize_key( $data['review_status'] ?? '' );
				$reason = sanitize_textarea_field( $data['reason'] ?? '' );
				if ( 'rejected' === $status && '' === trim( $reason ) ) return array( 'success' => false, 'reason' => 'reason_required' );
				return Nakama_Affiliates_Documents::review( absint( $data['document_id'] ?? 0 ), $status, $reason );
			case 'close_period':
				return Nakama_Affiliates_Closures::confirm( absint( $data['affiliate_id'] ?? 0 ), sanitize_text_field( $data['period'] ?? '' ), ! empty( $data['confirmed'] ), (int) $actor_user_id );
			case 'manual_amounts':
				$reason = sanitize_textarea_field( $data['reason'] ?? '' );
				if ( '' === trim( $reason ) ) return array( 'success' => false, 'reason' => 'reason_required' );
				return Nakama_Affiliates_Closures::set_manual_amounts( absint( $data['closure_id'] ?? 0 ), $data['isr_mxn'] ?? '', $data['iva_mxn'] ?? '', $data['other_mxn'] ?? '', $reason, (int) $actor_user_id );
			case 'approve_closure':
				return Nakama_Affiliates_Closures::approve( absint( $data['closure_id'] ?? 0 ), ! empty( $data['confirmed'] ), (int) $actor_user_id );
			case 'record_payment':
				$file = $data['_files']['receipt'] ?? null;
				if ( ! is_array( $file ) ) return array( 'success' => false, 'reason' => 'receipt_required' );
				return Nakama_Affiliates_Payments::record( absint( $data['closure_id'] ?? 0 ), $file, sanitize_text_field( $data['payment_reference'] ?? '' ), self::payment_date_to_gmt( $data['paid_at'] ?? '' ), (int) $actor_user_id );
			case 'replace_receipt':
				$file = $data['_files']['receipt'] ?? null;
				$reason = sanitize_textarea_field( $data['reason'] ?? '' );
				if ( ! is_array( $file ) ) return array( 'success' => false, 'reason' => 'receipt_required' );
				if ( '' === trim( $reason ) ) return array( 'success' => false, 'reason' => 'reason_required' );
				return Nakama_Affiliates_Payments::replace_receipt( absint( $data['closure_id'] ?? 0 ), $file, $reason, (int) $actor_user_id );
			case 'reverse_payment':
				$reason = sanitize_textarea_field( $data['reason'] ?? '' );
				if ( empty( $data['confirmed'] ) ) return array( 'success' => false, 'reason' => 'confirmation_required' );
				if ( '' === trim( $reason ) ) return array( 'success' => false, 'reason' => 'reason_required' );
				return Nakama_Affiliates_Payments::reverse( absint( $data['closure_id'] ?? 0 ), $reason, (int) $actor_user_id );
			case 'save_profile':
				return self::save_profile( $data, $actor_user_id );
			case 'update_request':
				return Nakama_Affiliates_Requests::transition( absint( $data['request_id'] ?? 0 ), sanitize_key( $data['request_status'] ?? '' ), array(
					'reason'        => sanitize_textarea_field( $data['reason'] ?? '' ),
					'carrier'       => sanitize_text_field( $data['carrier'] ?? '' ),
					'tracking_code' => sanitize_text_field( $data['tracking_code'] ?? '' ),
				), (int) $actor_user_id );
			case 'save_program_settings':
				return Nakama_Affiliates_Products::save_settings( $data['restricted_category_ids'] ?? '', $data['official_accounts'] ?? '', (int) $actor_user_id );
			default:
				return array( 'success' => false, 'reason' => 'unknown_action' );
		}
	}

	private static function save_profile( array $data, $actor_user_id ) {
		$profile = Nakama_Affiliates_Repository::profile_by_id( absint( $data['affiliate_id'] ?? 0 ) );
		if ( ! $profile ) return array( 'success' => false, 'reason' => 'not_found' );
		$status = sanitize_key( $data['profile_status'] ?? '' );
		if ( ! in_array( $status, array( 'active', 'suspended', 'inactive' ), true ) ) return array( 'success' => false, 'reason' => 'invalid_status' );
		$settings = Nakama_Affiliates_Codes::update_profile_settings( $profile, sanitize_text_field( $data['affiliate_code'] ?? '' ), sanitize_text_field( $data['discount_percentage'] ?? '' ) );
		if ( empty( $settings['success'] ) ) return array( 'success' => false, 'reason' => 'invalid_profile' );

		Nakama_Affiliates_Repository::update_profile( (int) $profile['id'], array(
			'status'           => $status,
			'suspended_at_gmt' => 'suspended' === $status ? Nakama_Affiliates_Repository::now_gmt() : null,
		) );
		$user = get_userdata( (int) $profile['user_id'] );
		if ( $user ) {
			if ( 'inactive' === $status ) $user->remove_cap( Nakama_Affiliates_Permissions::ACCESS_CAP ); else $user->add_cap( Nakama_Affiliates_Permissions::ACCESS_CAP );
			if ( 'inactive' !== $status && ! empty( $data['affiliate_vip'] ) ) $user->add_cap( Nakama_Affiliates_Permissions::VIP_CAP ); else $user->remove_cap( Nakama_Affiliates_Permissions::VIP_CAP );
		}
		Nakama_Affiliates_Repository::audit( 'admin_profile_updated', 'affiliate', (int) $profile['id'], 'Perfil, código, descuento, estado y VIP revisados desde el panel operativo.', (int) $actor_user_id );
		return array( 'success' => true );
	}

	private static function mutation_fields( $action ) {
		echo '<input type="hidden" name="action" value="nakama_affiliates_action" />';
		echo '<input type="hidden" name="nakama_action" value="' . esc_attr( $action ) . '" />';
		wp_nonce_field( self::NONCE_ACTION, self::NONCE_FIELD );
	}

	private static function current_tab() {
		$tab = self::query_value( 'tab' );
		return isset( self::TABS[ $tab ] ) ? $tab : 'summary';
	}

	private static function query_value( $key ) {
		return isset( $_GET[ $key ] ) ? sanitize_text_field( wp_unslash( $_GET[ $key ] ) ) : '';
	}

	private static function action_tab( $action ) {
		if ( 'review_document' === $action ) return 'documents';
		if ( in_array( $action, array( 'close_period', 'manual_amounts', 'approve_closure', 'record_payment', 'replace_receipt', 'reverse_payment' ), true ) ) return 'closures';
		if ( 'update_request' === $action ) return 'garments';
		if ( 'save_program_settings' === $action ) return 'settings';
		return 'affiliates';
	}

	private static function tab_url( $tab, array $extra = array() ) {
		return add_query_arg( array_merge( array( 'page' => self::SLUG, 'tab' => $tab ), $extra ), admin_url( 'admin.php' ) );
	}

	private static function render_notice() {
		$notice = self::query_value( 'nakama_notice' );
		if ( ! in_array( $notice, array( 'success', 'error' ), true ) ) return;
		$reason = self::query_value( 'nakama_reason' );
		$message = 'success' === $notice ? 'La operación se guardó correctamente.' : 'No se pudo completar la operación. Revisa los datos y vuelve a intentarlo.';
		if ( 'reason_required' === $reason ) $message = 'Es obligatorio capturar un motivo antes de continuar.';
		if ( 'confirmation_required' === $reason ) $message = 'Marca la confirmación explícita antes de continuar.';
		echo '<div class="notice notice-' . esc_attr( 'success' === $notice ? 'success' : 'error' ) . ' is-dismissible" role="status"><p>' . esc_html( $message ) . '</p></div>';
	}

	private static function count_rows( $table, $where ) {
		global $wpdb;
		return (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Nakama_Affiliates_Repository::table( $table ) . ' WHERE ' . $where );
	}

	private static function paged_rows( $table, array $filters, $order ) {
		global $wpdb;
		$page = max( 1, absint( self::query_value( 'paged' ) ) );
		$where = array();
		$values = array();
		foreach ( $filters as $field => $value ) {
			if ( ! in_array( $field, array( 'status', 'period_key', 'document_type', 'is_current' ), true ) ) continue;
			$where[] = $field . ( is_int( $value ) ? ' = %d' : ' = %s' );
			$values[] = $value;
		}
		$where_sql = $where ? ' WHERE ' . implode( ' AND ', $where ) : '';
		$table_name = Nakama_Affiliates_Repository::table( $table );
		$count_sql = 'SELECT COUNT(*) FROM ' . $table_name . $where_sql;
		$rows_sql = 'SELECT * FROM ' . $table_name . $where_sql . ' ORDER BY ' . $order . ' LIMIT %d OFFSET %d';
		$total = (int) $wpdb->get_var( $values ? $wpdb->prepare( $count_sql, $values ) : $count_sql );
		$row_values = array_merge( $values, array( self::PER_PAGE, ( $page - 1 ) * self::PER_PAGE ) );
		$items = $wpdb->get_results( $wpdb->prepare( $rows_sql, $row_values ), ARRAY_A );
		return array( 'items' => is_array( $items ) ? $items : array(), 'page' => $page, 'pages' => max( 1, (int) ceil( $total / self::PER_PAGE ) ), 'total' => $total );
	}

	private static function render_pagination( array $data, $tab ) {
		if ( $data['pages'] <= 1 ) return;
		echo '<div class="tablenav"><div class="tablenav-pages">' . wp_kses_post( paginate_links( array( 'base' => add_query_arg( 'paged', '%#%', self::tab_url( $tab ) ), 'current' => $data['page'], 'total' => $data['pages'] ) ) ) . '</div></div>';
	}

	private static function render_status_filter( $tab, array $options, $selected_status ) {
		?><form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" class="nka-filter"><input type="hidden" name="page" value="<?php echo esc_attr( self::SLUG ); ?>" /><input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>" /><label>Estado<select name="status"><?php foreach ( $options as $value => $label ) : ?><option value="<?php echo esc_attr( $value ); ?>" <?php selected( $selected_status, $value ); ?>><?php echo esc_html( $label ); ?></option><?php endforeach; ?></select></label><button class="button" type="submit">Filtrar</button></form><?php
	}

	private static function render_period_status_filter( $tab, $period, $status, array $options ) {
		?><form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" class="nka-filter"><input type="hidden" name="page" value="<?php echo esc_attr( self::SLUG ); ?>" /><input type="hidden" name="tab" value="<?php echo esc_attr( $tab ); ?>" /><label>Periodo<input type="month" name="period" value="<?php echo esc_attr( $period ); ?>" /></label><label>Estado<select name="status"><?php foreach ( $options as $value => $label ) : ?><option value="<?php echo esc_attr( $value ); ?>" <?php selected( $status, $value ); ?>><?php echo esc_html( $label ); ?></option><?php endforeach; ?></select></label><button class="button" type="submit">Filtrar</button></form><?php
	}

	private static function document_download_url( $document_id ) {
		return add_query_arg( '_wpnonce', wp_create_nonce( 'wp_rest' ), rest_url( 'nakama/v1/affiliates/admin/documents/' . (int) $document_id . '/download' ) );
	}

	private static function payment_download_url( $document_id ) {
		return add_query_arg( '_wpnonce', wp_create_nonce( 'wp_rest' ), rest_url( 'nakama/v1/affiliates/me/payments/' . (int) $document_id . '/download' ) );
	}

	private static function payment_date_to_gmt( $value ) {
		$value = str_replace( 'T', ' ', sanitize_text_field( $value ) );
		if ( 16 === strlen( $value ) ) $value .= ':00';
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value ) ) return '';
		return function_exists( 'get_gmt_from_date' ) ? get_gmt_from_date( $value, 'Y-m-d H:i:s' ) : $value;
	}

	private static function money( $amount ) {
		return '$' . number_format_i18n( (float) $amount, 2 ) . ' MXN';
	}
}
