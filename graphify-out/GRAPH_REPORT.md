# Graph Report - NakamaBordados  (2026-09-09)

## Corpus Check
- 220 files · ~4,178,448 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1655 nodes · 3352 edges · 108 communities (81 shown, 21 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 327 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6af1a16`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- products.ts
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
- terminos-y-condiciones/page.tsx
- nakama-checkout-tools.php
- expo
- app/layout.tsx
- useLanguage
- What You Must Do When Invoked
- push.ts
- fetchGraphQL
- AuthContext.tsx
- SocialLoginButtons.tsx
- mi-cuenta/page.tsx
- Diseño: productos de catálogo sin color y SKU manuales
- index.tsx
- package.json
- ProductClient.tsx
- compilerOptions
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan
- Production Quality Review and Rework
- Nakama_Context
- nakama-changelog.php
- patrones.tsx
- Nakama_Settings
- apiOrigin
- FakeOrder
- 專案上下文 (Agent Context)：NakamaBordados_new
- Navegación móvil de Mi Cuenta
- Nakama_Account
- products-api.ts
- dependencies
- devDependencies
- nakama-checkout-tools-test.php
- esc_html
- get_current_user_id
- Nakama Producción (app Android)
- WP_REST_Request
- Nakama_Admin
- UpdateBanner.tsx
- currency-rate.ts
- graphify reference: extra exports and benchmark
- Selector de pago para cotizaciones en Mi Cuenta
- vitest
- Nakama_Campaigns
- AccountSectionNav.tsx
- warehouse-manual-catalog.test.mjs
- Facebook Catalog REST Endpoint
- mobile/tsconfig.json
- Nakama_Cart
- Nakama_Customer_History
- quote-payment.ts
- init-db.js
- clean-lang.js
- FakeCart
- scripts
- AuthModeTabs.test.tsx
- page.test.tsx
- hero-config.ts
- nakama-changelog.test.mjs
- 📔 2026-06-04 Global Progress Overview
- graphify reference: query, path, explain
- Project DevLog: NakamaBordados_new
- OrderDetailScreen
- next
- clone-db.js
- AccountProgress.tsx
- LuffyCharacter.tsx
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- 📔 2026-06-19 Nakama Bordados Progress Update
- FakeCheckoutOrder
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Changelog automático desde Git
- AccountColors.test.ts
- This is NOT the Next.js you know
- check-port.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- app.config.js
- prepare-static-deployment.mjs
- HomeHero.tsx
- gracias/page.tsx
- extraction-spec.md
- eslint.config.mjs
- mobile/AGENTS.md
- vitest.config.ts

## God Nodes (most connected - your core abstractions)
1. `WP_REST_Request` - 42 edges
2. `useLanguage()` - 40 edges
3. `WP_Error` - 39 edges
4. `apiOrigin()` - 34 edges
5. `Nakama_Settings` - 27 edges
6. `wc_get_order()` - 27 edges
7. `fetchGraphQL()` - 25 edges
8. `sanitize_text_field()` - 24 edges
9. `get_option()` - 24 edges
10. `is_wp_error()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `nakama_envia_order_meta()` --calls--> `wc_get_order()`  [INFERRED]
  nakama-envia-tracking.php → tests/nakama-checkout-tools-test.php
- `nakama_wh_save_user_field()` --calls--> `sanitize_text_field()`  [INFERRED]
  nakama-warehouse.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_commit_items()` --calls--> `sanitize_text_field()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_commit_items()` --calls--> `wp_strip_all_tags()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_snapshot()` --calls--> `get_option()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php

## Import Cycles
- None detected.

## Communities (108 total, 21 thin omitted)

### Community 0 - "products.ts"
Cohesion: 0.15
Nodes (23): CATEGORIES, fetchCategories(), fetchProductById(), fetchProducts(), fetchProductsByCategory(), getProductsByCategory(), PRODUCTS, ProductsSearchResult (+15 more)

### Community 1 - "nakama-production-panel.php"
Cohesion: 0.11
Nodes (49): nakama_prod_active_cycle(), nakama_prod_card(), nakama_prod_color_es(), nakama_prod_create_cycle(), nakama_prod_cycle_owner(), nakama_prod_cycle_review(), nakama_prod_cycles_table(), nakama_prod_ensure_finished_cycle() (+41 more)

### Community 2 - "production-api.ts"
Cohesion: 0.08
Nodes (50): AccessState, ColState, ColVariant, EMPTY_COL, formatDuration(), ProduccionPage(), Tab, Viewer (+42 more)

### Community 3 - "nakama-warehouse.php"
Cohesion: 0.10
Nodes (54): nakama_products_bump_cache(), nakama_wh_apply_delta(), nakama_wh_apply_variation_status(), nakama_wh_catalog_maps_table(), nakama_wh_catalog_product_out(), nakama_wh_color_canonical(), nakama_wh_compare_items(), nakama_wh_effective_stock() (+46 more)

### Community 4 - "App.tsx"
Cohesion: 0.09
Nodes (38): jspdf, jszip, App(), availableGarmentPositions, getPositionSizeError(), capModelColors, capModels, GorrasConfig() (+30 more)

### Community 5 - "src/lib/warehouse-api.ts"
Cohesion: 0.10
Nodes (43): ManualCatalogSkuPanel(), Notice, AccessState, AlmacenPage(), Edit, ItemRow(), Msg, SaveState (+35 more)

### Community 6 - "auth.ts"
Cohesion: 0.08
Nodes (39): checkProductionAccess(), AuthContext, AuthProvider(), AuthValue, NO_ACCESS_MESSAGE, Status, fetchViewerName(), firstError() (+31 more)

### Community 7 - "[id].tsx"
Cohesion: 0.12
Nodes (34): Busy, styles, styles, PushSummary, styles, AppButton(), AppButtonProps, PALETTE (+26 more)

### Community 8 - "api.ts"
Cohesion: 0.12
Nodes (27): ORDER_DETAIL_KEY, ReviewInput, useOrderDetail(), ValidateInput, ORDERS_KEY, PRODUCTION_PDFS_KEY, useProductionPdfs(), deleteProductionPdf() (+19 more)

### Community 9 - "almacen.tsx"
Cohesion: 0.10
Nodes (32): Edits, styles, Tab, TABS, WarehouseScreen(), ProductRowComponent(), STATUS, StockRow (+24 more)

### Community 10 - "nakama-products-api.php"
Cohesion: 0.11
Nodes (39): nakama_currency_info(), nakama_get_order_confirmation(), nakama_get_usd_rate(), nakama_get_usd_rate_details(), nakama_register_customer(), nakama_get_maintenance_status(), nakama_products_add_cors(), nakama_products_attribute_key_map() (+31 more)

### Community 11 - "mobile/package.json"
Cohesion: 0.07
Nodes (29): devDependencies, @types/react, typescript, react, @types/react, typescript, main, name (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, expo, expo-application, expo-build-properties, expo-constants, expo-device, expo-document-picker, expo-font (+27 more)

### Community 13 - "terminos-y-condiciones/page.tsx"
Cohesion: 0.07
Nodes (24): h2Style, leadStyle, liStyle, markerStyle, PrivacyPage(), pStyle, secStyle, ulStyle (+16 more)

### Community 14 - "nakama-checkout-tools.php"
Cohesion: 0.14
Nodes (30): nakama_add_quote_to_wc_cart(), nakama_cart_bridge_handler(), nakama_check_coupon_logic(), nakama_checkout_return_url(), nakama_finalize_quote_sources(), nakama_graphql_order_quote_payment_eligible(), nakama_is_quote_request(), nakama_legacy_confirmation_destination() (+22 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, package, predictiveBackGestureEnabled, projectId, expo (+20 more)

### Community 16 - "app/layout.tsx"
Cohesion: 0.17
Nodes (16): Analytics(), CookieBanner(), CartProvider(), metadata, viewport, FB_PIXEL_ID, GA_MEASUREMENT_ID, isTrackingHost() (+8 more)

### Community 17 - "useLanguage"
Cohesion: 0.10
Nodes (26): Footer(), FreeShippingBadge(), CategoriesExplore(), LazyCategorySection(), ScrollContainer(), useDraggableScroll(), HeroSources, ScrollytellingHero() (+18 more)

### Community 18 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 19 - "push.ts"
Cohesion: 0.14
Nodes (20): LoginScreen(), SettingsScreen(), confirmSignOut(), summarize(), TabsLayout(), listeners, publish(), resetPushState() (+12 more)

### Community 20 - "fetchGraphQL"
Cohesion: 0.11
Nodes (30): addToCart(), checkout(), emptyCart(), fetchCart(), fetchCheckoutData(), getAuthHeaders(), getSessionToken(), removeFromCart() (+22 more)

### Community 21 - "AuthContext.tsx"
Cohesion: 0.11
Nodes (28): react-dom, CartPage(), CheckoutPage(), Navbar(), SearchBar(), AuthContext, AuthContextType, Customer (+20 more)

### Community 22 - "SocialLoginButtons.tsx"
Cohesion: 0.21
Nodes (7): buttonStyle, dividerStyle, lineStyle, SocialLoginButtons(), SocialLoginButtonsProps, socialLoginUrl(), SocialProvider

### Community 23 - "mi-cuenta/page.tsx"
Cohesion: 0.19
Nodes (15): formatEventTime(), isTrackProblem(), MiCuentaPage(), ORDER_STATUS_ES, ORDER_STEPS, orderStatusLabel(), orderStatusSlug(), orderStepIndex() (+7 more)

### Community 24 - "Diseño: productos de catálogo sin color y SKU manuales"
Cohesion: 0.10
Nodes (20): 1. Registro dedicado de asignaciones — aceptada, 2. Metadatos de WooCommerce únicamente — descartada, 3. Override manual por ID — descartada, Alternativas consideradas, APK, Arquitectura de datos, Colores y datos heredados, Contratos REST (+12 more)

### Community 25 - "index.tsx"
Cohesion: 0.17
Nodes (15): badge(), BoardScreen(), styles, OrderCard, OrderCardProps, SegmentedTabs(), SegmentedTabsProps, SegmentOption (+7 more)

### Community 26 - "package.json"
Cohesion: 0.11
Nodes (17): react, @types/react, typescript, name, private, version, bootstrap, bootstrap-icons (+9 more)

### Community 27 - "ProductClient.tsx"
Cohesion: 0.22
Nodes (13): getPricing(), ProductPrice(), CartContext, CartContextType, CartItem, QuoteCartItem, ProductClient(), ProductClientProps (+5 more)

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
Cohesion: 0.18
Nodes (15): nakama_changelog_commit_items(), nakama_changelog_date_display(), nakama_changelog_entries(), nakama_changelog_git_commits(), nakama_changelog_git_snapshot(), nakama_changelog_handle_manual_refresh(), nakama_changelog_local_entries(), nakama_changelog_merge_git_entries() (+7 more)

### Community 34 - "patrones.tsx"
Cohesion: 0.17
Nodes (14): PatternsScreen(), styles, UploadFeedback, StateMessage(), ProdUploadFile, ProdUploadResult, uploadProductionPdf(), MobilePdfBatchResult (+6 more)

### Community 36 - "apiOrigin"
Cohesion: 0.16
Nodes (15): MAINTENANCE_ENDPOINT(), MaintenanceToggle(), MaintenanceData, MaintenanceWrapper(), SocialLinks, SOCIALS, BankAccount, formatDate() (+7 more)

### Community 37 - "FakeOrder"
Cohesion: 0.04
Nodes (5): FakeCreatedOrder, FakeOrder, FakeTransferSource, WC_Abstract_Order, WC_Order_Item_Fee

### Community 38 - "專案上下文 (Agent Context)：NakamaBordados_new"
Cohesion: 0.17
Nodes (10): 🎯 1. 專案目標 (Project Goal), 🛠️ 2. 技術棧與環境 (Tech Stack & Environment), 📂 3. 核心目錄結構 (Core Structure), 🏛️ 4. 架構與設計約定 (Architecture & Conventions), 🚦 5. 目前進度與待辦 (Current Status & TODO), 原始設定檔, 專案上下文 (Agent Context)：NakamaBordados_new, Deploy on Vercel (+2 more)

### Community 39 - "Navegación móvil de Mi Cuenta"
Cohesion: 0.17
Nodes (11): 1. Visibilidad responsive mediante CSS — elegida, 2. Renderizado condicional mediante JavaScript, 3. Eliminar los accesos en todos los tamaños, Alternativas consideradas, Diseño final, Navegación móvil de Mi Cuenta, Registro de decisiones, Resultado de implementación (+3 more)

### Community 40 - "Nakama_Account"
Cohesion: 0.14
Nodes (4): Nakama_Account, Nakama_MSI, add_action(), add_filter()

### Community 41 - "products-api.ts"
Cohesion: 0.17
Nodes (14): ProductLoader(), dynamic, sitemap(), apiFetchProductBySlug(), apiFetchProducts(), apiFetchProductSlugs(), canonicalAttr(), EMPTY_RESULT (+6 more)

### Community 42 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, bootstrap, bootstrap-icons, isomorphic-dompurify, jose, jspdf, jszip (+4 more)

### Community 43 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+4 more)

### Community 44 - "nakama-checkout-tools-test.php"
Cohesion: 0.10
Nodes (9): nakama_social_new_user_role(), FakeErrors, FakeFee, FakeLineItem, FakeResponse, get_user_by(), is_wc_endpoint_url(), wc_create_order() (+1 more)

### Community 45 - "esc_html"
Cohesion: 0.27
Nodes (9): nakama_hero_default_config(), nakama_hero_get_config(), nakama_hero_handle_save(), nakama_hero_media_field(), nakama_hero_merge_config(), nakama_hero_render_admin_page(), nakama_hero_rest_get(), esc_html() (+1 more)

### Community 46 - "get_current_user_id"
Cohesion: 0.27
Nodes (9): nakama_sso_set_cookie(), nakama_prod_push_dispatch(), nakama_prod_push_save(), nakama_prod_push_send_new_order(), nakama_prod_push_tokens(), nakama_prod_push_valid(), nakama_prod_rest_push_register(), nakama_prod_rest_push_unregister() (+1 more)

### Community 47 - "Nakama Producción (app Android)"
Cohesion: 0.18
Nodes (10): 1. Cuenta de Expo / EAS, 2. Firebase (necesario para las notificaciones), 3. Plugin de WordPress, 4. Login social, Cómo trabajar en el proyecto, Estructura, Nakama Producción (app Android), Notas (+2 more)

### Community 48 - "WP_REST_Request"
Cohesion: 0.15
Nodes (27): nakama_create_quote_order(), nakama_quote_pdf_upload(), nakama_17track_carrier_code(), nakama_17track_normalize(), nakama_17track_register(), nakama_17track_request(), nakama_17track_status_es(), nakama_17track_timeline_payload() (+19 more)

### Community 50 - "UpdateBanner.tsx"
Cohesion: 0.17
Nodes (12): BannerProps, styles, UpdateBanner(), ApkUpdate, parseRemote(), RemoteVersion, useApkVersion(), OtaStatus (+4 more)

### Community 51 - "currency-rate.ts"
Cohesion: 0.33
Nodes (7): applyUsdMarkup(), fetchJson(), fetchUsdRate(), FetchUsdRateOptions, isValidRate(), StoredUsdRate, UsdRateResult

### Community 52 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 53 - "Selector de pago para cotizaciones en Mi Cuenta"
Cohesion: 0.22
Nodes (8): Alternativas consideradas, Casos límite y errores, Diseño aprobado, Estrategia de pruebas, Registro de decisiones, Resumen de entendimiento, Selector de pago para cotizaciones en Mi Cuenta, Supuestos no funcionales

### Community 54 - "vitest"
Cohesion: 0.17
Nodes (8): @testing-library/react, vitest, BuildUpdateNotice(), BuildUpdateNoticeProps, TrackingFeedback(), TrackingFeedbackProps, mocks, transferConfirmation

### Community 56 - "AccountSectionNav.tsx"
Cohesion: 0.28
Nodes (6): AccountSection, AccountSectionId, AccountSectionNav(), AccountSectionNavProps, COMMISSIONS_SECTION, CUSTOMER_SECTIONS

### Community 57 - "warehouse-manual-catalog.test.mjs"
Cohesion: 0.22
Nodes (8): changelog, changelogPath, nextPanelPath, production, productionPath, projectRoot, warehouse, warehousePath

### Community 58 - "Facebook Catalog REST Endpoint"
Cohesion: 0.25
Nodes (7): Assumptions, Decision log, Facebook Catalog REST Endpoint, Final design, Reliability and security, Understanding summary, Validation

### Community 59 - "mobile/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, paths, strict, exclude, extends, include, expo/tsconfig.base

### Community 62 - "quote-payment.ts"
Cohesion: 0.40
Nodes (4): AuthProvider(), mergeQuotePaymentEligibility(), QuotePaymentEligibilityNode, QuotePaymentFields

### Community 63 - "init-db.js"
Cohesion: 0.29
Nodes (7): bcryptjs, bcrypt, fs, main(), mysql, parseEnv(), path

### Community 64 - "clean-lang.js"
Cohesion: 0.25
Nodes (7): closeIndex, content, filePath, fs, path, restOfContent, targetIndex

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, postbuild, start, test

### Community 67 - "AuthModeTabs.test.tsx"
Cohesion: 0.32
Nodes (5): @testing-library/user-event, AUTH_MODES, AuthMode, AuthModeTabs(), AuthModeTabsProps

### Community 68 - "page.test.tsx"
Cohesion: 0.29
Nodes (3): mocks, TestOrder, TestUser

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

### Community 74 - "OrderDetailScreen"
Cohesion: 0.40
Nodes (4): formatDuration(), OrderDetailScreen(), ANDROID_SYSTEM_NAV_CLEARANCE, bottomActionPadding()

### Community 75 - "next"
Cohesion: 0.22
Nodes (4): nextConfig, next, metadata, dynamic

### Community 76 - "clone-db.js"
Cohesion: 0.40
Nodes (5): clone(), fs, mysql, parseEnv(), path

### Community 77 - "AccountProgress.tsx"
Cohesion: 0.40
Nodes (4): AccountProgress(), AccountProgressProps, AccountProgressStep, steps

### Community 78 - "LuffyCharacter.tsx"
Cohesion: 0.40
Nodes (4): LUFFY_QUOTES, LuffyCharacter(), LuffyCharacterProps, LuffyExpression

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

## Knowledge Gaps
- **542 isolated node(s):** `net`, `client`, `eslintConfig`, `{ existsSync }`, `{ join }` (+537 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 726 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `production-api.ts`, `AuthModeTabs.test.tsx`, `App.tsx`, `AccountColors.test.ts`, `page.test.tsx`, `OrderDetailScreen`, `AccountProgress.tsx`, `LuffyCharacter.tsx`, `currency-rate.ts`, `AuthContext.tsx`, `SocialLoginButtons.tsx`, `AccountSectionNav.tsx`, `package.json`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `bottomActionPadding()` connect `OrderDetailScreen` to `[id].tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `fetchGraphQL()` connect `fetchGraphQL` to `vitest`, `products.ts`, `AuthContext.tsx`, `quote-payment.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `WP_Error` (e.g. with `nakama_check_coupon_logic()` and `nakama_create_quote_order()`) actually correct?**
  _`WP_Error` has 38 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net`, `client`, `eslintConfig` to the rest of the system?**
  _542 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `nakama-production-panel.php` be split into smaller, more focused modules?**
  _Cohesion score 0.11320754716981132 - nodes in this community are weakly interconnected._
- **Should `production-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08182349503214495 - nodes in this community are weakly interconnected._