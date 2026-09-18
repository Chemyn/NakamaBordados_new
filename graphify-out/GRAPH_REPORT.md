# Graph Report - NakamaBordados  (2026-09-18)

## Corpus Check
- 233 files · ~4,190,691 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1814 nodes · 3558 edges · 120 communities (90 shown, 24 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 289 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75eb7ab0`
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
- ajustes.tsx
- dependencies
- useLanguage
- nakama-checkout-tools.php
- expo
- analytics.ts
- nakama_changelog_git_commits
- What You Must Do When Invoked
- mobile/package.json
- fetchGraphQL
- CurrencyContext.tsx
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
- LanguageContext.tsx
- Nakama_Settings
- SocialLoginButtons.tsx
- FakeOrder
- 專案上下文 (Agent Context)：NakamaBordados_new
- Navegación móvil de Mi Cuenta
- esc_attr
- translateWarehouseColor
- dependencies
- devDependencies
- nakama-checkout-tools-test.php
- nakama-hero-manager.php
- nakama_prod_rest_push_register
- Nakama Producción (app Android)
- is_wp_error
- Nakama_Admin
- AccountColors.test.ts
- currency-rate.ts
- graphify reference: extra exports and benchmark
- Selector de pago para cotizaciones en Mi Cuenta
- WP_REST_Request
- Nakama_Discount_Codes
- Códigos públicos de descuento para Nakama Discounts
- warehouse-manual-catalog.test.mjs
- Facebook Catalog REST Endpoint
- mobile/tsconfig.json
- Nakama_Cart
- Nakama_Customer_History
- apiOrigin
- init-db.js
- clean-lang.js
- CartContext.tsx
- scripts
- nakama-discounts-cart-test.php
- vitest
- hero-config.ts
- nakama-changelog.test.mjs
- 📔 2026-06-04 Global Progress Overview
- graphify reference: query, path, explain
- Project DevLog: NakamaBordados_new
- products-api.ts
- next
- clone-db.js
- patrones.tsx
- db.ts
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- Project DevLog: NakamaBordados_new
- 📔 2026-06-19 Nakama Bordados Progress Update
- nakama_update_account_profile
- FakeTransferSource
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Changelog automático desde Git
- FakeCreatedOrder
- This is NOT the Next.js you know
- check-port.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- app.config.js
- prepare-static-deployment.mjs
- HomeHero.tsx
- gracias/page.tsx
- pedido-confirmado/page.tsx
- UpdateBanner.tsx
- extraction-spec.md
- eslint.config.mjs
- mobile/AGENTS.md
- vitest.config.ts
- FakeCart
- graphql-client.ts
- OrderDetailScreen
- WC_Order_Item_Fee
- nakama_logout_session
- nakama_wh_resolve_for_item
- Nakama_Settings
- FakeFee
- FakeLineItem

## God Nodes (most connected - your core abstractions)
1. `WP_REST_Request` - 43 edges
2. `useLanguage()` - 42 edges
3. `WP_Error` - 41 edges
4. `apiOrigin()` - 36 edges
5. `Nakama_Settings` - 27 edges
6. `wc_get_order()` - 27 edges
7. `fetchGraphQL()` - 25 edges
8. `vitest` - 24 edges
9. `rest_ensure_response()` - 24 edges
10. `is_wp_error()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `nakama_envia_order_meta()` --calls--> `wc_get_order()`  [INFERRED]
  nakama-envia-tracking.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `is_wp_error()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `sanitize_textarea_field()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-checkout-tools-test.php
- `nakama_changelog_git_commits()` --calls--> `wp_timezone()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-discounts-test.php
- `nakama_changelog_render_dashboard_widget()` --calls--> `esc_attr()`  [INFERRED]
  nakama-changelog/nakama-changelog.php → tests/nakama-discounts-cart-test.php

## Import Cycles
- None detected.

## Communities (120 total, 24 thin omitted)

### Community 0 - "products.ts"
Cohesion: 0.16
Nodes (22): CATEGORIES, fetchProductById(), fetchProducts(), fetchProductsByCategory(), getProductsByCategory(), PRODUCTS, ProductsSearchResult, ProductsSearchResult (+14 more)

### Community 1 - "nakama-production-panel.php"
Cohesion: 0.12
Nodes (45): nakama_prod_active_cycle(), nakama_prod_card(), nakama_prod_create_cycle(), nakama_prod_cycle_owner(), nakama_prod_cycle_review(), nakama_prod_cycles_table(), nakama_prod_ensure_finished_cycle(), nakama_prod_human_duration() (+37 more)

### Community 2 - "production-api.ts"
Cohesion: 0.09
Nodes (51): AccessState, ColState, ColVariant, EMPTY_COL, formatDuration(), ProduccionPage(), Tab, Viewer (+43 more)

### Community 3 - "nakama-warehouse.php"
Cohesion: 0.11
Nodes (51): nakama_products_bump_cache(), nakama_wh_apply_delta(), nakama_wh_apply_variation_status(), nakama_wh_catalog_maps_table(), nakama_wh_catalog_product_out(), nakama_wh_color_canonical(), nakama_wh_compare_items(), nakama_wh_effective_stock() (+43 more)

### Community 4 - "App.tsx"
Cohesion: 0.09
Nodes (38): jspdf, jszip, App(), availableGarmentPositions, getPositionSizeError(), capModelColors, capModels, GorrasConfig() (+30 more)

### Community 5 - "src/lib/warehouse-api.ts"
Cohesion: 0.11
Nodes (43): ManualCatalogSkuPanel(), Notice, AccessState, AlmacenPage(), Edit, ItemRow(), Msg, SaveState (+35 more)

### Community 6 - "auth.ts"
Cohesion: 0.08
Nodes (38): checkProductionAccess(), AuthContext, AuthProvider(), AuthValue, NO_ACCESS_MESSAGE, Status, fetchViewerName(), firstError() (+30 more)

### Community 7 - "[id].tsx"
Cohesion: 0.11
Nodes (36): Busy, styles, styles, AppButton(), AppButtonProps, PALETTE, styles, Variant (+28 more)

### Community 8 - "api.ts"
Cohesion: 0.13
Nodes (26): ORDER_DETAIL_KEY, ReviewInput, useOrderDetail(), ValidateInput, PRODUCTION_PDFS_KEY, useProductionPdfs(), deleteProductionPdf(), fetchProductionOrderDetail() (+18 more)

### Community 9 - "almacen.tsx"
Cohesion: 0.11
Nodes (28): Edits, styles, Tab, TABS, WarehouseScreen(), StateMessage(), STATUS, StockRow (+20 more)

### Community 10 - "nakama-products-api.php"
Cohesion: 0.13
Nodes (27): nakama_get_maintenance_status(), nakama_products_add_cors(), nakama_products_attribute_key_map(), nakama_products_cache_key(), nakama_products_cache_version(), nakama_products_catalog_clean_text(), nakama_products_catalog_image(), nakama_products_catalog_price() (+19 more)

### Community 11 - "ajustes.tsx"
Cohesion: 0.11
Nodes (29): RootNavigator(), LoginScreen(), PushSummary, SettingsScreen(), confirmSignOut(), styles, summarize(), TabsLayout() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, expo, expo-application, expo-build-properties, expo-constants, expo-device, expo-document-picker, expo-font (+27 more)

### Community 13 - "useLanguage"
Cohesion: 0.19
Nodes (14): FreeShippingBadge(), CategoriesExplore(), LazyCategorySection(), ScrollContainer(), useDraggableScroll(), HeroSources, ScrollytellingHero(), useLanguage() (+6 more)

### Community 14 - "nakama-checkout-tools.php"
Cohesion: 0.12
Nodes (32): nakama_add_quote_batch_to_wc_cart(), nakama_add_quote_to_wc_cart(), nakama_cart_bridge_handler(), nakama_checkout_return_url(), nakama_finalize_quote_sources(), nakama_get_order_confirmation(), nakama_graphql_order_quote_payment_eligible(), nakama_is_quote_request() (+24 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, package, predictiveBackGestureEnabled, projectId, expo (+20 more)

### Community 16 - "analytics.ts"
Cohesion: 0.24
Nodes (12): Analytics(), CookieBanner(), FB_PIXEL_ID, GA_MEASUREMENT_ID, isTrackingHost(), TrackedProduct, trackPageView(), Window (+4 more)

### Community 17 - "nakama_changelog_git_commits"
Cohesion: 0.21
Nodes (12): nakama_changelog_git_commits(), nakama_changelog_git_snapshot(), nakama_changelog_handle_manual_refresh(), nakama_changelog_refresh_git_snapshot(), nakama_currency_info(), nakama_get_usd_rate(), nakama_get_usd_rate_details(), add_query_arg() (+4 more)

### Community 18 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 19 - "mobile/package.json"
Cohesion: 0.07
Nodes (28): devDependencies, @types/react, typescript, react, @types/react, typescript, main, name (+20 more)

### Community 20 - "fetchGraphQL"
Cohesion: 0.29
Nodes (16): addToCart(), checkout(), emptyCart(), fetchCart(), fetchCheckoutData(), getAuthHeaders(), getSessionToken(), getShippingRates() (+8 more)

### Community 21 - "CurrencyContext.tsx"
Cohesion: 0.15
Nodes (21): CartPage(), CheckoutPage(), router, AbandonedCartCoupon(), Navbar(), SearchBar(), useAuth(), getVariationAttr() (+13 more)

### Community 22 - "terminos-y-condiciones/page.tsx"
Cohesion: 0.07
Nodes (24): h2Style, leadStyle, liStyle, markerStyle, PrivacyPage(), pStyle, secStyle, ulStyle (+16 more)

### Community 23 - "mi-cuenta/page.tsx"
Cohesion: 0.10
Nodes (26): PersonalDetailsEditor(), PersonalDetailsProps, SaveProfile, SaveResult, ShippingAddressEditor(), ShippingAddressProps, AccountProgress(), AccountProgressProps (+18 more)

### Community 24 - "Diseño: productos de catálogo sin color y SKU manuales"
Cohesion: 0.10
Nodes (20): 1. Registro dedicado de asignaciones — aceptada, 2. Metadatos de WooCommerce únicamente — descartada, 3. Override manual por ID — descartada, Alternativas consideradas, APK, Arquitectura de datos, Colores y datos heredados, Contratos REST (+12 more)

### Community 25 - "index.tsx"
Cohesion: 0.23
Nodes (12): badge(), BoardScreen(), styles, OrderCard, OrderCardProps, ORDERS_KEY, useOrders(), fetchProductionOrders() (+4 more)

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

### Community 33 - "nakama-changelog.php"
Cohesion: 0.18
Nodes (17): nakama_changelog_commit_items(), nakama_changelog_commit_paragraphs(), nakama_changelog_commit_release_id(), nakama_changelog_commit_subject(), nakama_changelog_date_display(), nakama_changelog_entries(), nakama_changelog_git_entry(), nakama_changelog_group_presentation() (+9 more)

### Community 34 - "LanguageContext.tsx"
Cohesion: 0.13
Nodes (15): BuildUpdateNotice(), BuildUpdateNoticeProps, Footer(), Message, WhatsAppButton(), getServerLanguage(), getStoredLanguage(), Language (+7 more)

### Community 35 - "Nakama_Settings"
Cohesion: 0.10
Nodes (4): Nakama_Context, Nakama_Campaigns, Nakama_Engine, Nakama_Settings

### Community 36 - "SocialLoginButtons.tsx"
Cohesion: 0.20
Nodes (7): buttonStyle, dividerStyle, lineStyle, SocialLoginButtons(), SocialLoginButtonsProps, AuthGateModal(), AuthGateModalProps

### Community 38 - "專案上下文 (Agent Context)：NakamaBordados_new"
Cohesion: 0.17
Nodes (10): 🎯 1. 專案目標 (Project Goal), 🛠️ 2. 技術棧與環境 (Tech Stack & Environment), 📂 3. 核心目錄結構 (Core Structure), 🏛️ 4. 架構與設計約定 (Architecture & Conventions), 🚦 5. 目前進度與待辦 (Current Status & TODO), 原始設定檔, 專案上下文 (Agent Context)：NakamaBordados_new, Deploy on Vercel (+2 more)

### Community 39 - "Navegación móvil de Mi Cuenta"
Cohesion: 0.17
Nodes (11): 1. Visibilidad responsive mediante CSS — elegida, 2. Renderizado condicional mediante JavaScript, 3. Eliminar los accesos en todos los tamaños, Alternativas consideradas, Diseño final, Navegación móvil de Mi Cuenta, Registro de decisiones, Resultado de implementación (+3 more)

### Community 40 - "esc_attr"
Cohesion: 0.20
Nodes (4): Nakama_MSI, esc_attr(), wc_price(), wp_kses_post()

### Community 41 - "translateWarehouseColor"
Cohesion: 0.32
Nodes (6): ProductRowComponent(), StockRowBase(), COLOR_TRANSLATIONS, normalizeColorLookup(), translateWarehouseColor(), approvedCases

### Community 42 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, bootstrap, bootstrap-icons, isomorphic-dompurify, jose, jspdf, jszip (+4 more)

### Community 43 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+4 more)

### Community 44 - "nakama-checkout-tools-test.php"
Cohesion: 0.11
Nodes (4): FakeCheckoutOrder, FakeErrors, is_wc_endpoint_url(), WP_User

### Community 45 - "nakama-hero-manager.php"
Cohesion: 0.46
Nodes (7): nakama_hero_default_config(), nakama_hero_get_config(), nakama_hero_handle_save(), nakama_hero_media_field(), nakama_hero_merge_config(), nakama_hero_render_admin_page(), nakama_hero_rest_get()

### Community 46 - "nakama_prod_rest_push_register"
Cohesion: 0.43
Nodes (7): nakama_prod_push_dispatch(), nakama_prod_push_save(), nakama_prod_push_send_new_order(), nakama_prod_push_tokens(), nakama_prod_push_valid(), nakama_prod_rest_push_register(), nakama_prod_rest_push_unregister()

### Community 47 - "Nakama Producción (app Android)"
Cohesion: 0.18
Nodes (10): 1. Cuenta de Expo / EAS, 2. Firebase (necesario para las notificaciones), 3. Plugin de WordPress, 4. Login social, Cómo trabajar en el proyecto, Estructura, Nakama Producción (app Android), Notas (+2 more)

### Community 48 - "is_wp_error"
Cohesion: 0.18
Nodes (23): nakama_17track_carrier_code(), nakama_17track_normalize(), nakama_17track_register(), nakama_17track_request(), nakama_17track_status_es(), nakama_17track_timeline_payload(), nakama_17track_token(), nakama_envia_no_cache() (+15 more)

### Community 51 - "currency-rate.ts"
Cohesion: 0.33
Nodes (7): applyUsdMarkup(), fetchJson(), fetchUsdRate(), FetchUsdRateOptions, isValidRate(), StoredUsdRate, UsdRateResult

### Community 52 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 53 - "Selector de pago para cotizaciones en Mi Cuenta"
Cohesion: 0.22
Nodes (8): Alternativas consideradas, Casos límite y errores, Diseño aprobado, Estrategia de pruebas, Registro de decisiones, Resumen de entendimiento, Selector de pago para cotizaciones en Mi Cuenta, Supuestos no funcionales

### Community 54 - "WP_REST_Request"
Cohesion: 0.21
Nodes (10): nakama_check_coupon_logic(), nakama_create_quote_order(), nakama_quote_pdf_upload(), nakama_register_customer(), nakama_prod_rest_orders(), nakama_prod_rest_take(), get_user_by(), sanitize_email() (+2 more)

### Community 55 - "Nakama_Discount_Codes"
Cohesion: 0.08
Nodes (10): Nakama_Discount_Codes, add_settings_error(), current_datetime(), Nakama_Campaigns, Nakama_Context, Nakama_Customer_History, Nakama_Settings, sanitize_key() (+2 more)

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

### Community 62 - "apiOrigin"
Cohesion: 0.10
Nodes (26): MAINTENANCE_ENDPOINT(), MaintenanceToggle(), MaintenanceData, MaintenanceWrapper(), SocialLinks, SOCIALS, AuthContext, AuthContextType (+18 more)

### Community 63 - "init-db.js"
Cohesion: 0.29
Nodes (7): bcryptjs, bcrypt, fs, main(), mysql, parseEnv(), path

### Community 64 - "clean-lang.js"
Cohesion: 0.25
Nodes (7): closeIndex, content, filePath, fs, path, restOfContent, targetIndex

### Community 65 - "CartContext.tsx"
Cohesion: 0.16
Nodes (17): getPricing(), ProductPrice(), CartContext, CartContextType, CartItem, CartProvider(), QuoteCartItem, ValidatedCoupon (+9 more)

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, postbuild, start, test

### Community 67 - "nakama-discounts-cart-test.php"
Cohesion: 0.10
Nodes (4): FakeDiscountCart, FakeDiscountOrder, FakeDiscountSession, FakeDiscountWooCommerce

### Community 68 - "vitest"
Cohesion: 0.07
Nodes (23): @testing-library/react, @testing-library/user-event, vitest, router, AccountSection, AccountSectionId, AccountSectionNav(), AccountSectionNavProps (+15 more)

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
Nodes (14): ProductLoader(), dynamic, sitemap(), apiFetchProductBySlug(), apiFetchProducts(), apiFetchProductSlugs(), canonicalAttr(), EMPTY_RESULT (+6 more)

### Community 75 - "next"
Cohesion: 0.17
Nodes (5): nextConfig, next, metadata, metadata, dynamic

### Community 76 - "clone-db.js"
Cohesion: 0.40
Nodes (5): clone(), fs, mysql, parseEnv(), path

### Community 77 - "patrones.tsx"
Cohesion: 0.19
Nodes (13): PatternsScreen(), styles, UploadFeedback, ProdUploadFile, ProdUploadResult, uploadProductionPdf(), MobilePdfBatchResult, MobilePdfUploadFailure (+5 more)

### Community 78 - "db.ts"
Cohesion: 0.21
Nodes (11): getCategoriesSQL(), getProductBySlugSQL(), GetProductsOptions, getProductsSQL(), GetUsersOptions, pool, searchTaxonomyBySQL(), SQLProduct (+3 more)

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

### Community 84 - "nakama_update_account_profile"
Cohesion: 0.40
Nodes (5): nakama_update_account_profile(), nakama_prod_save_user_field(), nakama_wh_save_user_field(), get_userdata(), wp_update_user()

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

### Community 91 - "This is NOT the Next.js you know"
Cohesion: 0.50
Nodes (3): Cambios NK, graphify, This is NOT the Next.js you know

### Community 99 - "pedido-confirmado/page.tsx"
Cohesion: 0.25
Nodes (9): BankAccount, formatDate(), formatTotal(), JOURNEY, journeyIndex(), OrderConfirmation, PedidoConfirmadoPage(), mocks (+1 more)

### Community 100 - "UpdateBanner.tsx"
Cohesion: 0.24
Nodes (7): BannerProps, styles, UpdateBanner(), OtaStatus, OtaUpdate, useOtaUpdate(), expo-updates

### Community 111 - "FakeCart"
Cohesion: 0.22
Nodes (3): FakeCart, FakeWooCommerce, WC()

### Community 112 - "graphql-client.ts"
Cohesion: 0.29
Nodes (4): FetchGraphQLOptions, GraphQLError, isUnavailableOptionalSchemaField(), WP_GRAPHQL_URL

### Community 113 - "OrderDetailScreen"
Cohesion: 0.40
Nodes (4): formatDuration(), OrderDetailScreen(), ANDROID_SYSTEM_NAV_CLEARANCE, bottomActionPadding()

### Community 115 - "nakama_logout_session"
Cohesion: 0.50
Nodes (4): nakama_logout_session(), nakama_sso_set_cookie(), wp_clear_auth_cookie(), wp_set_current_user()

### Community 116 - "nakama_wh_resolve_for_item"
Cohesion: 0.50
Nodes (4): nakama_prod_color_es(), nakama_prod_item_attributes(), nakama_wh_item_attributes(), nakama_wh_resolve_for_item()

## Knowledge Gaps
- **569 isolated node(s):** `net`, `client`, `eslintConfig`, `{ existsSync }`, `{ join }` (+564 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 821 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `CartContext.tsx`, `LanguageContext.tsx`, `pedido-confirmado/page.tsx`, `SocialLoginButtons.tsx`, `App.tsx`, `src/lib/warehouse-api.ts`, `production-api.ts`, `graphql-client.ts`, `OrderDetailScreen`, `AccountColors.test.ts`, `currency-rate.ts`, `CurrencyContext.tsx`, `mi-cuenta/page.tsx`, `package.json`, `apiOrigin`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `bottomActionPadding()` connect `OrderDetailScreen` to `[id].tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `translateWarehouseColor()` connect `translateWarehouseColor` to `almacen.tsx`, `[id].tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `WP_Error` (e.g. with `nakama_check_coupon_logic()` and `nakama_create_quote_order()`) actually correct?**
  _`WP_Error` has 39 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net`, `client`, `eslintConfig` to the rest of the system?**
  _569 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `nakama-production-panel.php` be split into smaller, more focused modules?**
  _Cohesion score 0.11819727891156463 - nodes in this community are weakly interconnected._
- **Should `production-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08644067796610169 - nodes in this community are weakly interconnected._