<?php

declare(strict_types=1);

define('ABSPATH', __DIR__ . '/');
define('HOUR_IN_SECONDS', 3600);
define('DAY_IN_SECONDS', 86400);
define('MB_IN_BYTES', 1048576);
define('COOKIEPATH', '/');
define('COOKIE_DOMAIN', '');

$actions = [];
$filters = [];
$registeredRestRoutes = [];
$registeredGraphqlFields = [];
$testWooEndpoint = '';
function add_action(...$args): void {
    global $actions;
    $actions[$args[0]][] = $args[1];
}
function add_filter(...$args): void {
    global $filters;
    $filters[$args[0]][] = $args[1];
}
function register_rest_route(string $namespace, string $route, array $args): void {
    global $registeredRestRoutes;
    $registeredRestRoutes[$namespace . $route] = $args;
}
function register_graphql_field(string $typeName, string $fieldName, array $config): void {
    global $registeredGraphqlFields;
    $registeredGraphqlFields[$typeName][$fieldName] = $config;
}

function sanitize_text_field(mixed $value): string { return trim((string) $value); }
function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
function sanitize_email(mixed $value): string { return trim((string) $value); }
function get_option(string $key, mixed $default = false): mixed {
    global $testOptions;
    if (array_key_exists($key, $testOptions)) return $testOptions[$key];
    return match ($key) {
        'nakama_quote_folio_counter' => 9999,
        'woocommerce_currency' => 'MXN',
        'nakama_quote_product_id' => 777,
        default => $default,
    };
}
function update_option(string $key, mixed $value, bool $autoload = true): bool {
    global $testOptions;
    $testOptions[$key] = $value;
    return true;
}
function get_transient(string $key): mixed {
    global $testTransients;
    return $testTransients[$key] ?? false;
}
function set_transient(string $key, mixed $value, int $expiration): bool {
    global $testTransients;
    $testTransients[$key] = $value;
    return true;
}
function wp_remote_get(string $url, array $args = []): mixed {
    global $testRemoteResponse;
    return $testRemoteResponse;
}
function wp_remote_retrieve_body(mixed $response): string {
    return is_array($response) ? (string) ($response['body'] ?? '') : '';
}
function get_post_status(int $id): string { return 'publish'; }
function wc_get_orders(array $args): array { return []; }
function get_current_user_id(): int { return 0; }
function get_user_by(string $field, mixed $value): mixed { return false; }
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }
function rest_ensure_response(mixed $value): FakeResponse { return new FakeResponse($value); }
function home_url(string $path = ''): string { return 'https://example.test' . $path; }
function esc_url(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function wp_strip_all_tags(mixed $value): string { return strip_tags((string) $value); }
function add_query_arg(array $args, string $url): string {
    return $url . '?' . http_build_query($args, '', '&', PHP_QUERY_RFC3986);
}
function wc_add_notice(string $message, string $type = 'success'): void {}
function is_wc_endpoint_url(string $endpoint = ''): bool {
    global $testWooEndpoint;
    return $endpoint === $testWooEndpoint;
}
function wc_get_order(int $id): mixed {
    global $ordersById;
    return $ordersById[$id] ?? false;
}

class WP_REST_Request {
    public function __construct(private array $params = []) {}
    public function get_json_params(): array { return $this->params; }
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
}
class WP_User {}
class WC_Abstract_Order {}
class WP_Error {}

final class WC_Order_Item_Fee {
    public function set_name(string $name): void {}
    public function set_amount(float|int $amount): void {}
    public function set_total(float|int $total): void {}
}

final class FakeResponse {
    public function __construct(public mixed $data) {}
    public function header(string $key, string $value): void {}
}

final class FakeFee {
    public function __construct(private string $name) {}

    public function get_name(): string {
        return $this->name;
    }
}

final class FakeOrder extends WC_Abstract_Order {
    public function __construct(
        private array $meta = [],
        private string $status = 'pending',
        private bool $needsPayment = true,
        private mixed $total = '100.00',
        private string $currency = 'MXN',
        private array $fees = [],
        private string $paymentMethod = '',
        private int $id = 1,
        private string $orderKey = 'wc_order_test',
        private string $orderNumber = '1',
        private string $paymentTitle = 'Método de prueba',
        private string $firstName = 'Cliente'
    ) {}

    public function get_meta(string $key): mixed {
        return $this->meta[$key] ?? '';
    }

    public function get_status(): string {
        return $this->status;
    }

    public function needs_payment(): bool {
        return $this->needsPayment;
    }

    public function get_total(): mixed {
        return $this->total;
    }

    public function get_currency(): string {
        return $this->currency;
    }

    public function get_payment_method(): string {
        return $this->paymentMethod;
    }

    public function get_id(): int {
        return $this->id;
    }

    public function get_order_key(): string {
        return $this->orderKey;
    }

    public function is_paid(): bool {
        return ! $this->needsPayment;
    }

    public function get_order_number(): string { return $this->orderNumber; }
    public function get_payment_method_title(): string { return $this->paymentTitle; }
    public function get_billing_first_name(): string { return $this->firstName; }
    public function get_date_created(): object {
        return new class {
            public function date(string $format): string { return '2026-09-09T12:00:00+00:00'; }
        };
    }

    public function get_items(string $type = ''): array {
        return $type === 'fee' ? $this->fees : [];
    }
}

final class FakeCreatedOrder extends WC_Abstract_Order {
    public array $meta = [];

    public function add_item(WC_Order_Item_Fee $fee): void {}
    public function set_billing_first_name(string $value): void {}
    public function set_billing_last_name(string $value): void {}
    public function set_billing_email(string $value): void {}
    public function set_billing_phone(string $value): void {}
    public function set_currency(string $value): void {}
    public function update_meta_data(string $key, mixed $value): void { $this->meta[$key] = $value; }
    public function add_order_note(string $note): void {}
    public function calculate_totals(): void {}
    public function set_status(string $status, string $note = ''): void {}
    public function save(): void {}
    public function get_id(): int { return 501; }
}

$createdOrder = new FakeCreatedOrder();
$testOptions = [];
$testTransients = [];
$testRemoteResponse = new WP_Error();
function wc_create_order(array $args): FakeCreatedOrder {
    global $createdOrder;
    return $createdOrder;
}

final class FakeCart {
    public int $addCalls = 0;
    public array $items = ['existing-product' => ['quantity' => 2]];

    public function add_to_cart(...$args): string {
        $this->addCalls++;
        $this->items['quote-cart-key'] = $args[4] + ['quantity' => 1];
        return 'quote-cart-key';
    }

    public function get_cart(): array { return $this->items; }
    public function is_empty(): bool { return $this->items === []; }
    public function remove_cart_item(string $key): void { unset($this->items[$key]); }
    public function set_quantity(string $key, int $quantity, bool $refresh): void {
        $this->items[$key]['quantity'] = $quantity;
    }
}

final class FakeWooCommerce {
    public function __construct(public FakeCart $cart) {}
}

final class FakeErrors {
    public array $codes = [];
    public function add(string $code, string $message): void { $this->codes[] = $code; }
}

final class FakeLineItem {
    public array $meta = [];

    public function add_meta_data(string $key, mixed $value, bool $unique): void {
        $this->meta[$key] = $value;
    }

    public function get_meta(string $key): mixed { return $this->meta[$key] ?? ''; }
}

final class FakeCheckoutOrder {
    public function __construct(private array $items) {}
    public function get_items(string $type = ''): array { return $this->items; }
}

final class FakeTransferSource extends WC_Abstract_Order {
    public string $status = 'pending';
    public array $meta = [];

    public function get_meta(string $key): mixed { return $this->meta[$key] ?? ''; }
    public function get_items(string $type = ''): array { return []; }
    public function get_status(): string { return $this->status; }
    public function needs_payment(): bool { return true; }
    public function get_total(): string { return '100.00'; }
    public function get_currency(): string { return 'MXN'; }
    public function has_status(string $status): bool { return $this->status === $status; }
    public function add_order_note(string $note): void {}
    public function save(): void {}
    public function delete_meta_data(string $key): void { unset($this->meta[$key]); }
    public function update_meta_data(string $key, mixed $value): void { $this->meta[$key] = $value; }
    public function update_status(string $status, string $note = ''): void { $this->status = $status; }
}

$fakeCart = new FakeCart();
$fakeWooCommerce = new FakeWooCommerce($fakeCart);
$ordersById = [];
function WC(): FakeWooCommerce {
    global $fakeWooCommerce;
    return $fakeWooCommerce;
}

function assert_same(mixed $expected, mixed $actual, string $message): void {
    if ($expected !== $actual) {
        throw new RuntimeException(sprintf(
            "%s\nExpected: %s\nActual: %s",
            $message,
            var_export($expected, true),
            var_export($actual, true)
        ));
    }
}

require dirname(__DIR__) . '/nakama-checkout-tools.php';

$testOptions['woocommerce_bacs_accounts'] = [[
    'account_name' => 'Nakama Bordados',
    'bank_name' => 'Banco de prueba',
    'account_number' => '1234567890',
    'iban' => '',
    'bic' => '',
    'sort_code' => '',
]];
$testOptions['woocommerce_bacs_settings'] = [
    'instructions' => '<strong>Incluye tu número de pedido como referencia.</strong>',
];
$confirmationOrder = new FakeOrder(
    status: 'on-hold',
    needsPayment: true,
    total: '610.41',
    currency: 'MXN',
    paymentMethod: 'bacs',
    id: 115,
    orderKey: 'wc_order_secret',
    orderNumber: '115',
    paymentTitle: 'Transferencia bancaria',
    firstName: 'Samantha'
);
$ordersById[115] = $confirmationOrder;

$returnUrlFilter = $filters['woocommerce_get_return_url'][0] ?? null;
assert_same(
    'https://example.test/pedido-confirmado/#order=115&key=wc_order_secret',
    is_callable($returnUrlFilter)
        ? $returnUrlFilter('https://example.test/finalizar-compra/order-received/115/', $confirmationOrder)
        : null,
    'Every payment gateway returns to the headless order confirmation page.'
);

$confirmationResponse = nakama_get_order_confirmation(
    new WP_REST_Request(['order' => 115, 'key' => 'wc_order_secret'])
);
assert_same(
    [
        'orderNumber' => '115',
        'status' => 'on-hold',
        'isPaid' => false,
        'total' => '610.41',
        'currency' => 'MXN',
        'dateCreated' => '2026-09-09T12:00:00+00:00',
        'paymentMethod' => 'bacs',
        'paymentTitle' => 'Transferencia bancaria',
        'firstName' => 'Samantha',
        'transferInstructions' => 'Incluye tu número de pedido como referencia.',
        'bankAccounts' => [[
            'accountName' => 'Nakama Bordados',
            'bankName' => 'Banco de prueba',
            'accountNumber' => '1234567890',
            'iban' => '',
            'bic' => '',
            'sortCode' => '',
        ]],
    ],
    $confirmationResponse instanceof FakeResponse ? $confirmationResponse->data : null,
    'A valid order key exposes only the confirmation details needed by the headless page.'
);
assert_same(
    true,
    nakama_get_order_confirmation(new WP_REST_Request(['order' => 115, 'key' => 'wrong'])) instanceof WP_Error,
    'The confirmation endpoint rejects an invalid order key.'
);
assert_same(
    'https://example.test/pedido-confirmado/#order=115&key=wc_order_secret',
    nakama_legacy_confirmation_destination(115, 'wc_order_secret'),
    'A direct visit to the legacy WooCommerce thank-you URL can return to the headless page.'
);
assert_same(
    '',
    nakama_legacy_confirmation_destination(115, 'wrong'),
    'The legacy redirect never forwards an invalid order key.'
);

$testTransients = [];
$testRemoteResponse = ['body' => json_encode(['conversion_rate' => 0.05])];
$liveRate = nakama_get_usd_rate_details();
assert_same('live', $liveRate['source'] ?? null, 'A successful provider response is identified as live.');
assert_same(
    $liveRate['rate'] ?? null,
    $testOptions['nakama_last_valid_usd_rate_v1']['rate'] ?? null,
    'Every successful exchange rate is persisted beyond the short transient cache.'
);

$testTransients = [];
$testRemoteResponse = new WP_Error();
$testOptions['nakama_last_valid_usd_rate_v1'] = ['rate' => 0.057, 'updated_at' => 1700000000];
$staleRate = nakama_get_usd_rate_details();
assert_same(
    ['rate' => 0.057, 'source' => 'stale', 'updated_at' => 1700000000],
    $staleRate,
    'The endpoint keeps serving the last known good rate when the provider is down.'
);

assert_same(
    ['eligible' => false, 'code' => 'invalid_order'],
    nakama_quote_payment_eligibility(false),
    'A missing WooCommerce order fails closed with a stable code.'
);

$order = new FakeOrder(meta: ['_nakama_quote_request' => 'yes']);
assert_same(
    ['eligible' => true, 'code' => 'eligible'],
    nakama_quote_payment_eligibility($order),
    'An explicitly marked pending quote with a positive MXN total is eligible.'
);

$legacyOrder = new FakeOrder(
    meta: ['_nakama_quote_folio' => 'NK-1234'],
    fees: [new FakeFee('Cotización NK-1234 — 20 playeras')]
);
assert_same(
    ['eligible' => true, 'code' => 'eligible'],
    nakama_quote_payment_eligibility($legacyOrder),
    'An unambiguous legacy quote signature remains eligible.'
);

$onHoldOrder = new FakeOrder(
    meta: ['_nakama_quote_request' => 'yes'],
    status: 'on-hold'
);
assert_same(
    ['eligible' => false, 'code' => 'not_payable_status'],
    nakama_quote_payment_eligibility($onHoldOrder),
    'A quote under review is not released for payment.'
);

$paidOrder = new FakeOrder(
    meta: ['_nakama_quote_request' => 'yes'],
    needsPayment: false
);
assert_same(
    ['eligible' => false, 'code' => 'not_payable_status'],
    nakama_quote_payment_eligibility($paidOrder),
    'WooCommerce must still consider the quote payable.'
);

foreach ([0, -1, '', 'not-a-number', NAN, INF] as $invalidTotal) {
    $invalidPriceOrder = new FakeOrder(
        meta: ['_nakama_quote_request' => 'yes'],
        total: $invalidTotal
    );
    assert_same(
        ['eligible' => false, 'code' => 'invalid_price'],
        nakama_quote_payment_eligibility($invalidPriceOrder),
        'A quote total must be numeric, finite, and greater than zero.'
    );
}

$unsupportedCurrencyOrder = new FakeOrder(
    meta: ['_nakama_quote_request' => 'yes'],
    currency: 'EUR'
);
assert_same(
    ['eligible' => false, 'code' => 'unsupported_currency'],
    nakama_quote_payment_eligibility($unsupportedCurrencyOrder),
    'Only quote currencies supported by the checkout are eligible.'
);

$derivedOrder = new FakeOrder(meta: [
    '_nakama_quote_request' => 'yes',
    '_nakama_quote_folio' => 'NK-1234',
    '_nakama_quote_source_order' => '99',
]);
assert_same(
    ['eligible' => false, 'code' => 'not_quote'],
    nakama_quote_payment_eligibility($derivedOrder),
    'A derived order is denied even if the request marker is copied accidentally.'
);

$ordinaryBacsOrder = new FakeOrder(paymentMethod: 'bacs');
assert_same(
    ['eligible' => false, 'code' => 'not_quote'],
    nakama_quote_payment_eligibility($ordinaryBacsOrder),
    'An ordinary payable BACS order is not a quote request.'
);

$failedUsdBacsQuote = new FakeOrder(
    meta: ['_nakama_quote_request' => 'yes'],
    status: 'failed',
    currency: 'USD',
    paymentMethod: 'bacs'
);
assert_same(
    ['eligible' => true, 'code' => 'eligible'],
    nakama_quote_payment_eligibility($failedUsdBacsQuote),
    'A failed USD quote remains eligible even if its payment method is BACS.'
);

$ambiguousLegacyOrder = new FakeOrder(meta: ['_nakama_quote_folio' => 'NK-1234']);
assert_same(
    ['eligible' => false, 'code' => 'not_quote'],
    nakama_quote_payment_eligibility($ambiguousLegacyOrder),
    'A folio without the strict legacy fee signature fails closed.'
);

nakama_create_quote_order(new WP_REST_Request([
    'folio' => 'NK-1234',
    'name' => 'Monkey D Luffy',
    'email' => 'luffy@example.com',
]));
assert_same(
    'yes',
    $createdOrder->meta['_nakama_quote_request'] ?? null,
    'Every newly created quote request receives the HPOS-safe provenance marker.'
);

$ordersById[77] = new FakeOrder(
    paymentMethod: 'bacs',
    id: 77,
    orderKey: 'wc_order_valid'
);
$ordinaryAddResult = nakama_add_quote_to_wc_cart(77, 'wc_order_valid');
assert_same(
    false,
    true === $ordinaryAddResult,
    'A normal BACS order with a valid key is rejected by the cart boundary.'
);
assert_same(
    0,
    $fakeCart->addCalls,
    'Rejecting a normal order does not create a quote placeholder.'
);

$cartBeforeDirectRejection = $fakeCart->items;
$directResult = nakama_prepare_quote_only_cart(77, 'wc_order_valid');
assert_same(
    false,
    true === $directResult,
    'The direct pay-quote boundary rejects a normal order.'
);
assert_same(
    $cartBeforeDirectRejection,
    $fakeCart->items,
    'A rejected direct pay-quote request leaves the existing WooCommerce cart untouched.'
);

$ordersById[88] = new FakeOrder(
    meta: [
        '_nakama_quote_request' => 'yes',
        '_nakama_quote_folio' => 'NK-8800',
        '_nakama_quote_pdf_url' => 'https://example.test/quote.pdf',
    ],
    id: 88,
    orderKey: 'wc_order_quote'
);
$fakeCart->items = ['existing-product' => ['quantity' => 2]];
$fakeCart->addCalls = 0;
assert_same(
    true,
    nakama_prepare_quote_only_cart(88, 'wc_order_quote'),
    'An eligible direct quote enters the quote-only cart.'
);
assert_same(
    ['quote-cart-key'],
    array_keys($fakeCart->items),
    'A successful direct quote replaces prior cart lines only after it was added.'
);

$eligibleLineItem = new FakeLineItem();
assert_same(
    true,
    nakama_populate_quote_order_line_item($eligibleLineItem, [
        'nakama_quote_order_id' => 88,
        'nakama_quote_folio' => 'NK-forged',
    ]),
    'An eligible source can populate the derived line item.'
);
assert_same(
    [
        '_nakama_quote_source_order' => 88,
        'Folio' => 'NK-8800',
        '_nakama_quote_pdf_url' => 'https://example.test/quote.pdf',
    ],
    $eligibleLineItem->meta,
    'Folio and optional PDF are read from the eligible WooCommerce source, not cart input.'
);

assert_same(
    true,
    nakama_graphql_order_quote_payment_eligible($order),
    'The WPGraphQL resolver exposes the central eligibility decision.'
);
assert_same(
    false,
    nakama_graphql_order_quote_payment_eligible($ordinaryBacsOrder),
    'The WPGraphQL resolver fails closed for an ordinary BACS order.'
);
foreach ($actions['graphql_register_types'] ?? [] as $registerGraphqlTypes) {
    $registerGraphqlTypes();
}
assert_same(
    ['non_null' => 'Boolean'],
    $registeredGraphqlFields['Order']['nakamaQuotePaymentEligible']['type'] ?? null,
    'The WPGraphQL payment eligibility field is a non-null Boolean.'
);

$GLOBALS['nakama_in_email'] = true;
assert_same(
    'https://example.test/mi-cuenta/',
    nakama_quote_email_payment_url('https://example.test/native-pay', $order),
    'Eligible quote email payment links lead to the headless account flow.'
);
assert_same(
    'https://example.test/native-pay',
    nakama_quote_email_payment_url('https://example.test/native-pay', $ordinaryBacsOrder),
    'Ordinary order email payment links remain native.'
);

$fakeCart->items = [
    'ordinary-as-quote' => [
        'quantity' => 1,
        'nakama_quote_order_id' => 77,
        'nakama_quote_folio' => 'NK-forged',
    ],
];
nakama_revalidate_quote_cart();
assert_same(
    [],
    $fakeCart->items,
    'Cart and checkout revalidation remove a normal order stored as a quote item.'
);

$fakeCart->items = [
    'ordinary-at-checkout' => [
        'quantity' => 1,
        'nakama_quote_order_id' => 77,
    ],
];
$checkoutErrors = new FakeErrors();
nakama_validate_quote_checkout([], $checkoutErrors);
assert_same(
    ['nakama_quote_invalid'],
    $checkoutErrors->codes,
    'Pre-checkout validation blocks order creation when every quote source is invalid.'
);

$ordinaryLineItem = new FakeLineItem();
assert_same(
    false,
    nakama_populate_quote_order_line_item($ordinaryLineItem, ['nakama_quote_order_id' => 77]),
    'Checkout refuses to transfer quote metadata from an ordinary order.'
);
assert_same(
    [],
    $ordinaryLineItem->meta,
    'Rejected sources cannot transfer folio or PDF metadata.'
);

$ordinaryTransferSource = new FakeTransferSource();
$ordersById[91] = $ordinaryTransferSource;
$ordinarySourceItem = new FakeLineItem();
$ordinarySourceItem->meta['_nakama_quote_source_order'] = 91;
nakama_finalize_quote_sources(700, new FakeCheckoutOrder([$ordinarySourceItem]));
assert_same(
    'pending',
    $ordinaryTransferSource->status,
    'Final checkout processing never cancels an ordinary source order.'
);
assert_same(
    [],
    $ordinaryTransferSource->meta,
    'Final checkout processing never moves folio metadata on an ordinary order.'
);

$eligibleTransferSource = new FakeTransferSource();
$eligibleTransferSource->meta = [
    '_nakama_quote_request' => 'yes',
    '_nakama_quote_folio' => 'NK-9100',
];
$ordersById[92] = $eligibleTransferSource;
$eligibleSourceItem = new FakeLineItem();
$eligibleSourceItem->meta['_nakama_quote_source_order'] = 92;
nakama_finalize_quote_sources(701, new FakeCheckoutOrder([$eligibleSourceItem]));
assert_same(
    'cancelled',
    $eligibleTransferSource->status,
    'Final checkout processing closes an eligible original quote exactly once.'
);
assert_same(
    'NK-9100',
    $eligibleTransferSource->meta['_nakama_quote_folio_ref'] ?? null,
    'Final checkout processing moves the eligible source folio to its reference metadata.'
);
assert_same(
    false,
    isset($eligibleTransferSource->meta['_nakama_quote_folio']),
    'The converted source no longer owns the folio used by the derived order.'
);

echo "PHP quote-payment test suite passed.\n";
