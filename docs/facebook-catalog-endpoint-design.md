# Facebook Catalog REST Endpoint

## Understanding summary

- Meta needs a public CSV product feed served from `/wp-json/nakama/v1/facebook-catalog`.
- The existing endpoint times out for both normal clients and Meta's crawler.
- The WordPress homepage and REST index respond successfully to both clients.
- The endpoint must support simple and variable WooCommerce products.
- The REST URL must remain unchanged and require no authentication.
- Static feed files and non-REST URLs are out of scope.

## Assumptions

- WooCommerce is active when the plugin registers the endpoint.
- The catalog is small or medium, but must not be loaded into memory at once.
- Meta can consume a streamed UTF-8 CSV response.
- Products without a usable price or image should be omitted.

## Final design

The endpoint sends CSV headers immediately and reads published, visible products in pages of 50. Each parent product is converted and emitted before the next page is loaded. Variable products use their parent price and availability; size and color selection remains on the WooCommerce storefront. This keeps feed generation within the hosting response limit.

Adding `?diagnostic=1` returns a fixed valid CSV row without querying products. This separates endpoint and hosting failures from WooCommerce catalog-generation failures.

## Reliability and security

- The endpoint remains public because Meta cannot authenticate to the feed.
- Only published, catalog-visible products are exposed.
- Pagination bounds memory use and avoids a single unbounded product query.
- CSV cells are escaped before output.
- The endpoint returns CORS and short cache headers suitable for a public feed.

## Validation

1. Request the endpoint with `?diagnostic=1` and confirm an immediate CSV response.
2. Request the normal endpoint and confirm the CSV header and product rows.
3. Test both URLs with a normal user agent and `facebookexternalhit`.
4. Configure the normal URL as Meta's scheduled data source.

## Decision log

- Keep the existing REST URL to avoid changing the Meta integration.
- Use batches of 50 to limit memory and response delay.
- Publish one row per parent product and use its numeric WooCommerce ID in both the feed and Pixel events.
- Add a diagnostic query parameter to isolate failures without another deployment.
- Do not add caching until production output is confirmed stable.
- Do not request a Meta firewall allowlist because the hosting accepts Meta's user agent on other routes.
