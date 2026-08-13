# Production Quality Review and Rework

## Understanding summary

- Orders require a supervisor quality review after production and before completion.
- Supervisors can approve an order or return the complete order to the production queue.
- Every rejected order item requires a rejected quantity and a comment.
- Only rejected lines lose their production validation when an order is returned.
- Any available operator may take a returned order, but only that operator may work and finish the cycle.
- Every production and rework cycle records operator, start, finish, and duration.
- Weekly and monthly reports count rejected units and show operator names and cycle times.
- Review is available on web and Android; reports are available only on the web.

## Assumptions and constraints

- The workshop processes fewer than 500 orders per month.
- Rework history is permanent and cannot be overwritten by later cycles.
- WooCommerce remains the source of truth for order status.
- The production plugin owns review data, permissions, and APIs.
- Prices, customer administration, and shipping-label generation are out of scope.
- Existing completed orders are not reconstructed into the new reporting model.
- Existing orders in `pendiente-guia` require quality review after deployment.
- Reports should respond within a few seconds at the expected scale.

## Architecture

The existing WooCommerce flow remains:

```text
processing -> fabricando -> pendiente-guia -> completed
                    ^              |
                    +--- rework ---+
```

Quality approval is a completion gate, not a new WooCommerce status. An order can become `completed` only when it has both a shipping guide and supervisor approval.

The plugin adds three normalized tables:

### `nakama_prod_cycles`

- `id`
- `order_id`
- `cycle_number`
- `cycle_type` (`initial` or `rework`)
- `operator_user_id`
- `operator_name`
- `units_total`
- `started_at`
- `finished_at`
- `duration_seconds`
- `status`

### `nakama_prod_reviews`

- `id`
- `order_id`
- `cycle_id`
- `supervisor_user_id`
- `supervisor_name`
- `decision` (`approved` or `rework`)
- `units_reviewed`
- `units_rejected`
- `reviewed_at`

### `nakama_prod_review_items`

- `id`
- `review_id`
- `order_item_id`
- `product_id`
- `variation_id`
- `product_name`
- `quantity_ordered`
- `quantity_rejected`
- `comment`

User names and product names are stored as historical snapshots in addition to IDs. Tables are indexed by order, cycle, operator, decision, and date.

The order retains lightweight compatibility metadata:

```text
_nakama_prod_active_cycle_id
_nakama_prod_quality_approved
```

Existing production metadata remains during migration so older web and mobile clients do not break immediately.

## Permissions

Operators retain:

```text
access_production_dashboard
```

Supervisors and administrators receive:

```text
review_production_orders
```

Only the operator who owns the active cycle may validate items or finish that cycle. A supervisor may release or reassign an active cycle while preserving elapsed time and an audit reason.

Reports and complete operator comparisons require the supervisor permission. Operators cannot modify historical reviews.

## Production and review flow

1. An available operator takes an order.
2. The server creates an initial or rework cycle and records the operator and start time.
3. Only that operator validates lines and finishes the cycle.
4. Finishing closes the cycle, calculates duration, clears quality approval, and moves the order to `pendiente-guia`.
5. A supervisor opens the order and reviews every line.
6. Approval records the review and sets quality approval.
7. If a guide already exists, approval may complete the order immediately. Otherwise it waits for the guide.
8. A rejection records affected lines, quantities, and comments; clears validation only on those lines; and returns the complete order to `processing`.
9. Any operator may take the returned order, creating the next rework cycle.

A rejected line must have a quantity between 1 and its ordered quantity and a non-empty comment. Approval cannot contain rejected items. Repeated submissions return the existing result instead of creating duplicate reviews.

## API changes

Existing endpoints remain and become cycle-aware:

```text
POST /production/take
POST /production/validate
POST /production/finish
```

New endpoints:

```text
POST /production/review
POST /production/reassign
GET  /production/reports
```

Example rejection request:

```json
{
  "order_id": 123,
  "decision": "rework",
  "items": [
    {
      "item_id": 456,
      "quantity_rejected": 2,
      "comment": "Falta rematar el bordado"
    }
  ]
}
```

Order details expose the active cycle, latest review status, current rework instructions, and cycle history as allowed by the caller's permission.

## Web and mobile experience

Cards in `pendiente-guia` display either `Pending review` or `Approved, waiting for guide`.

The supervisor review shows each item's image, name, attributes, ordered quantity, operator, quality result, rejected quantity, and comment. `Return to production` remains disabled until all rejected items have valid quantities and comments. Approval warns when an existing guide will cause immediate completion.

Returned cards show the rework cycle number and rejected-unit count. When an operator takes the order, rejected items and supervisor comments appear first. Correct lines remain validated; rejected lines must be validated again.

Web and Android share API rules and labels. Reports are intentionally omitted from Android.

## Reports

The supervisor-only web tab offers `Week` and `Month` modes with current, previous, and custom periods.

Summary metrics:

- Rejected units.
- Orders sent to rework.
- Rejected units divided by reviewed units.
- Average cycle duration.
- Average accumulated production time per order.
- Orders approved on the first review.

The main chart shows rejected units per day for a week and per week for a month. Selecting a bar reveals its records.

The operator table shows cycles completed, units produced, rejected units, rework rate, average time, and total time. A rejection is attributed to the operator responsible for the rejected cycle, not the operator who later repairs it.

Productive time runs from `take` to `finish`. Supervisor waiting time is excluded. Accumulated order effort is the sum of all cycle durations.

The detail report includes order, cycle, item, rejected quantity, comment, responsible operator, supervisor, review date, and cycle duration.

## Reliability and error handling

- Taking an assigned order returns `409 Conflict` with the current operator.
- Finishing or reviewing twice does not duplicate cycle or review records.
- A review applies only to the latest finished cycle.
- Review records, rejected items, validation resets, and order transitions are one logical operation.
- Mobile review forms retain entered comments after transient network failures.
- Approval and rejection are not applied optimistically in either client.
- Guide detection checks quality approval before completion.
- Quality approval also checks for an existing guide, covering either event order.

## Migration and rollout

- Add a plugin schema version and create or update tables with `dbDelta`.
- Grant the supervisor capability explicitly to selected users and administrators.
- Initialize a cycle lazily for active legacy orders when the next production action occurs.
- Present legacy `pendiente-guia` orders as pending quality review.
- Keep legacy metadata during a compatibility window.
- Release backend changes before or together with the updated web and Android clients.

## Validation strategy

- Initial production approved on first review.
- Partial quantity rejection on a multi-unit line.
- Multiple rework cycles on one order.
- Validation reset only for rejected lines.
- Concurrent take attempts.
- Unauthorized review and report access.
- Reassignment of an active cycle.
- Guide arriving before and after approval.
- Duplicate finish and review submissions.
- Weekly and monthly aggregation boundaries and time zones.
- Operator attribution and accumulated durations.
- HPOS compatibility and migration with active orders.
- Equivalent review behavior on web and Android.

## Decision log

1. Use a separate supervisor capability instead of allowing operators to self-review.
2. Return the complete order to the production queue when any item fails.
3. Require a comment for every rejected order line.
4. Count rejected physical units as the primary rework metric.
5. Record each production/rework cycle separately and calculate accumulated effort.
6. Limit complete reports to supervisors and administrators.
7. Require quality approval even when a shipping guide already exists.
8. Reset validation only for rejected lines.
9. Allow any available operator to take a returned order.
10. Allow only the operator who owns a cycle to validate and finish it.
11. Support review on web and Android, with reports only on web.
12. Store rejected quantity within a line instead of rejecting the entire line.
13. Use normalized history tables rather than order metadata arrays or parsed notes.
14. Attribute rejected units to the operator of the rejected cycle.
15. Exclude supervisor waiting time from operator production duration.
