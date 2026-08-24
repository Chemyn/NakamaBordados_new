import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const warehousePath = path.join(projectRoot, 'nakama-warehouse.php');
const productionPath = path.join(projectRoot, 'nakama-production-panel.php');
const changelogPath = path.join(projectRoot, 'nakama-changelog', 'nakama-changelog.php');
const nextPanelPath = path.join(projectRoot, 'src', 'app', 'almacen', 'ManualCatalogSkuPanel.tsx');

const warehouse = fs.readFileSync(warehousePath, 'utf8');
const production = fs.readFileSync(productionPath, 'utf8');
const changelog = fs.readFileSync(changelogPath, 'utf8');

test('versions every WordPress plugin changed by NK-2026-08-24', () => {
  assert.match(warehouse, /Version:\s+1\.3\.0/);
  assert.match(production, /Version:\s+2\.1\.0/);
  assert.match(changelog, /Version:\s+1\.1\.0/);
  assert.match(changelog, /nakama_changelog_release_id\( '2026-08-24' \)/);
});

test('installs a repeatable manual catalog mapping schema', () => {
  assert.match(warehouse, /NAKAMA_WH_SCHEMA_VERSION', '1\.3\.0'/);
  assert.match(warehouse, /function nakama_wh_catalog_maps_table\(\)/);
  assert.match(warehouse, /CREATE TABLE \{\$maps\}[\s\S]*?UNIQUE KEY variation_id \(variation_id\)/);
  assert.match(warehouse, /update_option\( 'nakama_wh_schema_version', NAKAMA_WH_SCHEMA_VERSION/);
  assert.match(warehouse, /add_action\( 'init',[\s\S]*?nakama_wh_install_schema/);
});

test('protects catalog mapping routes with administrator capability', () => {
  assert.match(warehouse, /function nakama_wh_admin_permission\(\)[\s\S]*?current_user_can\( 'manage_options' \)/);
  assert.match(warehouse, /\/warehouse\/catalog-products/);
  assert.match(warehouse, /\/warehouse\/manual-products/);
  assert.match(warehouse, /'permission_callback'\s*=>\s*'nakama_wh_admin_permission'/);
  assert.match(warehouse, /'can_manage'\s*=>\s*current_user_can\( 'manage_options' \)/);
});

test('creates mappings atomically and reuses the existing variation override', () => {
  assert.match(warehouse, /function nakama_wh_rest_manual_product_save/);
  assert.match(warehouse, /START TRANSACTION/);
  assert.match(warehouse, /COMMIT/);
  assert.match(warehouse, /ROLLBACK/);
  assert.match(warehouse, /update_post_meta\( \$variation_id, '_nakama_base_sku', \$sku_key \)/);
  assert.match(warehouse, /'origin'\s*=>\s*'manual'/);
});

test('removes only unreferenced manual SKU rows and keeps movement history', () => {
  assert.match(warehouse, /function nakama_wh_rest_manual_product_delete/);
  assert.match(warehouse, /nakama_wh_sku_has_variation_references/);
  assert.match(warehouse, /'origin'\s*=>\s*'manual'/);

  const deleteFunction = warehouse.match(/function nakama_wh_rest_manual_product_delete[\s\S]*?\n}\n/);
  assert.ok(deleteFunction, 'manual product deletion function must exist');
  assert.doesNotMatch(deleteFunction[0], /nakama_wh_moves_table\(\)/);
});

test('renders the administrator flow in WordPress and the Next.js warehouse', () => {
  assert.match(warehouse, /Productos sin color/);
  assert.match(warehouse, /id="nw-manual-product-search"/);

  const nextPanel = fs.readFileSync(nextPanelPath, 'utf8');
  assert.match(nextPanel, /Productos sin color/);
  assert.match(nextPanel, /Color oculto/);
  assert.match(nextPanel, /role="alert"/);
});

test('production fills a missing public color from the warehouse SKU mapping', () => {
  assert.match(production, /nakama_wh_resolve_for_item\( \$item \)/);
  assert.match(production, /'feet'\s*=>\s*'Kaki'/);
  assert.match(production, /'bone'\s*=>\s*'Hueso'/);
});
