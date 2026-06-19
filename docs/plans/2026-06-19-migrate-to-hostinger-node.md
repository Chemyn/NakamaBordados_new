# NakamaBordados WordPress/WooCommerce Removal & Hostinger Node.js Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely decommission the WordPress/WooCommerce backend, replace it with a local normalized MySQL schema, implement native auth, checkouts, and coupon systems, and deploy the self-contained Next.js application to a Hostinger Node.js hosting environment.

**Architecture:** We transition from a hybrid model (Next.js client + remote WordPress GraphQL) to a monolithic architecture (Next.js server + direct SQL queries to local MySQL). Client-side authentication shifts from WP-JWT to a local JWT route, and the checkout flow changes from a WooCommerce redirect bridge (`nk_bridge`) to an in-app payment form calling MercadoPago and PayPal API endpoints.

**Tech Stack:** Next.js 16.2, React 19, MySQL/MariaDB (via `mysql2`), JWTs (`jose`), Hashing (`bcryptjs`), Payment Gateway SDKs (MercadoPago / PayPal), Shipping API (Envia.com).

---

## Architecture Overview & Pre-requisites

### 1. Hostinger Node.js Hosting Setup Choices
- **Option A: Hostinger Node.js VPS (Recommended)**
  - Full SSH root access.
  - Deployment via Git repository.
  - Application process managed by PM2.
  - Direct port exposure routed through an Nginx Reverse Proxy.
- **Option B: Hostinger Shared Node.js Web Hosting**
  - Managed via hPanel.
  - Requires a custom startup wrapper (`server.js`) to load Next.js programmatically.
  - Environment variables set in hPanel or a local `.env` file.

### 2. Database Schema (Normalized MySQL)
Instead of querying complex WordPress schemas (e.g. `wpr8_posts`, `wpr8_postmeta`, `wpr8_term_relationships`), the database will be structured as follows:

```sql
-- 1. Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100),
  `last_name` VARCHAR(100),
  `phone` VARCHAR(20),
  `role` VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin'
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User Addresses
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `address_type` VARCHAR(20) DEFAULT 'shipping', -- 'shipping', 'billing'
  `street_address` VARCHAR(255) NOT NULL,
  `apartment` VARCHAR(100),
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `postal_code` VARCHAR(20) NOT NULL,
  `country` VARCHAR(10) DEFAULT 'MX',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) UNIQUE NOT NULL,
  `parent_id` INT DEFAULT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Products
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `description` TEXT,
  `short_description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `regular_price` DECIMAL(10,2) NOT NULL,
  `sale_price` DECIMAL(10,2) DEFAULT NULL,
  `image_url` VARCHAR(512),
  `status` VARCHAR(20) DEFAULT 'publish', -- 'publish', 'draft'
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `sales_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Product Gallery Images
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `sort_order` INT DEFAULT 0,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Product-Category mapping
CREATE TABLE IF NOT EXISTS `product_category_mapping` (
  `product_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `category_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Product Variations
CREATE TABLE IF NOT EXISTS `product_variations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `sku` VARCHAR(100) UNIQUE NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `stock_quantity` INT DEFAULT 10,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Variation Attributes (Color, Estilo, Talla)
CREATE TABLE IF NOT EXISTS `product_variation_attributes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `variation_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL, -- 'Color', 'Estilo', 'Talla'
  `value` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Coupons
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE NOT NULL,
  `type` VARCHAR(20) DEFAULT 'percent', -- 'percent', 'fixed'
  `amount` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `expiration_date` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL, -- Nullable for guest checkouts
  `order_number` VARCHAR(50) UNIQUE NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
  `total` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `shipping_cost` DECIMAL(10,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address_1` VARCHAR(255) NOT NULL,
  `address_2` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `postcode` VARCHAR(20) NOT NULL,
  `country` VARCHAR(10) DEFAULT 'MX',
  `tracking_code` VARCHAR(100) DEFAULT NULL,
  `tracking_carrier` VARCHAR(50) DEFAULT NULL,
  `payment_method` VARCHAR(50) NOT NULL, -- 'MercadoPago', 'PayPal'
  `payment_id` VARCHAR(100) DEFAULT NULL, -- ID received from checkout payment Gateway
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Order Items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `variation_id` INT DEFAULT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `price` DECIMAL(10,2) NOT NULL,
  `selected_attributes` JSON DEFAULT NULL, -- JSON object of variation properties { "Color": "Negro", "Talla": "M" }
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Phase 1: Dependencies & Environment

### Task 1: Setup Local Authentication & Token Libraries
**Files:**
- Modify: `package.json`

**Step 1: Install bcryptjs, jose, and types**
Run `npm install bcryptjs jose` and `npm install --save-dev @types/bcryptjs`.
(This allows secure password hashing and stateless cookie tokens inside the Next.js runtime environment).

**Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: add bcryptjs and jose for local auth and token handling"
```

---

## Phase 2: Database Migration & Schema Creation

### Task 2: Update Database Client Pool
**Files:**
- Modify: [src/lib/db.ts](file:///C:/Users/junio/NakamaBordados_new/src/lib/db.ts)

**Step 1: Replace db.ts schema queries**
Rewrite queries inside `db.ts` to target our new clean, normalized tables instead of WordPress tables (`wpr8_`). Replace `getProductsSQL`, `getProductBySlugSQL`, `getCategoriesSQL`, `searchProductIdsBySQL`, and `searchTaxonomyBySQL` functions.

```typescript
// Replace wpr8_ prefixes with local table joins:
// Example product fetch:
export async function getProductsSQL(options: GetProductsOptions = {}): Promise<SQLProduct[] | null> {
  const { limit = 20, offset = 0, category, search } = options;
  // Implement simple queries joining products, categories, images and variations.
}
```

**Step 2: Add validation test script**
Create a scratch validation script `C:/Users/junio/NakamaBordados_new/scratch/test-db-queries.js` and execute it using `node` to verify SQL query compilation.

**Step 3: Commit**
```bash
git add src/lib/db.ts
git commit -m "feat: rewrite db.ts queries for the new normalized schema"
```

---

## Phase 3: Native Authentication Setup

### Task 3: Local API Auth Routes
**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`

**Step 1: Implement password hashing and JWT issuance**
- **Register Endpoint:** Accepts email/password, hashes password via `bcryptjs.hash`, records customer details in `users` and optional address fields in `addresses`.
- **Login Endpoint:** Selects password hash from `users`, runs `bcryptjs.compare`, issues JWT token using `jose` with expiration, sets it as an HTTP-only cookie.
- **Me Endpoint:** Extracts authorization headers/cookies, decodes JWT, queries `users` and `addresses` tables, returns profile info.

**Step 2: Modify AuthContext client mapping**
**Files:**
- Modify: [src/app/context/AuthContext.tsx](file:///C:/Users/junio/NakamaBordados_new/src/app/context/AuthContext.tsx)

Rewrite the `login` function and `fetchCustomerData` method to target our Next.js API endpoints `/api/auth/login` and `/api/auth/me` rather than remote WPGraphQL.

**Step 3: Commit**
```bash
git add src/app/api/auth/ src/app/context/AuthContext.tsx
git commit -m "feat: migrate authentication to direct API routes using bcryptjs and JWT"
```

---

## Phase 4: Data Layer Refactoring (GraphQL Deprecation)

### Task 4: Redirect queries.ts calls directly to SQL
**Files:**
- Modify: [src/lib/queries.ts](file:///C:/Users/junio/NakamaBordados_new/src/lib/queries.ts)
- Modify: [src/app/data/products.ts](file:///C:/Users/junio/NakamaBordados_new/src/app/data/products.ts)

**Step 1: Replace GraphQL requests with local SQL invocations**
Remove remote fetch queries and GraphQL response mappings in `queries.ts`. Rewrite `getProductsFromWP` and others to directly query our local MySQL database via the pool in `db.ts`.

**Step 2: Delete deprecated files**
- Delete: `src/lib/graphql-client.ts`
- Delete: `src/lib/local-graphql-handler.ts`
- Delete: `src/app/api/graphql/route.ts`

**Step 3: Test compilation**
Run `npm run build` locally to verify that all product fetching compiles error-free.

**Step 4: Commit**
```bash
git add src/lib/queries.ts src/app/data/products.ts
git rm src/lib/graphql-client.ts src/lib/local-graphql-handler.ts src/app/api/graphql/route.ts
git commit -m "refactor: decommission GraphQL layer in favor of direct database connections"
```

---

## Phase 5: Inline Checkout & Webhooks

### Task 5: Local checkout processing & webhook listeners
**Files:**
- Modify: [src/app/checkout/page.tsx](file:///C:/Users/junio/NakamaBordados_new/src/app/checkout/page.tsx)
- Create: `src/app/api/checkout/create-order/route.ts`
- Create: `src/app/api/webhooks/mercadopago/route.ts`
- Create: `src/app/api/webhooks/paypal/route.ts`
- Modify: [src/app/context/CartContext.tsx](file:///C:/Users/junio/NakamaBordados_new/src/app/context/CartContext.tsx) (update coupon lookup API to point to direct DB route `/api/coupons/validate`)

**Step 1: Remove checkout page WooCommerce redirect**
Delete the `useEffect` from `CheckoutPage` which pushes checkout carts to WooCommerce via `nk_bridge`.
Instead, keep the user on the `/checkout` page, loading their details and generating payment integration buttons (MercadoPago brick or preference redirect, PayPal script).

**Step 2: Add API routes to process checkout transactions**
- **Create Order Route:** Saves order details to `orders` and `order_items` tables with `status = 'pending'`, returns preference IDs/payment sessions.
- **MercadoPago Webhook:** Listens for transaction changes, checks signature against key in environment variables, updates order table state from `pending` to `processing` or `completed` upon capture.
- **PayPal Webhook:** Identifies PayPal payment verification events to process orders locally.

**Step 3: Local Coupon validation route**
Create `/api/coupons/validate` which checks if coupon codes exist in our local `coupons` database table. Change `applyCoupon` inside `CartContext.tsx` to query this API.

**Step 4: Commit**
```bash
git add src/app/checkout/page.tsx src/app/api/checkout/ src/app/api/webhooks/ src/app/context/CartContext.tsx
git commit -m "feat: build local checkout flow, coupon system, and payment webhooks"
```

---

## Phase 6: Hostinger Production Deployment

### Task 6: Custom server setup & PM2 deployment
**Files:**
- Create: `server.js` (Required if using Hostinger Shared Node.js hosting to boot Next.js programmatically)
- Create: `ecosystem.config.js` (Optional, for PM2 configuration on Hostinger VPS)

**Step 1: Create custom Entrypoint Wrapper**
```javascript
// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

**Step 2: Define production environment variables**
Add the following details in Hostinger environment variables or `.env` file:
- `DB_HOST`: Hostinger database server URL (usually `localhost` or remote IP provided in hPanel)
- `DB_USER`: Hostinger database username
- `DB_PASS`: Hostinger database password
- `DB_NAME`: Hostinger database name
- `JWT_SECRET`: Production secret for JWT token signatures
- `MERCADOPAGO_ACCESS_TOKEN`: Live production API token
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: Live production tokens
- `ENVIA_API_TOKEN`: Shipping integration token

**Step 3: Setup Node.js app runner on Hostinger**
- In Hostinger hPanel, search for "Node.js app".
- Upload the build outputs and project directory files.
- Select the directory, Node.js version (18 or 20), set the Entry File as `server.js`, and click "Install" to set up dependencies.
- Build the Next.js app on production (Run `npm run build` or use pre-built files).
- Start the server and configure SSL routing.

**Step 4: Commit**
```bash
git add server.js
git commit -m "deploy: add production entrypoint wrapper for Hostinger web server setup"
```

---
## Verification & Testing Checklist
- [ ] Direct MySQL pool connects without erroring.
- [ ] User register API saves password hashes using bcrypt.
- [ ] User login API issues valid stateless JWT cookies.
- [ ] Product views retrieve variation combinations directly from SQL.
- [ ] Checkout form retains users, applies local coupons, and generates API payloads.
- [ ] MercadoPago and PayPal webhook handlers capture simulated hooks successfully.
- [ ] Next.js app builds with zero errors on `npm run build`.
- [ ] PM2 manages the custom server process effectively in production.
