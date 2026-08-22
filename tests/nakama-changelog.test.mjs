import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginPath = path.join(projectRoot, 'nakama-changelog', 'nakama-changelog.php');
const stylesheetPath = path.join(projectRoot, 'nakama-changelog', 'assets', 'admin.css');
const heroPath = path.join(projectRoot, 'nakama-changelog', 'assets', 'nakama-changelog-hero.png');
const plugin = fs.readFileSync(pluginPath, 'utf8');
const stylesheet = fs.readFileSync(stylesheetPath, 'utf8');

test('registers an administrators-only changelog page and dashboard widget', () => {
  assert.match(plugin, /add_menu_page\([\s\S]*?'manage_options'[\s\S]*?NAKAMA_CHANGELOG_PAGE/);
  assert.match(plugin, /add_action\( 'wp_dashboard_setup', 'nakama_changelog_register_dashboard_widget' \)/);
  assert.match(plugin, /current_user_can\( 'manage_options' \)/);
  assert.match(plugin, /wp_die\( esc_html__/);
});

test('uses the NK plus ISO date release system', () => {
  assert.match(plugin, /return 'NK-' \. \$date/);
  const releases = [...plugin.matchAll(/nakama_changelog_release_id\( '(\d{4}-\d{2}-\d{2})' \)/g)];
  assert.ok(releases.length > 0);
  for (const [, date] of releases) {
    assert.match(`NK-${date}`, /^NK-\d{4}-\d{2}-\d{2}$/);
  }
});

test('loads scoped local assets only on the changelog and dashboard screens', () => {
  assert.match(plugin, /array\( 'index\.php', 'toplevel_page_' \. NAKAMA_CHANGELOG_PAGE \)/);
  assert.match(plugin, /plugin_dir_url\( __FILE__ \) \. 'assets\/admin\.css'/);
  assert.match(plugin, /assets\/nakama-changelog-hero\.png/);
  assert.doesNotMatch(plugin, /https?:\/\//);
});

test('ships a wide PNG hero and responsive accessible styles', () => {
  const hero = fs.readFileSync(heroPath);
  assert.deepEqual([...hero.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const width = hero.readUInt32BE(16);
  const height = hero.readUInt32BE(20);
  assert.ok(width / height >= 1.8, `expected a wide hero, received ${width}x${height}`);

  assert.match(stylesheet, /@media screen and \(max-width: 782px\)/);
  assert.match(stylesheet, /:focus-visible/);
  assert.match(stylesheet, /prefers-reduced-motion/);
});

test('escapes dynamic changelog output before rendering it', () => {
  assert.match(plugin, /esc_html\( \$entry\['title'\] \)/);
  assert.match(plugin, /esc_html\( \$item \)/);
  assert.match(plugin, /esc_attr\( \$entry\['date'\] \)/);
  assert.match(plugin, /esc_url\( plugin_dir_url\( __FILE__ \)/);
});
