# Graph Report - NakamaBordados  (2026-09-20)

## Corpus Check
- 283 files · ~4,225,096 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2304 nodes · 4242 edges · 159 communities (112 shown, 36 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 392 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20c36959`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- nakama-discounts-admin-ui-test.php
- nakama-production-panel.php
- production-api.ts
- nakama-warehouse.php
- App.tsx
- src/lib/warehouse-api.ts
- auth.ts
- [id].tsx
- api.ts
- almacen.tsx
- nakama-products-api.php
- mobile/package.json
- dependencies
- HomeClientComponents.tsx
- nakama-checkout-tools.php
- expo
- analytics.ts
- Nakama_Discount_Codes
- What You Must Do When Invoked
- app/_layout.tsx
- fetchGraphQL
- useLanguage
- terminos-y-condiciones/page.tsx
- mi-cuenta/page.tsx
- Diseño: productos de catálogo sin color y SKU manuales
- Entrega 1 — Acceso, código, ventas y comisión
- package.json
- WC_Customer
- compilerOptions
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- Production Quality Review and Rework
- Nakama_Context
- apiOrigin
- Nakama Drops: preventas y lanzamientos programados
- CartContext.tsx
- nakama-affiliates-permissions-test.php
- FakeOrder
- 專案上下文 (Agent Context)：NakamaBordados_new
- Navegación móvil de Mi Cuenta
- nakama-discounts-test.php
- index.tsx
- dependencies
- devDependencies
- nakama-checkout-tools-test.php
- Nakama_Drops_Repository
- Nakama_Affiliates_Permissions
- Nakama Producción (app Android)
- DateTimeImmutable
- Nakama_Admin
- Nakama_Drops_Lifecycle
- currency-rate.ts
- graphify reference: extra exports and benchmark
- Selector de pago para cotizaciones en Mi Cuenta
- is_wp_error
- AccountColors.test.ts
- Códigos públicos de descuento para Nakama Discounts
- warehouse-manual-catalog.test.mjs
- Facebook Catalog REST Endpoint
- mobile/tsconfig.json
- Nakama_Cart
- Nakama_Customer_History
- AuthContext.tsx
- init-db.js
- clean-lang.js
- Nakama_Settings
- scripts
- nakama-discounts-cart-test.php
- products.ts
- hero-config.ts
- nakama-changelog.test.mjs
- 📔 2026-06-04 Global Progress Overview
- graphify reference: query, path, explain
- Project DevLog: NakamaBordados_new
- nakama-affiliates-discounts-test.php
- next
- clone-db.js
- Plan de implementación: Nakama Drops
- Nakama_Drops_Installer
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- 📔 2026-06-19 Nakama Bordados Progress Update
- LanguageContext.tsx
- Nakama Afiliados: atribución, comisiones y programa mensual de prendas
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Changelog automático desde Git
- SocialLoginButtons.tsx
- This is NOT the Next.js you know
- check-port.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- app.config.js
- prepare-static-deployment.mjs
- HomeHero.tsx
- gracias/page.tsx
- pedido-confirmado/page.tsx
- wc_price
- extraction-spec.md
- eslint.config.mjs
- mobile/AGENTS.md
- vitest.config.ts
- nakama_create_quote_order
- translateWarehouseColor
- AccountSectionNav.tsx
- patrones.tsx
- Nakama_Affiliates_Repository
- .render
- Panel administrativo
- Modelo de datos
- AccountEditors.tsx
- Pruebas
- mi-cuenta/page.test.tsx
- Código y atribución
- nakama-hero-manager.php
- Nakama_Drops_Pricing
- Experiencia del afiliado
- FakeTransferSource
- Contrato REST
- Entregas
- Comisión y devoluciones
- Nakama_Affiliates_Codes
- vitest
- Nakama_Affiliates_Repository
- FakeCreatedOrder
- nakama-affiliates-codes-test.php
- ProductClient.tsx
- AccountProgress.tsx
- Nakama_Affiliates_REST
- FakeCart
- WP_Error
- LuffyCharacter.tsx
- .apply_cap
- nakama_prod_rest_pdf_upload
- WC_Order_Item_Fee
- Nakama_Drops_REST
- FakeLineItem
- sitemap.ts
- Nakama_Drops_Orders
- WP_REST_Request
- nakama_logout_session
- Nakama_Settings
- .save_user_fields
- FakeCheckoutOrder
- FakeFee

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 46 edges
2. `WP_Error` - 41 edges
3. `apiOrigin()` - 39 edges
4. `Nakama_Drops_Repository` - 36 edges
5. `WP_REST_Response` - 35 edges
6. `vitest` - 30 edges
7. `wc_get_order()` - 28 edges
8. `Nakama_Settings` - 27 edges
9. `fetchGraphQL()` - 25 edges
10. `is_wp_error()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `nakama_envia_order_meta()` --calls--> `wc_get_order()`  [INFERRED]
  nakama-envia-tracking.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `is_wp_error()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `sanitize_textarea_field()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `wp_remote_get()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `wp_remote_retrieve_body()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php

## Import Cycles
- None detected.

## Communities (159 total, 36 thin omitted)

### Community 0 - "nakama-discounts-admin-ui-test.php"
Cohesion: 0.13
Nodes (3): Nakama_Campaigns, Nakama_Discount_Codes, Nakama_Settings

### Community 1 - "nakama-production-panel.php"
Cohesion: 0.14
Nodes (32): nakama_prod_card(), nakama_prod_cycle_review(), nakama_prod_cycles_table(), nakama_prod_ensure_finished_cycle(), nakama_prod_install_schema(), nakama_prod_item_images(), nakama_prod_latest_cycle(), nakama_prod_latest_rework() (+24 more)

### Community 2 - "production-api.ts"
Cohesion: 0.09
Nodes (51): AccessState, ColState, ColVariant, EMPTY_COL, formatDuration(), ProduccionPage(), Tab, Viewer (+43 more)

### Community 3 - "nakama-warehouse.php"
Cohesion: 0.07
Nodes (64): nakama_prod_color_es(), nakama_prod_item_attributes(), nakama_products_bump_cache(), nakama_wh_apply_delta(), nakama_wh_apply_variation_status(), nakama_wh_catalog_maps_table(), nakama_wh_catalog_product_out(), nakama_wh_color_canonical() (+56 more)

### Community 4 - "App.tsx"
Cohesion: 0.09
Nodes (38): jspdf, jszip, App(), availableGarmentPositions, getPositionSizeError(), capModelColors, capModels, GorrasConfig() (+30 more)

### Community 5 - "src/lib/warehouse-api.ts"
Cohesion: 0.11
Nodes (42): ManualCatalogSkuPanel(), Notice, AccessState, AlmacenPage(), Edit, ItemRow(), Msg, SaveState (+34 more)

### Community 6 - "auth.ts"
Cohesion: 0.08
Nodes (38): checkProductionAccess(), AuthContext, AuthProvider(), AuthValue, NO_ACCESS_MESSAGE, Status, fetchViewerName(), firstError() (+30 more)

### Community 7 - "[id].tsx"
Cohesion: 0.09
Nodes (40): Busy, styles, styles, AppButton(), AppButtonProps, PALETTE, styles, Variant (+32 more)

### Community 8 - "api.ts"
Cohesion: 0.11
Nodes (31): OrderCardProps, ORDER_DETAIL_KEY, ReviewInput, useOrderDetail(), ValidateInput, ORDERS_KEY, useOrders(), PRODUCTION_PDFS_KEY (+23 more)

### Community 9 - "almacen.tsx"
Cohesion: 0.12
Nodes (26): Edits, styles, Tab, TABS, WarehouseScreen(), SegmentOption, StockRow, StockRowProps (+18 more)

### Community 10 - "nakama-products-api.php"
Cohesion: 0.06
Nodes (53): nakama_changelog_commit_items(), nakama_changelog_commit_paragraphs(), nakama_changelog_commit_release_id(), nakama_changelog_commit_subject(), nakama_changelog_date_display(), nakama_changelog_enqueue_styles(), nakama_changelog_entries(), nakama_changelog_git_commits() (+45 more)

### Community 11 - "mobile/package.json"
Cohesion: 0.05
Nodes (51): devDependencies, @types/react, typescript, react, @types/react, typescript, main, name (+43 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-application, expo-build-properties, expo-constants, expo-device, expo-document-picker, expo-font (+22 more)

### Community 13 - "HomeClientComponents.tsx"
Cohesion: 0.19
Nodes (10): CategoriesExplore(), LazyCategorySection(), ScrollContainer(), useDraggableScroll(), HeroSources, ScrollytellingHero(), fetchProductsSearch(), HeroSources (+2 more)

### Community 14 - "nakama-checkout-tools.php"
Cohesion: 0.12
Nodes (34): nakama_add_quote_batch_to_wc_cart(), nakama_add_quote_to_wc_cart(), nakama_cart_bridge_handler(), nakama_checkout_bridge_apply_promotion(), nakama_checkout_return_url(), nakama_currency_info(), nakama_finalize_quote_sources(), nakama_get_order_confirmation() (+26 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, package, predictiveBackGestureEnabled, projectId, expo (+20 more)

### Community 16 - "analytics.ts"
Cohesion: 0.24
Nodes (12): Analytics(), CookieBanner(), FB_PIXEL_ID, GA_MEASUREMENT_ID, isTrackingHost(), TrackedProduct, trackPageView(), Window (+4 more)

### Community 17 - "Nakama_Discount_Codes"
Cohesion: 0.16
Nodes (5): Nakama_Discount_Codes, current_datetime(), sanitize_key(), wp_generate_uuid4(), wp_timezone()

### Community 18 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 19 - "app/_layout.tsx"
Cohesion: 0.17
Nodes (11): queryClient, RootNavigator(), styles, LoginScreen(), TabsLayout(), useWarehouseAccess(), useAuth(), expo-font (+3 more)

### Community 20 - "fetchGraphQL"
Cohesion: 0.08
Nodes (43): fetchProductById(), addToCart(), checkout(), emptyCart(), fetchCart(), fetchCheckoutData(), getAuthHeaders(), getSessionToken() (+35 more)

### Community 21 - "useLanguage"
Cohesion: 0.22
Nodes (17): CartPage(), CheckoutPage(), AbandonedCartCoupon(), AffiliateCodeField(), Navbar(), SearchBar(), useAuth(), useCart() (+9 more)

### Community 22 - "terminos-y-condiciones/page.tsx"
Cohesion: 0.07
Nodes (24): h2Style, leadStyle, liStyle, markerStyle, PrivacyPage(), pStyle, secStyle, ulStyle (+16 more)

### Community 23 - "mi-cuenta/page.tsx"
Cohesion: 0.16
Nodes (19): formatEventTime(), isTrackProblem(), MiCuentaPage(), ORDER_STATUS_ES, ORDER_STEPS, orderStatusLabel(), orderStatusSlug(), orderStepIndex() (+11 more)

### Community 24 - "Diseño: productos de catálogo sin color y SKU manuales"
Cohesion: 0.10
Nodes (20): 1. Registro dedicado de asignaciones — aceptada, 2. Metadatos de WooCommerce únicamente — descartada, 3. Override manual por ID — descartada, Alternativas consideradas, APK, Arquitectura de datos, Colores y datos heredados, Contratos REST (+12 more)

### Community 25 - "Entrega 1 — Acceso, código, ventas y comisión"
Cohesion: 0.06
Nodes (35): Capacidades, Condiciones para reanudar la facturación automática, Contrato técnico que se construirá, Convenciones de ejecución, Entrega 1 — Acceso, código, ventas y comisión, Entrega 2 — Cierres, retenciones manuales y pagos, Entrega 3 — Prendas, metas y evidencias, Límites invariables de esta versión (+27 more)

### Community 26 - "package.json"
Cohesion: 0.11
Nodes (18): react, @types/react, typescript, name, private, version, bootstrap, bootstrap-icons (+10 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 29 - "NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan"
Cohesion: 0.11
Nodes (17): 1. Hostinger Node.js Hosting Setup Choices, 2. Database Schema (Normalized MySQL), Architecture Overview & Pre-requisites, NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan, Phase 1: Dependencies & Environment, Phase 2: Database Migration & Schema Creation, Phase 3: Native Authentication Setup, Phase 4: Data Layer Refactoring (GraphQL Deprecation) (+9 more)

### Community 30 - "NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan"
Cohesion: 0.11
Nodes (17): 1. Hostinger Node.js Hosting Setup Choices, 2. Database Schema (Normalized MySQL), Architecture Overview & Pre-requisites, NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan, Phase 1: Dependencies & Environment, Phase 2: Database Migration & Schema Creation, Phase 3: Native Authentication Setup, Phase 4: Data Layer Refactoring (GraphQL Deprecation) (+9 more)

### Community 31 - "Production Quality Review and Rework"
Cohesion: 0.12
Nodes (16): API changes, Architecture, Assumptions and constraints, Decision log, Migration and rollout, `nakama_prod_cycles`, `nakama_prod_review_items`, `nakama_prod_reviews` (+8 more)

### Community 33 - "apiOrigin"
Cohesion: 0.26
Nodes (8): MAINTENANCE_ENDPOINT(), MaintenanceToggle(), MaintenanceData, SocialLinks, SOCIALS, apiOrigin(), socialLoginUrl(), SocialProvider

### Community 34 - "Nakama Drops: preventas y lanzamientos programados"
Cohesion: 0.05
Nodes (41): Accesibilidad y movimiento, API pública, Arquitectura, Aviso de preventa, Borrador, Campañas, Cancelación previa, Carritos abiertos durante el lanzamiento (+33 more)

### Community 35 - "CartContext.tsx"
Cohesion: 0.18
Nodes (19): CartContext, CartContextType, CartItem, CartProvider(), getVariationAttr(), QuoteCartItem, ValidatedCoupon, validateNativeCoupon() (+11 more)

### Community 38 - "專案上下文 (Agent Context)：NakamaBordados_new"
Cohesion: 0.17
Nodes (10): 🎯 1. 專案目標 (Project Goal), 🛠️ 2. 技術棧與環境 (Tech Stack & Environment), 📂 3. 核心目錄結構 (Core Structure), 🏛️ 4. 架構與設計約定 (Architecture & Conventions), 🚦 5. 目前進度與待辦 (Current Status & TODO), 原始設定檔, 專案上下文 (Agent Context)：NakamaBordados_new, Deploy on Vercel (+2 more)

### Community 39 - "Navegación móvil de Mi Cuenta"
Cohesion: 0.17
Nodes (11): 1. Visibilidad responsive mediante CSS — elegida, 2. Renderizado condicional mediante JavaScript, 3. Eliminar los accesos en todos los tamaños, Alternativas consideradas, Diseño final, Navegación móvil de Mi Cuenta, Registro de decisiones, Resultado de implementación (+3 more)

### Community 40 - "nakama-discounts-test.php"
Cohesion: 0.12
Nodes (4): Nakama_Campaigns, Nakama_Context, Nakama_Customer_History, Nakama_Settings

### Community 41 - "index.tsx"
Cohesion: 0.19
Nodes (12): badge(), BoardScreen(), styles, SegmentedTabs(), UpdateBanner(), OtaStatus, OtaUpdate, useOtaUpdate() (+4 more)

### Community 42 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, bootstrap, bootstrap-icons, isomorphic-dompurify, jose, jspdf, jszip (+4 more)

### Community 43 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+4 more)

### Community 44 - "nakama-checkout-tools-test.php"
Cohesion: 0.10
Nodes (5): FakeErrors, FakeResponse, is_wc_endpoint_url(), rest_ensure_response(), WP_User

### Community 46 - "Nakama_Affiliates_Permissions"
Cohesion: 0.22
Nodes (4): Nakama_Affiliates_Permissions, nakama_prod_render_user_field(), nakama_wh_render_user_field(), wp_nonce_field()

### Community 47 - "Nakama Producción (app Android)"
Cohesion: 0.18
Nodes (10): 1. Cuenta de Expo / EAS, 2. Firebase (necesario para las notificaciones), 3. Plugin de WordPress, 4. Login social, Cómo trabajar en el proyecto, Estructura, Nakama Producción (app Android), Notas (+2 more)

### Community 48 - "DateTimeImmutable"
Cohesion: 0.19
Nodes (6): DateTimeImmutable, DateTimeInterface, DateTimeZone, Nakama_Drops_Domain, DateTimeZone, WP_REST_Request

### Community 50 - "Nakama_Drops_Lifecycle"
Cohesion: 0.13
Nodes (4): Nakama_Drops_Admin, Nakama_Drops_Lifecycle, absint(), esc_url()

### Community 51 - "currency-rate.ts"
Cohesion: 0.33
Nodes (7): applyUsdMarkup(), fetchJson(), fetchUsdRate(), FetchUsdRateOptions, isValidRate(), StoredUsdRate, UsdRateResult

### Community 52 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 53 - "Selector de pago para cotizaciones en Mi Cuenta"
Cohesion: 0.22
Nodes (8): Alternativas consideradas, Casos límite y errores, Diseño aprobado, Estrategia de pruebas, Registro de decisiones, Resumen de entendimiento, Selector de pago para cotizaciones en Mi Cuenta, Supuestos no funcionales

### Community 54 - "is_wp_error"
Cohesion: 0.26
Nodes (19): nakama_17track_carrier_code(), nakama_17track_normalize(), nakama_17track_register(), nakama_17track_request(), nakama_17track_status_es(), nakama_17track_timeline_payload(), nakama_17track_token(), nakama_envia_no_cache() (+11 more)

### Community 56 - "Códigos públicos de descuento para Nakama Discounts"
Cohesion: 0.08
Nodes (23): Administración, Beneficios complementarios, Campo manual del checkout headless, Contexto, Criterios de aceptación, Códigos públicos de descuento para Nakama Discounts, Errores y casos límite, Formulario (+15 more)

### Community 57 - "warehouse-manual-catalog.test.mjs"
Cohesion: 0.22
Nodes (8): changelog, changelogPath, nextPanelPath, production, productionPath, projectRoot, warehouse, warehousePath

### Community 58 - "Facebook Catalog REST Endpoint"
Cohesion: 0.25
Nodes (7): Assumptions, Decision log, Facebook Catalog REST Endpoint, Final design, Reliability and security, Understanding summary, Validation

### Community 59 - "mobile/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, paths, strict, exclude, extends, include, expo/tsconfig.base

### Community 60 - "Nakama_Cart"
Cohesion: 0.10
Nodes (3): Nakama_Affiliates_Discounts, Nakama_Cart, do_action()

### Community 62 - "AuthContext.tsx"
Cohesion: 0.15
Nodes (17): AuthContext, AuthContextType, AuthProvider(), Customer, Order, OrderMeta, RegisterInput, AccountProfileInput (+9 more)

### Community 63 - "init-db.js"
Cohesion: 0.29
Nodes (7): bcryptjs, bcrypt, fs, main(), mysql, parseEnv(), path

### Community 64 - "clean-lang.js"
Cohesion: 0.25
Nodes (7): closeIndex, content, filePath, fs, path, restOfContent, targetIndex

### Community 65 - "Nakama_Settings"
Cohesion: 0.10
Nodes (4): Nakama_Context, Nakama_Campaigns, Nakama_Engine, Nakama_Settings

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, postbuild, start, test

### Community 67 - "nakama-discounts-cart-test.php"
Cohesion: 0.09
Nodes (4): FakeDiscountCart, FakeDiscountOrder, FakeDiscountSession, FakeDiscountWooCommerce

### Community 68 - "products.ts"
Cohesion: 0.10
Nodes (25): CATEGORIES, fetchProducts(), fetchProductsByCategory(), getProductsByCategory(), PRODUCTS, ProductsSearchResult, DropsClient(), metadata (+17 more)

### Community 69 - "hero-config.ts"
Cohesion: 0.33
Nodes (6): DEFAULT_HERO_CONFIG, getHeroConfig(), HeroConfig, HeroPageMedia, HeroVideoSources, normalizeConfig()

### Community 70 - "nakama-changelog.test.mjs"
Cohesion: 0.29
Nodes (6): heroPath, plugin, pluginPath, projectRoot, stylesheet, stylesheetPath

### Community 71 - "📔 2026-06-04 Global Progress Overview"
Cohesion: 0.33
Nodes (5): 📔 2026-06-04 Global Progress Overview, ✅ Global Action Items, 🧠 Improvements & Learnings, 🏴‍☠️ NakamaBordados_new, 📁 Project Tracking

### Community 72 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 73 - "Project DevLog: NakamaBordados_new"
Cohesion: 0.33
Nodes (5): 🛠️ Execution Details & Changes, ⏭️ Next Steps, Project DevLog: NakamaBordados_new, 🚀 Technical Implementation, 🚨 Troubleshooting

### Community 74 - "nakama-affiliates-discounts-test.php"
Cohesion: 0.14
Nodes (6): AffiliateDiscountCart, AffiliateDiscountSession, AffiliateDiscountWoo, Nakama_Affiliates_Codes, Nakama_Cart, WC()

### Community 75 - "next"
Cohesion: 0.22
Nodes (4): nextConfig, next, metadata, dynamic

### Community 76 - "clone-db.js"
Cohesion: 0.40
Nodes (5): clone(), fs, mysql, parseEnv(), path

### Community 77 - "Plan de implementación: Nakama Drops"
Cohesion: 0.20
Nodes (9): 1. Núcleo del plugin y persistencia, 2. Precios, ciclo de vida y categorías, 3. Cupos, pedidos y correos, 4. Panel y API pública, 5. Dominio frontend, 6. Componentes y página `/drops/`, 7. Integraciones públicas, 8. Entrega y verificación (+1 more)

### Community 78 - "Nakama_Drops_Installer"
Cohesion: 0.11
Nodes (4): Nakama_Affiliates_Installer, Nakama_Drops_Installer, AffiliateInstallerWpdb, dbDelta()

### Community 79 - "Project DevLog: NakamaBordados_new"
Cohesion: 0.40
Nodes (4): 🛠️ Execution Details & Changes, ⏭️ Next Steps, Project DevLog: NakamaBordados_new, 🚨 Troubleshooting

### Community 80 - "Project DevLog: NakamaBordados_new"
Cohesion: 0.40
Nodes (4): 🛠️ Execution Details & Changes, ⏭️ Next Steps, Project DevLog: NakamaBordados_new, 🚨 Troubleshooting

### Community 81 - "Project DevLog: NakamaBordados_new"
Cohesion: 0.40
Nodes (4): 🛠️ Execution Details & Changes, ⏭️ Next Steps, Project DevLog: NakamaBordados_new, 🚨 Troubleshooting

### Community 82 - "Project DevLog: NakamaBordados_new"
Cohesion: 0.40
Nodes (4): ✅ Accomplishments, 🚩 Challenges & Solutions, ⏭️ Next Steps, Project DevLog: NakamaBordados_new

### Community 83 - "📔 2026-06-19 Nakama Bordados Progress Update"
Cohesion: 0.40
Nodes (4): 📔 2026-06-19 Nakama Bordados Progress Update, 🧠 Improvements & Learnings, 🏴‍☠️ NakamaBordados_new, 📁 Project Tracking

### Community 84 - "LanguageContext.tsx"
Cohesion: 0.15
Nodes (14): Footer(), MaintenanceWrapper(), Message, WhatsAppButton(), getServerLanguage(), getStoredLanguage(), Language, LanguageContext (+6 more)

### Community 85 - "Nakama Afiliados: atribución, comisiones y programa mensual de prendas"
Cohesion: 0.12
Nodes (16): Arquitectura, Capacidades y acceso, Cierre y pago mensual, Contexto, Criterios de aceptación, Decisiones aprobadas, Errores y recuperación, Estructura del plugin (+8 more)

### Community 86 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 87 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 88 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 89 - "Changelog automático desde Git"
Cohesion: 0.50
Nodes (3): Changelog automático desde Git, Cómo escribir una actualización, Sincronización y recuperación

### Community 90 - "SocialLoginButtons.tsx"
Cohesion: 0.20
Nodes (7): buttonStyle, dividerStyle, lineStyle, SocialLoginButtons(), SocialLoginButtonsProps, AuthGateModal(), AuthGateModalProps

### Community 91 - "This is NOT the Next.js you know"
Cohesion: 0.50
Nodes (3): Cambios NK, graphify, This is NOT the Next.js you know

### Community 99 - "pedido-confirmado/page.tsx"
Cohesion: 0.25
Nodes (9): BankAccount, formatDate(), formatTotal(), JOURNEY, journeyIndex(), OrderConfirmation, PedidoConfirmadoPage(), mocks (+1 more)

### Community 100 - "wc_price"
Cohesion: 0.22
Nodes (3): Nakama_MSI, wc_price(), wp_kses_post()

### Community 111 - "nakama_create_quote_order"
Cohesion: 0.19
Nodes (13): nakama_check_coupon_logic(), nakama_create_quote_order(), nakama_quote_pdf_upload(), nakama_register_customer(), nakama_social_new_user_role(), nakama_update_account_profile(), WP_REST_Request, nakama_prod_rest_orders() (+5 more)

### Community 113 - "translateWarehouseColor"
Cohesion: 0.32
Nodes (6): ProductRowComponent(), StockRowBase(), COLOR_TRANSLATIONS, normalizeColorLookup(), translateWarehouseColor(), approvedCases

### Community 116 - "AccountSectionNav.tsx"
Cohesion: 0.12
Nodes (13): @testing-library/user-event, AccountSection, AccountSectionId, AccountSectionNav(), AccountSectionNavProps, COMMISSIONS_SECTION, CUSTOMER_SECTIONS, AUTH_MODES (+5 more)

### Community 117 - "patrones.tsx"
Cohesion: 0.12
Nodes (17): formatDuration(), OrderDetailScreen(), PatternsScreen(), styles, UploadFeedback, ProdUploadFile, ProdUploadResult, uploadProductionPdf() (+9 more)

### Community 119 - ".render"
Cohesion: 0.29
Nodes (7): nakama_envia_render_settings_page(), nakama_extract_tracking(), nakama_find_item_tracking(), nakama_find_order_tracking(), nakama_prod_maybe_complete_approved(), settings_fields(), submit_button()

### Community 120 - "Panel administrativo"
Cohesion: 0.25
Nodes (8): Afiliados, Configuración, Documentos fiscales, Evidencias, Panel administrativo, Prendas, Resumen, Ventas, cierres y pagos

### Community 121 - "Modelo de datos"
Cohesion: 0.29
Nodes (7): Auditoría, Beneficios y solicitudes, Cierres mensuales, Evidencias, Modelo de datos, Movimientos de comisión, Perfiles de afiliado

### Community 122 - "AccountEditors.tsx"
Cohesion: 0.29
Nodes (7): PersonalDetailsEditor(), PersonalDetailsProps, SaveProfile, SaveResult, ShippingAddressEditor(), ShippingAddressProps, AccountShippingInput

### Community 123 - "Pruebas"
Cohesion: 0.29
Nodes (7): Descuentos y checkout, Dominio y persistencia, Empaquetado, Interfaz, Permisos y privacidad, Programa de prendas, Pruebas

### Community 124 - "mi-cuenta/page.test.tsx"
Cohesion: 0.29
Nodes (3): mocks, TestOrder, TestUser

### Community 125 - "Código y atribución"
Cohesion: 0.33
Nodes (6): Aplicación manual, Creación, Código y atribución, Enlace personal, Exclusividad promocional, Fotografía en el pedido

### Community 126 - "nakama-hero-manager.php"
Cohesion: 0.39
Nodes (8): nakama_hero_default_config(), nakama_hero_get_config(), nakama_hero_media_field(), nakama_hero_merge_config(), nakama_hero_render_admin_page(), nakama_hero_rest_get(), esc_html_e(), settings_errors()

### Community 128 - "Experiencia del afiliado"
Cohesion: 0.50
Nodes (4): Acceso desde Mi Cuenta, Dashboard aprobado, Experiencia del afiliado, Lenguaje visual

### Community 130 - "Contrato REST"
Cohesion: 0.50
Nodes (4): Administración, Afiliado, Aplicación de código, Contrato REST

### Community 131 - "Entregas"
Cohesion: 0.50
Nodes (4): Entrega 1: núcleo de afiliados, Entrega 2: operación mensual, Entrega 3: programa de prendas, Entregas

### Community 136 - "vitest"
Cohesion: 0.09
Nodes (19): @testing-library/react, vitest, cartContext, router, cartContext, checkoutMocks, router, mocks (+11 more)

### Community 139 - "nakama-affiliates-codes-test.php"
Cohesion: 0.15
Nodes (4): AffiliateCodeUser, Nakama_Affiliates_Permissions, Nakama_Affiliates_Profiles, Nakama_Affiliates_Repository

### Community 140 - "ProductClient.tsx"
Cohesion: 0.12
Nodes (26): DropCard(), DropCardProps, DropCountdown(), DropCountdownProps, twoDigits(), FreeShippingBadge(), getPricing(), ProductPrice() (+18 more)

### Community 141 - "AccountProgress.tsx"
Cohesion: 0.40
Nodes (4): AccountProgress(), AccountProgressProps, AccountProgressStep, steps

### Community 143 - "FakeCart"
Cohesion: 0.18
Nodes (3): FakeCart, FakeWooCommerce, WC()

### Community 144 - "WP_Error"
Cohesion: 0.30
Nodes (16): nakama_prod_active_cycle(), nakama_prod_create_cycle(), nakama_prod_cycle_owner(), nakama_prod_human_duration(), nakama_prod_order_progress(), nakama_prod_rest_finish(), nakama_prod_rest_finish_v2(), nakama_prod_rest_pdf_delete() (+8 more)

### Community 145 - "LuffyCharacter.tsx"
Cohesion: 0.40
Nodes (4): LUFFY_QUOTES, LuffyCharacter(), LuffyCharacterProps, LuffyExpression

### Community 147 - "nakama_prod_rest_pdf_upload"
Cohesion: 0.50
Nodes (5): nakama_prod_normalize_sku(), nakama_prod_product_by_sku(), nakama_prod_rest_pdf_upload(), nakama_prod_sku_suggestions(), get_post_status()

### Community 151 - "sitemap.ts"
Cohesion: 0.67
Nodes (3): dynamic, sitemap(), apiFetchProductSlugs()

### Community 154 - "nakama_logout_session"
Cohesion: 0.50
Nodes (4): nakama_logout_session(), nakama_sso_set_cookie(), wp_clear_auth_cookie(), wp_set_current_user()

### Community 156 - ".save_user_fields"
Cohesion: 0.33
Nodes (5): nakama_hero_handle_save(), nakama_prod_save_user_field(), nakama_wh_save_user_field(), wp_verify_nonce(), add_settings_error()

## Knowledge Gaps
- **711 isolated node(s):** `net`, `client`, `eslintConfig`, `{ existsSync }`, `{ join }` (+706 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1135 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `production-api.ts`, `pedido-confirmado/page.tsx`, `App.tsx`, `CartContext.tsx`, `src/lib/warehouse-api.ts`, `ProductClient.tsx`, `AccountProgress.tsx`, `LuffyCharacter.tsx`, `currency-rate.ts`, `AccountSectionNav.tsx`, `useLanguage`, `fetchGraphQL`, `AccountColors.test.ts`, `mi-cuenta/page.tsx`, `patrones.tsx`, `package.json`, `mi-cuenta/page.test.tsx`, `AuthContext.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `bottomActionPadding()` connect `patrones.tsx` to `[id].tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `apiOrigin()` connect `apiOrigin` to `production-api.ts`, `CartContext.tsx`, `App.tsx`, `pedido-confirmado/page.tsx`, `products.ts`, `src/lib/warehouse-api.ts`, `vitest`, `ProductClient.tsx`, `HomeClientComponents.tsx`, `LanguageContext.tsx`, `fetchGraphQL`, `terminos-y-condiciones/page.tsx`, `mi-cuenta/page.tsx`, `AuthContext.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `WP_Error` (e.g. with `nakama_check_coupon_logic()` and `nakama_create_quote_order()`) actually correct?**
  _`WP_Error` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Nakama_Drops_Repository` (e.g. with `.handle_save()` and `.handle_schedule()`) actually correct?**
  _`Nakama_Drops_Repository` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `WP_REST_Response` (e.g. with `nakama_prod_rest_finish()` and `nakama_prod_rest_finish_v2()`) actually correct?**
  _`WP_REST_Response` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net`, `client`, `eslintConfig` to the rest of the system?**
  _711 weakly-connected nodes found - possible documentation gaps or missing edges._