# Modos automático y manual para códigos de descuento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Permitir que cada código de Nakama Descuentos sea visible automáticamente o permanezca oculto hasta que el cliente lo introduzca en el campo promocional, conservando una sola promoción principal.

**Architecture:** `nakama-discounts` seguirá siendo la autoridad de almacenamiento, vigencia, sesión y cálculo. `nakama-checkout-tools.php` actuará como resolutor tipado y puente neutral mediante filtros, mientras el checkout Next.js conservará el tipo devuelto (`nakama_manual` o `native_coupon`) y nunca calculará localmente un código Nakama.

**Tech Stack:** PHP 7.4+ y hooks de WordPress/WooCommerce, React 19, Next.js 16.2.6 con exportación estática, TypeScript, Vitest y React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-23-modos-automatico-manual-codigos-descuento-design.md`

**Estado:** Implementación completada y verificada el 24 de septiembre de 2026.

## Global Constraints

- Solo puede aplicarse una promoción principal entre Nakama, cupón nativo y afiliado.
- Los registros existentes migran a `entry_mode = automatic`.
- Un código manual no se muestra hasta ser validado; solo se conserva el último código manual desbloqueado.
- Un manual compatible se selecciona al introducirlo y permanece visible al comparar otras promociones.
- Un manual no compatible se aplica automáticamente, oculta alternativas y desactiva transferencia, envío gratis promocional y MSI.
- El navegador no envía porcentajes, importes ni compatibilidad como datos confiables.
- El frontend continúa siendo compatible con la exportación estática de Next.js.
- Cada commit incluye un bloque `NK-RELEASE` en español.
- La suite global tiene fallos previos ajenos en Almacén, Changelog y dependencias móviles; la puerta de esta entrega usa las suites específicas documentadas en la Tarea 6.

## File Structure

- `nakama-discounts/includes/class-discount-codes.php`: esquema v2, normalización, resolución manual, estado de sesión y contratos de filtros.
- `nakama-discounts/includes/class-admin.php`: radios exclusivos, validación y etiquetas de modo.
- `nakama-discounts/includes/class-context.php`: identificador manual desbloqueado dentro del contexto autoritativo.
- `nakama-discounts/includes/class-engine.php`: visibilidad de códigos manuales y aislamiento del manual no compatible.
- `nakama-discounts/includes/class-cart.php`: limpieza de sesión inválida y fotografía del modo en el pedido.
- `nakama-checkout-tools.php`: respuesta REST tipada, colisiones y precedencia del puente.
- `nakama-affiliates/includes/class-affiliates-discounts.php`: limpieza de atribución cuando cambia la promoción principal.
- `src/app/context/CartContext.tsx`: estado tipado y revalidación del código promocional.
- `src/lib/checkout-bridge.ts`: serialización exclusiva de `nakama_code`, `affiliate_code` o `coupon`.
- `src/app/components/AbandonedCartCoupon.tsx`: campo promocional unificado y feedback accesible.
- `src/app/context/LanguageContext.tsx`: textos español/inglés del campo unificado.
- `src/app/cart/page.tsx` y `src/app/checkout/page.tsx`: envío del tipo resuelto al constructor del puente.
- `tests/nakama-discounts-test.php`: migración, modo obligatorio y resolución de registros.
- `tests/nakama-discounts-admin-ui-test.php`: controles administrativos y estados visibles.
- `tests/nakama-discounts-cart-test.php`: sesión, visibilidad, exclusividad y metadatos.
- `tests/nakama-checkout-tools-test.php`: clasificación REST, colisiones y precedencia del puente.
- `tests/nakama-affiliates-discounts-test.php`: limpieza de atribución al reemplazar la promoción.
- `src/app/context/CartContext.test.tsx`: persistencia y exclusividad del estado promocional.
- `src/lib/checkout-bridge.test.ts`: parámetros exclusivos del puente.
- `src/app/components/AbandonedCartCoupon.test.tsx`: interacción y accesibilidad del campo.

---

### Task 1: Persistencia y configurador de modo

**Files:**
- Modify: `tests/nakama-discounts-test.php`
- Modify: `tests/nakama-discounts-admin-ui-test.php`
- Modify: `nakama-discounts/includes/class-discount-codes.php`
- Modify: `nakama-discounts/includes/class-admin.php`

**Interfaces:**
- Produces: `Nakama_Discount_Codes::ENTRY_AUTOMATIC`, `ENTRY_MANUAL`, `entry_mode(array $record): string`, `find_by_code(string $code): ?array`, `maybe_upgrade(): void`.
- Produces persisted records with `entry_mode: automatic|manual` under schema version `2`.

- [x] **Step 1: Write failing persistence and migration tests**

Add assertions that a new row without `entry_mode` is rejected, a row with `entry_mode => manual` persists that exact value, a manual row colliding with an existing `WC_Coupon` is rejected, and this legacy collection is normalized and persisted as schema 2 with automatic mode:

```php
$test_options[ NAKAMA_DISC_CODES_OPTION ] = array(
	'version' => 1,
	'items' => array( 'legacy' => array(
		'id' => 'legacy', 'code' => 'LEGACY10', 'rate' => 0.10,
		'enabled' => 'yes', 'start' => '', 'end' => '', 'allow_modifiers' => 'yes',
	) ),
);
$legacy = Nakama_Discount_Codes::collection();
assert_same( 2, $legacy['version'], 'Legacy collections migrate to schema 2.' );
assert_same( 'automatic', $legacy['items']['legacy']['entry_mode'], 'Legacy codes stay automatic.' );
```

- [x] **Step 2: Run the tests and verify the expected failure**

Run:

```powershell
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-test.php
```

Expected: FAIL because schema version remains `1` and `entry_mode` is absent.

- [x] **Step 3: Implement schema v2 and mode validation**

In `Nakama_Discount_Codes`:

```php
const SCHEMA_VERSION = 2;
const ENTRY_AUTOMATIC = 'automatic';
const ENTRY_MANUAL = 'manual';

public static function entry_mode( array $record ) {
	return self::ENTRY_MANUAL === ( isset( $record['entry_mode'] ) ? $record['entry_mode'] : '' )
		? self::ENTRY_MANUAL
		: self::ENTRY_AUTOMATIC;
}
```

Normalize legacy records through `maybe_upgrade()`, persist the upgraded collection with `update_option()`, persist `entry_mode` from sanitized rows, and add `Elige cómo podrá usar el cliente este código.` when the posted value is not one of the two constants. When a manual code matches an existing `WC_Coupon`, add `Ese código también existe en WooCommerce. Cambia uno de los dos para evitar ambigüedad.` and preserve the previous collection. Implement `find_by_code()` with the existing uppercase/no-space normalization and return the matching record regardless of status.

- [x] **Step 4: Add failing administrative UI assertions**

Assert that saved and new cards expose a required radio group with values `automatic` and `manual`, and that the rendered saved card contains the text `Automático` for a legacy fixture.

- [x] **Step 5: Implement the administrative radio groups and inline validation**

Render a `<fieldset>` named `...[entry_mode]` in each saved card and the creation card. The creation radios start unchecked. Extend `validateCreation()` so no selected mode calls `showModeError('Elige si el código se mostrará automáticamente o se ingresará manualmente.')`, focuses the first radio, and prevents submission. Reset radios with `field.checked = field.defaultChecked` on cancel.

- [x] **Step 6: Run the focused server and UI suites**

Run:

```powershell
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-admin-ui-test.php
```

Expected: both print their success messages and exit 0.

- [x] **Step 7: Commit**

```text
feat(discounts): configure automatic or manual codes

NK-RELEASE:
Resumen: Los administradores pueden decidir cómo descubrirá el cliente cada código.

Grupo: Descuentos
- Añade una selección obligatoria entre mostrar el código automáticamente o solicitar su captura manual.
```

### Task 2: Sesión, motor y exclusividad del código manual

**Files:**
- Modify: `tests/nakama-discounts-test.php`
- Modify: `tests/nakama-discounts-cart-test.php`
- Modify: `nakama-discounts/includes/class-discount-codes.php`
- Modify: `nakama-discounts/includes/class-context.php`
- Modify: `nakama-discounts/includes/class-engine.php`
- Modify: `nakama-discounts/includes/class-cart.php`
- Modify: `nakama-discounts/nakama-discounts.php`

**Interfaces:**
- Consumes: `entry_mode()` and `find_by_code()` from Task 1.
- Produces: session key `nakama_unlocked_public_code_id`.
- Produces filter callbacks `resolve_manual_code(array $result, string $code): array` and `apply_checkout_bridge(array $result, string $code): array`.
- Produces: `clear_unlocked_code(bool $clear_selection = true): void`.

- [x] **Step 1: Write failing engine tests for hidden, compatible and exclusive manual codes**

Extend the fixtures with one automatic, one compatible manual, and one exclusive manual. Assert:

```php
$hidden = Nakama_Engine::resolve( new Nakama_Context() );
assert_same( false, isset( $hidden['options']['public_code:manual-combo'] ), 'Locked manual codes stay hidden.' );

$compatible = new Nakama_Context();
$compatible->unlocked_public_code_id = 'manual-combo';
$compatible->selected_promo = 'public_code:manual-combo';
$compatible_plan = Nakama_Engine::resolve( $compatible );
assert_same( true, isset( $compatible_plan['options']['public_code:auto'] ), 'Compatible manual codes keep alternatives visible.' );

$exclusive = new Nakama_Context();
$exclusive->unlocked_public_code_id = 'manual-solo';
$exclusive->selected_promo = 'public_code:manual-solo';
$exclusive_plan = Nakama_Engine::resolve( $exclusive );
assert_same( array( 'public_code:manual-solo' ), array_keys( $exclusive_plan['options'] ), 'Exclusive manual codes become the only option.' );
```

- [x] **Step 2: Run the engine test and verify it fails**

Run the PHP discounts test. Expected: FAIL because every active code is currently public.

- [x] **Step 3: Implement context and candidate visibility**

Add `public $unlocked_public_code_id = '';` and populate it from the Woo session. In `build_primary_candidates()`, include automatic records unconditionally and manual records only when their ID equals the context value. Add `entry_mode` to each public candidate. After extension filters run, if the selected candidate is a manual public code with `allow_modifiers === false`, return an array containing only that candidate.

- [x] **Step 4: Write failing session and order snapshot tests**

Assert that resolving and applying `MANUAL15` stores its ID, selects `public_code:manual-combo`, removes native coupons, and writes `_nakama_public_code_entry_mode = manual`. Assert native coupon application and affiliate selection clear the unlocked ID.

- [x] **Step 5: Implement discount-code filter hooks and session cleanup**

Add `Nakama_Discount_Codes::init()` to register:

```php
add_filter( 'nakama_resolve_manual_discount_code', array( __CLASS__, 'resolve_manual_code' ), 20, 2 );
add_filter( 'nakama_checkout_bridge_nakama_result', array( __CLASS__, 'apply_checkout_bridge' ), 20, 2 );
add_action( 'nakama_checkout_bridge_clear_promotion', array( __CLASS__, 'clear_unlocked_code' ) );
add_action( 'woocommerce_applied_coupon', array( __CLASS__, 'clear_unlocked_code' ), 20 );
add_action( 'nakama_discount_selection_applied', array( __CLASS__, 'on_promotion_selected' ), 20 );
```

`apply_checkout_bridge()` must revalidate the record, store only its ID, recalculate totals, obtain the authoritative plan and call `Nakama_Cart::apply_selection()` with the stable selection key. `on_promotion_selected()` clears the unlock only for `affiliate_code:` selections. Initialize these hooks and call `maybe_upgrade()` from the plugin bootstrap.

- [x] **Step 6: Persist the mode and clear stale unlocks**

When a selected public code is no longer present, `Nakama_Cart::get_plan()` clears the matching unlock with `clear_unlocked_code( false )`. `save_order_meta()` writes `_nakama_public_code_entry_mode` from the selected candidate.

- [x] **Step 7: Run the discounts and cart suites**

Run `tests/nakama-discounts-test.php` and `tests/nakama-discounts-cart-test.php`. Expected: both pass.

- [x] **Step 8: Commit**

```text
feat(discounts): unlock manual codes in checkout

NK-RELEASE:
Resumen: Los códigos manuales se validan y aplican sin acumular promociones.

Grupo: Checkout
- Mantiene ocultos los códigos manuales hasta su validación y aísla automáticamente los no acumulables.
```

### Task 3: Resolutor REST y puente autoritativo

**Files:**
- Modify: `tests/nakama-checkout-tools-test.php`
- Modify: `nakama-checkout-tools.php`
- Modify: `tests/nakama-affiliates-discounts-test.php`
- Modify: `nakama-affiliates/includes/class-affiliates-discounts.php`

**Interfaces:**
- Consumes filter `nakama_resolve_manual_discount_code` returning `{handled, valid, kind, code, selection_key, allow_modifiers, message}`.
- Consumes filter `nakama_checkout_bridge_nakama_result` returning `{handled, success, message}`.
- Produces REST kinds `nakama_manual` and `native_coupon`.
- Produces bridge result kinds `nakama`, `affiliate`, `coupon`, `none`.

- [x] **Step 1: Write failing typed resolver tests**

Add a `WC_Coupon` fake and a resolver filter. Verify a manual result returns:

```php
array(
	'valid' => true,
	'kind' => 'nakama_manual',
	'code' => 'MANUAL15',
	'selection_key' => 'public_code:manual-combo',
	'allow_modifiers' => true,
)
```

Verify a native coupon returns `kind => native_coupon`, an automatic Nakama result remains invalid, and a manual/native text collision returns `valid => false` with an ambiguity message.

- [x] **Step 2: Run the checkout-tools suite and verify it fails**

Expected: FAIL because the endpoint currently returns only native coupon fields.

- [x] **Step 3: Implement typed resolution without browser authority**

Normalize uppercase/no-space input. Apply `nakama_resolve_manual_discount_code` first. If handled and valid, instantiate `WC_Coupon`; reject when it has an ID, otherwise return the allowed Nakama fields. If handled and invalid, return its sanitized message without falling back. If unhandled, execute the existing WooCommerce validation and add `kind => native_coupon` plus the normalized `code`.

- [x] **Step 4: Write failing bridge precedence and cleanup tests**

Send all three query values and assert `nakama_code` wins without invoking affiliate or coupon application. Add an invalid Nakama case that does not fall back. Send no promotion and assert native coupons are removed and `nakama_checkout_bridge_clear_promotion` fires.

- [x] **Step 5: Implement bridge handling**

Handle `nakama_code` before affiliate and coupon, remove native coupons, delegate via `nakama_checkout_bridge_nakama_result`, and add a WooCommerce error notice on failure. When no intent exists, remove stale native coupons and fire `nakama_checkout_bridge_clear_promotion`.

- [x] **Step 6: Run the checkout-tools suite**

Run `tests/nakama-checkout-tools-test.php`. Expected: success and exit 0.

- [x] **Step 7: Commit**

```text
feat(checkout): resolve typed promotional codes

NK-RELEASE:
Resumen: El checkout distingue y revalida códigos Nakama y cupones de recuperación.

Grupo: Checkout
- Evita códigos ambiguos y procesa una sola promoción principal antes del pago.
```

### Task 4: Estado React y URL exclusiva del puente

**Files:**
- Modify: `src/app/context/CartContext.test.tsx`
- Modify: `src/lib/checkout-bridge.test.ts`
- Modify: `src/app/cart/page.test.tsx`
- Modify: `src/app/checkout/page.test.tsx`
- Modify: `src/app/context/CartContext.tsx`
- Modify: `src/lib/checkout-bridge.ts`
- Modify: `src/app/cart/page.tsx`
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Produces exported type `PromotionCodeKind = '' | 'native_coupon' | 'nakama_manual'`.
- Adds `couponKind: PromotionCodeKind` to `CartContextType`.
- Adds `couponKind: PromotionCodeKind` to `CheckoutBridgeInput`.
- `applyCoupon()` returns `{success: true, kind: PromotionCodeKind, message?: string}` or `{success: false, message: string}`.

- [x] **Step 1: Write failing context tests for manual recognition**

Mock the endpoint response `{ valid: true, kind: 'nakama_manual', code: 'MANUAL15', selection_key: 'public_code:manual-combo', allow_modifiers: true }`. Assert `couponCode` becomes `MANUAL15`, `couponKind` becomes `nakama_manual`, `discount` stays `0`, affiliate attribution is removed, and the saved code is revalidated after remount.

- [x] **Step 2: Run `CartContext.test.tsx` and verify it fails**

Expected: FAIL because `couponKind` and `nakama_manual` do not exist.

- [x] **Step 3: Implement the typed promotional state**

Replace `validateNativeCoupon()` with `validatePromotionCode()`. Native responses keep the existing percent/fixed conversion. Manual responses return no local discount. Store the code in `nakama_coupon`, derive its kind again from the server on hydration, and reset kind in `removeCoupon()`.

- [x] **Step 4: Write failing bridge URL tests**

Assert:

```ts
expect(url.searchParams.get('nakama_code')).toBe('MANUAL15')
expect(url.searchParams.has('affiliate_code')).toBe(false)
expect(url.searchParams.has('coupon')).toBe(false)
```

Also preserve affiliate precedence over native coupons and the existing native-only flow.

- [x] **Step 5: Implement exclusive URL serialization and pass the kind from both pages**

When `couponKind === 'nakama_manual'`, emit only `nakama_code`. Otherwise emit affiliate when present, then a native `coupon`. Add `couponKind` to both checkout-page dependency lists so a revalidated type rebuilds the URL.

- [x] **Step 6: Run the four focused web suites**

Run:

```powershell
npx vitest run src/app/context/CartContext.test.tsx src/lib/checkout-bridge.test.ts src/app/cart/page.test.tsx src/app/checkout/page.test.tsx
```

Expected: all pass.

- [x] **Step 7: Commit**

```text
feat(storefront): preserve promotional code type

NK-RELEASE:
Resumen: La tienda conserva de forma segura el tipo de código elegido por el cliente.

Grupo: Carrito
- Envía al checkout un código Nakama, un código de afiliado o un cupón, nunca varios a la vez.
```

### Task 5: Campo promocional unificado y accesible

**Files:**
- Create: `src/app/components/AbandonedCartCoupon.test.tsx`
- Modify: `src/app/components/AbandonedCartCoupon.tsx`
- Modify: `src/app/context/LanguageContext.tsx`
- Modify: `src/app/cart/page.test.tsx`
- Modify: `src/app/checkout/page.test.tsx`

**Interfaces:**
- Consumes `couponKind`, `couponCode`, `applyCoupon()` and `removeCoupon()` from Task 4.
- Produces visible success guidance for Nakama manual and native coupon results.

- [x] **Step 1: Write a failing interaction test**

Render the real component with context stubs, enter `MANUAL15`, click **Aplicar**, and assert that the accessible status contains `Código reconocido` and the helper describes both promotional and recovery codes. Assert an empty submission focuses the input and exposes an alert.

- [x] **Step 2: Run the component test and verify it fails**

Expected: FAIL because the current copy only mentions abandoned carts and has no manual-code status.

- [x] **Step 3: Implement the unified copy and feedback**

Keep the existing component boundary but change its user-facing language to **Código promocional**. Use translations for:

```text
checkout.coupon.help
checkout.coupon.manual_success
checkout.coupon.native_success
checkout.coupon.remove
```

After success, clear the input and render the status based on `couponKind`. On an empty value or rejected response, set the alert and focus the input through `useRef<HTMLInputElement>`.

- [x] **Step 4: Update page test dictionaries and assertions**

Replace abandoned-cart-only labels in cart and checkout fixtures with the new keys, while keeping recovery coupons covered as one accepted kind.

- [x] **Step 5: Run component, context, cart and checkout tests**

Run:

```powershell
npx vitest run src/app/components/AbandonedCartCoupon.test.tsx src/app/context/CartContext.test.tsx src/app/cart/page.test.tsx src/app/checkout/page.test.tsx
```

Expected: all pass with no accessibility warnings.

- [x] **Step 6: Commit**

```text
feat(checkout): unify promotional code field

NK-RELEASE:
Resumen: El cliente puede introducir códigos promocionales en un solo campo claro.

Grupo: Experiencia de compra
- Explica si el código fue reconocido, conserva mensajes accesibles y permite retirarlo fácilmente.
```

### Task 6: Versiones, grafo, ZIP y verificación final

**Files:**
- Modify: `nakama-discounts/nakama-discounts.php`
- Modify: `nakama-checkout-tools.php`
- Modify: `nakama-discounts.zip`
- Modify: `nakama-checkout-tools.zip`
- Modify: `graphify-out/*` generated by `graphify update .`

**Interfaces:**
- Produces installable `nakama-discounts` version `1.2.0`.
- Produces installable `nakama-checkout-tools` version `3.4.0`.

- [x] **Step 1: Bump plugin versions**

Update both the plugin headers and their version constants where present. `nakama-discounts` becomes `1.2.0`; `nakama-checkout-tools.php` becomes `3.4.0`.

- [x] **Step 2: Run PHP syntax checks**

Run the portable PHP executable with `-l` for every modified PHP file. Expected: `No syntax errors detected` for each.

- [x] **Step 3: Run all focused PHP tests**

Run:

```powershell
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-cart-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-admin-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-discounts-admin-ui-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-checkout-tools-test.php
& 'C:\Users\jose.lopez\AppData\Local\Temp\nakama-php-8.5.11\php.exe' tests/nakama-affiliates-discounts-test.php
```

Expected: six success messages and exit 0.

- [x] **Step 4: Run focused frontend tests, lint and production build**

Run:

```powershell
npx vitest run src/app/components/AbandonedCartCoupon.test.tsx src/app/context/CartContext.test.tsx src/lib/checkout-bridge.test.ts src/app/cart/page.test.tsx src/app/checkout/page.test.tsx src/app/components/AffiliateCodeField.test.tsx
npm run lint
npm run build
```

Expected: focused tests pass, ESLint exits 0 and the Next.js static export completes.

Resultado: las 21 pruebas enfocadas y el build estático pasaron. El lint global fue ejecutado y conserva 50 errores previos fuera de este alcance; en los archivos modificados solo permanece la regla preexistente de `setState` en la redirección de `checkout/page.tsx`.

- [x] **Step 5: Rebuild ZIP artifacts reproducibly**

Create `nakama-discounts.zip` with the `nakama-discounts/` directory as its root and `nakama-checkout-tools.zip` with `nakama-checkout-tools.php` at its root. Inspect each archive listing to confirm no `.git`, tests, temporary PHP runtime or worktree paths are present.

- [x] **Step 6: Update the knowledge graph**

Run:

```powershell
graphify update .
```

Expected: the graph refreshes without an error.

- [x] **Step 7: Review the final diff and rerun `git diff --check`**

Verify that only planned source, tests, artifacts, plan and generated graph files changed; confirm there are no whitespace errors.

- [x] **Step 8: Commit the release artifacts**

```text
build(discounts): package manual promotional codes

NK-RELEASE:
Resumen: Publica el flujo completo de códigos automáticos y manuales en carrito y checkout.

Grupo: Descuentos
- Incluye validación administrativa, comparación de promociones y aplicación automática de códigos no acumulables.

Grupo: Checkout
- Revalida cada código antes del pago y mantiene una sola promoción principal.
```
