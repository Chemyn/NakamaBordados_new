# Graph Report - NakamaBordados  (2026-09-18)

## Corpus Check
- 258 files · ~4,204,881 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2017 nodes · 3884 edges · 135 communities (97 shown, 29 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 354 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ad44e2c`
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
- StockRow.tsx
- nakama-products-api.php
- ajustes.tsx
- dependencies
- useLanguage
- nakama-checkout-tools.php
- expo
- analytics.ts
- nakama-discounts-test.php
- What You Must Do When Invoked
- mobile/package.json
- products.ts
- Navbar.tsx
- terminos-y-condiciones/page.tsx
- mi-cuenta/page.tsx
- Diseño: productos de catálogo sin color y SKU manuales
- index.tsx
- package.json
- WC_Customer
- compilerOptions
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- Production Quality Review and Rework
- Nakama_Context
- nakama-changelog.php
- Nakama Drops: preventas y lanzamientos programados
- Nakama_Campaigns
- Product
- FakeOrder
- 專案上下文 (Agent Context)：NakamaBordados_new
- Navegación móvil de Mi Cuenta
- wc_price
- FakeDiscountCart
- dependencies
- devDependencies
- nakama-checkout-tools-test.php
- Nakama_Drops_Repository
- Nakama_Drops_Pricing
- Nakama Producción (app Android)
- DateTimeImmutable
- patrones.tsx
- Nakama_Drops_Admin
- currency-rate.ts
- graphify reference: extra exports and benchmark
- Selector de pago para cotizaciones en Mi Cuenta
- is_wp_error
- Nakama_Discount_Codes
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
- AuthModeTabs.test.tsx
- hero-config.ts
- nakama-changelog.test.mjs
- 📔 2026-06-04 Global Progress Overview
- graphify reference: query, path, explain
- Project DevLog: NakamaBordados_new
- products-api.ts
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
- vitest
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
- apiOrigin
- useOtaUpdate.ts
- extraction-spec.md
- eslint.config.mjs
- mobile/AGENTS.md
- vitest.config.ts
- Nakama_Admin
- OrderDetailScreen
- CartContext.tsx
- FakeCart
- Nakama_Drops_Quota
- AccountSectionNav.tsx
- Nakama_Drops_Lifecycle
- nakama-hero-manager.php
- ProductClient.tsx
- AccountEditors.tsx
- nakama_prod_push_dispatch
- mi-cuenta/page.test.tsx
- AccountProgress.tsx
- LuffyCharacter.tsx
- Nakama_Drops_REST
- Nakama_Drops_Orders
- sitemap.ts
- Nakama_Campaigns
- nakama_prod_render_page
- Nakama_Campaigns
- Nakama_Settings

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 44 edges
2. `WP_REST_Request` - 44 edges
3. `WP_Error` - 41 edges
4. `apiOrigin()` - 37 edges
5. `Nakama_Drops_Repository` - 36 edges
6. `wc_get_order()` - 28 edges
7. `Nakama_Settings` - 27 edges
8. `vitest` - 26 edges
9. `fetchGraphQL()` - 25 edges
10. `rest_ensure_response()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `nakama_changelog_git_commits()` --calls--> `get_transient()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `is_wp_error()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `sanitize_textarea_field()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `set_transient()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `wp_remote_get()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php

## Import Cycles
- None detected.

## Communities (135 total, 29 thin omitted)

### Community 0 - "nakama-discounts-admin-ui-test.php"
Cohesion: 0.16
Nodes (8): nakama_envia_render_settings_page(), nakama_prod_render_user_field(), nakama_wh_render_user_field(), checked(), Nakama_Discount_Codes, settings_errors(), settings_fields(), submit_button()

### Community 1 - "nakama-production-panel.php"
Cohesion: 0.12
Nodes (48): nakama_check_coupon_logic(), nakama_get_order_confirmation(), nakama_envia_order_meta(), nakama_prod_active_cycle(), nakama_prod_card(), nakama_prod_color_es(), nakama_prod_create_cycle(), nakama_prod_cycle_owner() (+40 more)

### Community 2 - "production-api.ts"
Cohesion: 0.09
Nodes (50): AccessState, ColState, ColVariant, EMPTY_COL, formatDuration(), ProduccionPage(), Tab, Viewer (+42 more)

### Community 3 - "nakama-warehouse.php"
Cohesion: 0.11
Nodes (53): nakama_products_bump_cache(), nakama_wh_apply_delta(), nakama_wh_apply_variation_status(), nakama_wh_catalog_maps_table(), nakama_wh_catalog_product_out(), nakama_wh_color_canonical(), nakama_wh_compare_items(), nakama_wh_effective_stock() (+45 more)

### Community 4 - "App.tsx"
Cohesion: 0.09
Nodes (38): jspdf, jszip, App(), availableGarmentPositions, getPositionSizeError(), capModelColors, capModels, GorrasConfig() (+30 more)

### Community 5 - "src/lib/warehouse-api.ts"
Cohesion: 0.10
Nodes (44): ManualCatalogSkuPanel(), Notice, AccessState, AlmacenPage(), Edit, ItemRow(), Msg, SaveState (+36 more)

### Community 6 - "auth.ts"
Cohesion: 0.09
Nodes (35): checkProductionAccess(), AuthContext, AuthProvider(), AuthValue, NO_ACCESS_MESSAGE, Status, fetchViewerName(), firstError() (+27 more)

### Community 7 - "[id].tsx"
Cohesion: 0.09
Nodes (43): Busy, styles, styles, Edits, styles, Tab, TABS, AppButton() (+35 more)

### Community 8 - "api.ts"
Cohesion: 0.13
Nodes (25): ORDER_DETAIL_KEY, ReviewInput, useOrderDetail(), ValidateInput, PRODUCTION_PDFS_KEY, useProductionPdfs(), deleteProductionPdf(), fetchProductionOrderDetail() (+17 more)

### Community 9 - "StockRow.tsx"
Cohesion: 0.10
Nodes (28): WarehouseScreen(), ProductRowComponent(), STATUS, StockRow, StockRowBase(), StockRowProps, styles, ApplyResult (+20 more)

### Community 10 - "nakama-products-api.php"
Cohesion: 0.11
Nodes (35): nakama_currency_info(), nakama_get_usd_rate(), nakama_get_usd_rate_details(), nakama_get_maintenance_status(), nakama_products_add_cors(), nakama_products_attribute_key_map(), nakama_products_build_product(), nakama_products_build_variation() (+27 more)

### Community 11 - "ajustes.tsx"
Cohesion: 0.13
Nodes (25): PushSummary, SettingsScreen(), confirmSignOut(), styles, summarize(), ApkUpdate, parseRemote(), RemoteVersion (+17 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-application, expo-build-properties, expo-constants, expo-device, expo-document-picker, expo-font (+22 more)

### Community 13 - "useLanguage"
Cohesion: 0.19
Nodes (12): CategoriesExplore(), LazyCategorySection(), ScrollContainer(), useDraggableScroll(), HeroSources, ScrollytellingHero(), useLanguage(), fetchProductsSearch() (+4 more)

### Community 14 - "nakama-checkout-tools.php"
Cohesion: 0.10
Nodes (37): nakama_add_quote_batch_to_wc_cart(), nakama_add_quote_to_wc_cart(), nakama_cart_bridge_handler(), nakama_checkout_return_url(), nakama_create_quote_order(), nakama_finalize_quote_sources(), nakama_graphql_order_quote_payment_eligible(), nakama_is_quote_request() (+29 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, package, predictiveBackGestureEnabled, projectId, expo (+20 more)

### Community 16 - "analytics.ts"
Cohesion: 0.24
Nodes (12): Analytics(), CookieBanner(), FB_PIXEL_ID, GA_MEASUREMENT_ID, isTrackingHost(), TrackedProduct, trackPageView(), Window (+4 more)

### Community 17 - "nakama-discounts-test.php"
Cohesion: 0.14
Nodes (6): add_settings_error(), current_datetime(), Nakama_Context, Nakama_Customer_History, Nakama_Settings, wp_generate_uuid4()

### Community 18 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 19 - "mobile/package.json"
Cohesion: 0.05
Nodes (39): devDependencies, @types/react, typescript, react, @types/react, typescript, main, name (+31 more)

### Community 20 - "products.ts"
Cohesion: 0.07
Nodes (49): CATEGORIES, fetchProductById(), fetchProducts(), fetchProductsByCategory(), getProductsByCategory(), PRODUCTS, addToCart(), checkout() (+41 more)

### Community 21 - "Navbar.tsx"
Cohesion: 0.13
Nodes (22): react-dom, CartPage(), router, CheckoutPage(), router, AbandonedCartCoupon(), Navbar(), SearchBar() (+14 more)

### Community 22 - "terminos-y-condiciones/page.tsx"
Cohesion: 0.07
Nodes (24): h2Style, leadStyle, liStyle, markerStyle, PrivacyPage(), pStyle, secStyle, ulStyle (+16 more)

### Community 23 - "mi-cuenta/page.tsx"
Cohesion: 0.16
Nodes (17): MAINTENANCE_ENDPOINT(), MaintenanceToggle(), formatEventTime(), isTrackProblem(), MiCuentaPage(), ORDER_STATUS_ES, ORDER_STEPS, orderStatusLabel() (+9 more)

### Community 24 - "Diseño: productos de catálogo sin color y SKU manuales"
Cohesion: 0.10
Nodes (20): 1. Registro dedicado de asignaciones — aceptada, 2. Metadatos de WooCommerce únicamente — descartada, 3. Override manual por ID — descartada, Alternativas consideradas, APK, Arquitectura de datos, Colores y datos heredados, Contratos REST (+12 more)

### Community 25 - "index.tsx"
Cohesion: 0.18
Nodes (14): badge(), BoardScreen(), styles, OrderCard, OrderCardProps, styles, ProgressBar(), ORDERS_KEY (+6 more)

### Community 26 - "package.json"
Cohesion: 0.11
Nodes (17): react, @types/react, typescript, name, private, version, bootstrap, bootstrap-icons (+9 more)

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

### Community 33 - "nakama-changelog.php"
Cohesion: 0.11
Nodes (24): nakama_changelog_commit_items(), nakama_changelog_commit_paragraphs(), nakama_changelog_commit_release_id(), nakama_changelog_commit_subject(), nakama_changelog_date_display(), nakama_changelog_enqueue_styles(), nakama_changelog_entries(), nakama_changelog_git_commits() (+16 more)

### Community 34 - "Nakama Drops: preventas y lanzamientos programados"
Cohesion: 0.05
Nodes (41): Accesibilidad y movimiento, API pública, Arquitectura, Aviso de preventa, Borrador, Campañas, Cancelación previa, Carritos abiertos durante el lanzamiento (+33 more)

### Community 35 - "Nakama_Campaigns"
Cohesion: 0.18
Nodes (3): Nakama_Context, Nakama_Campaigns, Nakama_Engine

### Community 36 - "Product"
Cohesion: 0.12
Nodes (24): DropCard(), DropCardProps, DropCountdown(), DropCountdownProps, twoDigits(), getPricing(), ProductPrice(), copy (+16 more)

### Community 37 - "FakeOrder"
Cohesion: 0.04
Nodes (6): FakeCreatedOrder, FakeOrder, FakeTransferSource, WC_Abstract_Order, wc_create_order(), WC_Order_Item_Fee

### Community 38 - "專案上下文 (Agent Context)：NakamaBordados_new"
Cohesion: 0.17
Nodes (10): 🎯 1. 專案目標 (Project Goal), 🛠️ 2. 技術棧與環境 (Tech Stack & Environment), 📂 3. 核心目錄結構 (Core Structure), 🏛️ 4. 架構與設計約定 (Architecture & Conventions), 🚦 5. 目前進度與待辦 (Current Status & TODO), 原始設定檔, 專案上下文 (Agent Context)：NakamaBordados_new, Deploy on Vercel (+2 more)

### Community 39 - "Navegación móvil de Mi Cuenta"
Cohesion: 0.17
Nodes (11): 1. Visibilidad responsive mediante CSS — elegida, 2. Renderizado condicional mediante JavaScript, 3. Eliminar los accesos en todos los tamaños, Alternativas consideradas, Diseño final, Navegación móvil de Mi Cuenta, Registro de decisiones, Resultado de implementación (+3 more)

### Community 40 - "wc_price"
Cohesion: 0.22
Nodes (3): Nakama_MSI, wc_price(), wp_kses_post()

### Community 41 - "FakeDiscountCart"
Cohesion: 0.18
Nodes (3): FakeDiscountCart, FakeDiscountSession, FakeDiscountWooCommerce

### Community 42 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, bootstrap, bootstrap-icons, isomorphic-dompurify, jose, jspdf, jszip (+4 more)

### Community 43 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+4 more)

### Community 44 - "nakama-checkout-tools-test.php"
Cohesion: 0.07
Nodes (14): nakama_logout_session(), nakama_sso_set_cookie(), nakama_update_account_profile(), nakama_prod_save_user_field(), nakama_wh_save_user_field(), FakeCheckoutOrder, FakeErrors, FakeFee (+6 more)

### Community 47 - "Nakama Producción (app Android)"
Cohesion: 0.18
Nodes (10): 1. Cuenta de Expo / EAS, 2. Firebase (necesario para las notificaciones), 3. Plugin de WordPress, 4. Login social, Cómo trabajar en el proyecto, Estructura, Nakama Producción (app Android), Notas (+2 more)

### Community 48 - "DateTimeImmutable"
Cohesion: 0.22
Nodes (5): DateTimeImmutable, DateTimeZone, Nakama_Drops_Domain, nakama_prod_utc_rfc3339(), wp_timezone()

### Community 49 - "patrones.tsx"
Cohesion: 0.19
Nodes (13): PatternsScreen(), styles, UploadFeedback, ProdUploadFile, ProdUploadResult, uploadProductionPdf(), MobilePdfBatchResult, MobilePdfUploadFailure (+5 more)

### Community 50 - "Nakama_Drops_Admin"
Cohesion: 0.16
Nodes (3): Nakama_Drops_Admin, absint(), esc_url()

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
Cohesion: 0.23
Nodes (20): nakama_17track_carrier_code(), nakama_17track_normalize(), nakama_17track_register(), nakama_17track_request(), nakama_17track_status_es(), nakama_17track_timeline_payload(), nakama_17track_token(), nakama_envia_no_cache() (+12 more)

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

### Community 62 - "AuthContext.tsx"
Cohesion: 0.15
Nodes (17): AuthContext, AuthContextType, AuthProvider(), Customer, Order, OrderMeta, RegisterInput, AccountProfileInput (+9 more)

### Community 63 - "init-db.js"
Cohesion: 0.29
Nodes (7): bcryptjs, bcrypt, fs, main(), mysql, parseEnv(), path

### Community 64 - "clean-lang.js"
Cohesion: 0.25
Nodes (7): closeIndex, content, filePath, fs, path, restOfContent, targetIndex

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, postbuild, start, test

### Community 68 - "AuthModeTabs.test.tsx"
Cohesion: 0.21
Nodes (7): @testing-library/user-event, AUTH_MODES, AuthMode, AuthModeTabs(), AuthModeTabsProps, TrackingFeedback(), TrackingFeedbackProps

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

### Community 74 - "products-api.ts"
Cohesion: 0.17
Nodes (16): ProductsSearchResult, ProductLoader(), apiFetchDrops(), apiFetchProductBySlug(), apiFetchProducts(), canonicalAttr(), EMPTY_RESULT, HIDDEN_RULES (+8 more)

### Community 75 - "next"
Cohesion: 0.22
Nodes (4): nextConfig, next, metadata, dynamic

### Community 76 - "clone-db.js"
Cohesion: 0.40
Nodes (5): clone(), fs, mysql, parseEnv(), path

### Community 77 - "Plan de implementación: Nakama Drops"
Cohesion: 0.20
Nodes (9): 1. Núcleo del plugin y persistencia, 2. Precios, ciclo de vida y categorías, 3. Cupos, pedidos y correos, 4. Panel y API pública, 5. Dominio frontend, 6. Componentes y página `/drops/`, 7. Integraciones públicas, 8. Entrega y verificación (+1 more)

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
Cohesion: 0.18
Nodes (12): Footer(), Message, WhatsAppButton(), getServerLanguage(), getStoredLanguage(), LanguageContext, LanguageContextProps, LanguageProvider() (+4 more)

### Community 85 - "vitest"
Cohesion: 0.16
Nodes (8): @testing-library/react, vitest, BuildUpdateNotice(), BuildUpdateNoticeProps, contrast(), luminance(), mocks, transferConfirmation

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
Cohesion: 0.21
Nodes (7): buttonStyle, dividerStyle, lineStyle, SocialLoginButtons(), SocialLoginButtonsProps, socialLoginUrl(), SocialProvider

### Community 91 - "This is NOT the Next.js you know"
Cohesion: 0.50
Nodes (3): Cambios NK, graphify, This is NOT the Next.js you know

### Community 99 - "apiOrigin"
Cohesion: 0.13
Nodes (18): MaintenanceData, MaintenanceWrapper(), SocialLinks, SOCIALS, CurrencyContext, CurrencyContextProps, CurrencyData, CurrencyProvider() (+10 more)

### Community 100 - "useOtaUpdate.ts"
Cohesion: 0.33
Nodes (5): UpdateBanner(), OtaStatus, OtaUpdate, useOtaUpdate(), expo-updates

### Community 113 - "OrderDetailScreen"
Cohesion: 0.40
Nodes (4): formatDuration(), OrderDetailScreen(), ANDROID_SYSTEM_NAV_CLEARANCE, bottomActionPadding()

### Community 116 - "CartContext.tsx"
Cohesion: 0.27
Nodes (9): CartContext, CartContextType, CartItem, CartProvider(), QuoteCartItem, ValidatedCoupon, validateNativeCoupon(), trackAddToCart() (+1 more)

### Community 117 - "FakeCart"
Cohesion: 0.22
Nodes (3): FakeCart, FakeWooCommerce, WC()

### Community 119 - "AccountSectionNav.tsx"
Cohesion: 0.28
Nodes (6): AccountSection, AccountSectionId, AccountSectionNav(), AccountSectionNavProps, COMMISSIONS_SECTION, CUSTOMER_SECTIONS

### Community 121 - "nakama-hero-manager.php"
Cohesion: 0.46
Nodes (7): nakama_hero_default_config(), nakama_hero_get_config(), nakama_hero_handle_save(), nakama_hero_media_field(), nakama_hero_merge_config(), nakama_hero_render_admin_page(), nakama_hero_rest_get()

### Community 122 - "ProductClient.tsx"
Cohesion: 0.36
Nodes (5): FreeShippingBadge(), ProductClient(), ProductClientProps, trackViewContent(), isOutOfStock()

### Community 123 - "AccountEditors.tsx"
Cohesion: 0.29
Nodes (7): PersonalDetailsEditor(), PersonalDetailsProps, SaveProfile, SaveResult, ShippingAddressEditor(), ShippingAddressProps, AccountShippingInput

### Community 124 - "nakama_prod_push_dispatch"
Cohesion: 0.43
Nodes (7): nakama_prod_push_dispatch(), nakama_prod_push_save(), nakama_prod_push_send_new_order(), nakama_prod_push_tokens(), nakama_prod_push_valid(), nakama_prod_rest_push_register(), nakama_prod_rest_push_unregister()

### Community 125 - "mi-cuenta/page.test.tsx"
Cohesion: 0.29
Nodes (3): mocks, TestOrder, TestUser

### Community 126 - "AccountProgress.tsx"
Cohesion: 0.40
Nodes (4): AccountProgress(), AccountProgressProps, AccountProgressStep, steps

### Community 127 - "LuffyCharacter.tsx"
Cohesion: 0.40
Nodes (4): LUFFY_QUOTES, LuffyCharacter(), LuffyCharacterProps, LuffyExpression

### Community 130 - "sitemap.ts"
Cohesion: 0.67
Nodes (3): dynamic, sitemap(), apiFetchProductSlugs()

### Community 132 - "nakama_prod_render_page"
Cohesion: 0.67
Nodes (3): nakama_prod_render_page(), nakama_prod_render_script(), nakama_prod_render_styles()

## Knowledge Gaps
- **620 isolated node(s):** `net`, `client`, `eslintConfig`, `{ existsSync }`, `{ join }` (+615 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 941 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `production-api.ts`, `Product`, `SocialLoginButtons.tsx`, `App.tsx`, `AuthModeTabs.test.tsx`, `src/lib/warehouse-api.ts`, `OrderDetailScreen`, `currency-rate.ts`, `CartContext.tsx`, `Navbar.tsx`, `AccountSectionNav.tsx`, `AuthContext.tsx`, `package.json`, `mi-cuenta/page.test.tsx`, `AccountProgress.tsx`, `LuffyCharacter.tsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `bottomActionPadding()` connect `OrderDetailScreen` to `[id].tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `apiOrigin()` connect `apiOrigin` to `production-api.ts`, `App.tsx`, `Product`, `SocialLoginButtons.tsx`, `src/lib/warehouse-api.ts`, `products-api.ts`, `useLanguage`, `CartContext.tsx`, `products.ts`, `terminos-y-condiciones/page.tsx`, `mi-cuenta/page.tsx`, `Navbar.tsx`, `ProductClient.tsx`, `AuthContext.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `WP_Error` (e.g. with `nakama_check_coupon_logic()` and `nakama_create_quote_order()`) actually correct?**
  _`WP_Error` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Nakama_Drops_Repository` (e.g. with `.handle_save()` and `.handle_schedule()`) actually correct?**
  _`Nakama_Drops_Repository` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net`, `client`, `eslintConfig` to the rest of the system?**
  _620 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `nakama-production-panel.php` be split into smaller, more focused modules?**
  _Cohesion score 0.116701607267645 - nodes in this community are weakly interconnected._