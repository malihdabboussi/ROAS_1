# Stripe Integration — Financial Operations Reference

---

## 1. Key Stripe Objects for Revenue Tracking

### Object Hierarchy

```
Customer
  └── Subscription
        └── Invoice (auto-generated per billing cycle)
              └── InvoiceLineItem
                    └── Charge / PaymentIntent
                          └── BalanceTransaction
```

### PaymentIntent

The core object representing a payment operation.

| Attribute              | Purpose                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | Unique identifier (pi_xxx)                                                                                                                      |
| `status`               | Payment state: `requires_payment_method`, `requires_confirmation`, `requires_action`, `processing`, `requires_capture`, `canceled`, `succeeded` |
| `amount`               | Amount intended to be collected (in smallest currency unit, e.g. cents)                                                                         |
| `currency`             | Three-letter ISO currency code                                                                                                                  |
| `customer`             | Reference to Customer object                                                                                                                    |
| `invoice`              | Reference to Invoice (if subscription payment)                                                                                                  |
| `metadata`             | Custom key-value pairs for tracking                                                                                                             |
| `statement_descriptor` | Text on customer's bank statement                                                                                                               |

### Charge

Created when a PaymentIntent succeeds. Represents the actual money movement.

| Attribute             | Purpose                          |
| --------------------- | -------------------------------- |
| `id`                  | Unique identifier (ch_xxx)       |
| `amount`              | Amount charged                   |
| `amount_captured`     | Amount actually captured         |
| `amount_refunded`     | Amount refunded                  |
| `balance_transaction` | Reference to BalanceTransaction  |
| `payment_intent`      | Reference to PaymentIntent       |
| `refunded`            | Boolean — fully refunded or not  |
| `status`              | `succeeded`, `pending`, `failed` |

### BalanceTransaction

**The recommended starting point for revenue reporting.** Represents every type of transaction flowing through your account.

| Attribute            | Purpose                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Unique identifier (txn_xxx)                                                                                                 |
| `type`               | Transaction classification: `charge`, `refund`, `payment`, `transfer`, `payout`, `payment_reversal`, `payment_refund`, etc. |
| `amount`             | Gross amount (in smallest currency unit)                                                                                    |
| `fee`                | Total fees deducted                                                                                                         |
| `net`                | Net impact = `amount - fee`                                                                                                 |
| `status`             | `available` or `pending`                                                                                                    |
| `source`             | ID of related object (Charge, Refund, etc.)                                                                                 |
| `reporting_category` | Accounting classification                                                                                                   |
| `fee_details`        | Breakdown: application fees, Stripe fees, tax                                                                               |
| `created`            | Timestamp                                                                                                                   |
| `available_on`       | When funds become available for payout                                                                                      |

### Subscription

| Attribute                                     | Purpose                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                                          | Unique identifier (sub_xxx)                                                                          |
| `status`                                      | `active`, `past_due`, `canceled`, `unpaid`, `trialing`, `incomplete`, `incomplete_expired`, `paused` |
| `current_period_start` / `current_period_end` | Current billing period                                                                               |
| `items`                                       | Array of SubscriptionItems (plan/price references)                                                   |
| `cancel_at_period_end`                        | Whether subscription cancels at end of period                                                        |
| `trial_start` / `trial_end`                   | Trial period dates                                                                                   |
| `metadata`                                    | Custom key-value pairs                                                                               |

### Invoice

| Attribute                     | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `id`                          | Unique identifier (in_xxx)                       |
| `status`                      | `draft`, `open`, `paid`, `void`, `uncollectible` |
| `amount_due`                  | Total amount due                                 |
| `amount_paid`                 | Amount successfully collected                    |
| `amount_remaining`            | Outstanding balance                              |
| `subscription`                | Reference to Subscription                        |
| `lines`                       | Array of InvoiceLineItems                        |
| `period_start` / `period_end` | Billing period                                   |
| `due_date`                    | Payment due date                                 |
| `paid`                        | Boolean                                          |

---

## 2. Invoice Lifecycle

### Status Transitions

```
  draft ──→ open ──→ paid       (success path)
              │
              ├──→ void         (canceled/credited)
              │
              └──→ uncollectible (written off)
```

| Transition                  | Webhook Event                  | Final Status   |
| --------------------------- | ------------------------------ | -------------- |
| Draft → Finalized           | `invoice.finalized`            | open           |
| Open → Paid                 | `invoice.paid`                 | paid           |
| Open → Payment Failed       | `invoice.payment_failed`       | open (retries) |
| Open → Sent                 | `invoice.sent`                 | open           |
| Open → Voided               | `invoice.voided`               | void           |
| Open → Marked Uncollectible | `invoice.marked_uncollectible` | uncollectible  |

### Automatic Collection Behavior

- Stripe auto-finalizes invoices when automatic collection is enabled
- Waits 1 hour for webhook endpoint responses before attempting payment
- Waits up to 72 hours before finalizing if no webhook response received
- Failed payments trigger retry logic per your Smart Retries configuration

---

## 3. MRR Calculation from Stripe Data

### MRR Components

| Component           | Definition                      | Calculation                                                         |
| ------------------- | ------------------------------- | ------------------------------------------------------------------- |
| **New MRR**         | Revenue from new customers      | Sum of first subscription amounts                                   |
| **Expansion MRR**   | Upgrades, seat growth, add-ons  | Difference between new and old amounts for upgraded subscriptions   |
| **Contraction MRR** | Revenue lost from downgrades    | Difference between old and new amounts for downgraded subscriptions |
| **Churn MRR**       | Revenue lost from cancellations | Sum of canceled subscription amounts                                |
| **Net New MRR**     | Overall change                  | New + Expansion - Contraction - Churn                               |

### Configuration Options (Stripe Dashboard)

**Discount handling:**

- Subtract one-time discounts from MRR (conservative)
- Subtract recurring discounts from MRR (reflects present value)
- Permanent recurring discounts are always subtracted

**Active subscriber definition:**

- Count active at subscription start (most common)
- Count active after first payment received (stricter)

### Available Reports (CSV)

| Report                       | Contents                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| MRR per subscriber per month | Individual subscriber MRR contributions                                 |
| Subscription metrics summary | MRR roll-forward, active subscribers, trial conversions, LTV            |
| Customer MRR changes         | New subscribers, upgrades, downgrades, reactivations, churn — per event |

---

## 4. Financial Metrics Derivable from Stripe

### Revenue Metrics

| Metric          | Formula                                                      | Source                                |
| --------------- | ------------------------------------------------------------ | ------------------------------------- |
| **MRR**         | Sum of all active subscription amounts normalized to monthly | Subscriptions API + Billing Analytics |
| **ARR**         | MRR × 12                                                     | Derived from MRR                      |
| **ARPU**        | MRR / Active Subscribers                                     | Subscriptions + Customers             |
| **Revenue**     | Sum of successful charges                                    | BalanceTransactions (type: charge)    |
| **Net Revenue** | Revenue - Refunds - Fees                                     | BalanceTransactions (net field)       |

### Churn Metrics

| Metric               | Formula                                              | Source            |
| -------------------- | ---------------------------------------------------- | ----------------- |
| **Gross Churn Rate** | (Churned MRR / Starting MRR) × 100                   | Billing Analytics |
| **Net Churn Rate**   | ((Churned MRR - Expansion MRR) / Starting MRR) × 100 | Billing Analytics |
| **Customer Churn**   | Canceled subscriptions / Total subscriptions         | Subscriptions API |

Stripe distinguishes:

- **Gross churn**: Revenue lost from cancellations/downgrades, excluding gains
- **Net churn**: Includes expansion revenue offsetting losses

Configuration changes take 24–48 hours to appear in dashboard.

### LTV and Growth Metrics

| Metric                    | Formula                                           | Source                              |
| ------------------------- | ------------------------------------------------- | ----------------------------------- |
| **LTV**                   | ARPU / Gross Churn Rate                           | Derived                             |
| **Trial Conversion Rate** | Converted trials / Total trials                   | Subscription metrics summary report |
| **Revenue Growth Rate**   | (Current MRR - Previous MRR) / Previous MRR × 100 | Billing Analytics                   |

---

## 5. Webhook Patterns for Real-Time Tracking

### Critical Webhooks for Financial Operations

**Subscription lifecycle:**

```
customer.subscription.created      → New subscription started
customer.subscription.updated      → Plan change, status change
customer.subscription.deleted      → Subscription canceled
customer.subscription.trial_will_end → Trial ending in 3 days (default)
customer.subscription.paused       → Subscription paused
customer.subscription.resumed      → Subscription resumed
```

**Payment tracking:**

```
invoice.paid                       → Payment succeeded
invoice.payment_failed             → Payment failed
invoice.finalized                  → Invoice ready for payment
payment_intent.succeeded           → PaymentIntent completed
payment_intent.payment_failed      → PaymentIntent failed
charge.succeeded                   → Charge successful
charge.refunded                    → Refund processed
```

**Disputes:**

```
charge.dispute.created             → Customer disputed charge
charge.dispute.closed              → Dispute resolved
```

### Webhook Best Practices

1. **Respond quickly** — return 2xx status before processing complex logic
2. **Idempotency** — handle duplicate events (use event ID for deduplication)
3. **Verify signatures** — always validate `Stripe-Signature` header
4. **Retry behavior** — Stripe retries failed webhooks for up to 3 days with exponential backoff (live mode)
5. **Order independence** — don't assume events arrive in order; check object state via API if needed
6. **Event types to monitor** — subscribe only to events you handle; ignore unknown event types gracefully

### Real-Time Revenue Tracking Pattern

```
invoice.paid → Extract:
  - invoice.amount_paid (revenue)
  - invoice.subscription (link to subscription)
  - invoice.customer (link to customer)
  - invoice.lines[].price (product/plan info)

  → Update MRR tracking
  → Categorize: new / expansion / renewal
  → Update customer LTV
```

---

## 6. Reporting Periods and Data Aggregation

### Recommended Aggregation Windows

| Period    | Use Case                                       |
| --------- | ---------------------------------------------- |
| Daily     | Cash flow monitoring, anomaly detection        |
| Weekly    | Operational review, trend identification       |
| Monthly   | MRR reporting, board metrics, investor updates |
| Quarterly | Strategic review, cohort analysis              |
| Annual    | ARR reporting, year-over-year growth           |

### Data Sources

| Need                          | Use                                       |
| ----------------------------- | ----------------------------------------- |
| Transaction-level detail      | BalanceTransactions API                   |
| Subscription metrics          | Billing Analytics dashboard + CSV reports |
| Revenue recognition (accrual) | Revenue Recognition API (6 report types)  |
| Custom queries                | Stripe Sigma (SQL against Stripe data)    |
| Real-time events              | Webhooks                                  |

### Stripe Sigma Tables

For custom reporting, key tables to join:

- `balance_transactions` — core financial data
- `charges` — payment details
- `subscriptions` — recurring revenue
- `customers` — customer info
- `invoices` — billing documents
- `invoice_line_items` — line-level detail

Join via `source` ID on balance_transactions to link to originating objects.

---

## 7. Key Integration Patterns

### Pattern 1: Revenue Dashboard

```
Webhooks (invoice.paid, charge.refunded)
  → Event processor (validate + deduplicate)
  → Aggregate into daily/monthly revenue tables
  → Calculate MRR, ARR, churn, LTV
  → Serve to dashboard
```

### Pattern 2: Subscription Health Monitor

```
Webhooks (subscription.updated, subscription.deleted, invoice.payment_failed)
  → Categorize event (expansion, contraction, churn, payment failure)
  → Update subscriber health score
  → Trigger alerts for at-risk accounts
  → Feed churn prediction model
```

### Pattern 3: Financial Reconciliation

```
Daily cron:
  → Fetch BalanceTransactions for previous day
  → Group by reporting_category
  → Compare against internal revenue records
  → Flag discrepancies
  → Generate reconciliation report
```
