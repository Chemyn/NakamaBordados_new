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

The endpoint sends CSV headers immediately and reads published, visible parent products in pages of 10. Simple products produce one row. Variable products produce one row per purchasable variation, using the variation ID as `id` and the parent product ID as `item_group_id`. Rows are flushed periodically instead of being accumulated in memory.

Each row includes `quantity_to_sell_on_facebook`. For variations managed by Nakama Warehouse, the effective shared stock is used; otherwise the WooCommerce stock quantity or a conservative in-stock value is used.

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
- Use small parent-product batches and stream variation rows to limit memory.
- Publish numeric WooCommerce variation IDs and group them with the numeric parent ID.
- Send Pixel `ViewContent` as `product_group` for variable products and `AddToCart` with the selected variation ID.
- Add a diagnostic query parameter to isolate failures without another deployment.
- Do not add caching until production output is confirmed stable.
- Do not request a Meta firewall allowlist because the hosting accepts Meta's user agent on other routes.
