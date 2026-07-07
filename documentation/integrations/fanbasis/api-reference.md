# FanBasis API Documentation

**Base URL:** `https://www.fanbasis.com/public-api`

**Authentication:** All endpoints require an `x-api-key` header.

---

## Table of Contents

### Checkout Sessions

- **DELETE** `/checkout-sessions/{checkoutSessionId}/subscriptions/{subscriptionId}` — Cancel a specific subscription for a checkout session
- **POST** `/checkout-sessions` — Create a checkout session
- **POST** `/checkout-sessions/embedded` — Create an embedded checkout session
- **DELETE** `/checkout-sessions/{checkoutSessionId}` — Delete a checkout session
- **POST** `/checkout-sessions/{checkoutSessionId}/extend-subscription` — Extend a subscription for a specific user and product
- **GET** `/checkout-sessions/{checkoutSessionId}` — Get a checkout session by ID
- **GET** `/checkout-sessions/{checkoutSessionId}/subscriptions` — Get subscriptions for a specific checkout session
- **GET** `/checkout-sessions/{checkoutSessionId}/transactions` — Get transactions for a specific checkout session
- **GET** `/checkout-sessions/{productId}/subscriptions` — Get subscriptions for a specific product
- **GET** `/checkout-sessions/transactions` — Get all transactions for a creator with product filter
- **POST** `/checkout-sessions/transactions/{transactionId}/refund` — Refund a transaction

### Webhook Subscriptions

- **POST** `/webhook-subscriptions` — Create a new webhook subscription
- **DELETE** `/webhook-subscriptions/{webhookSubscriptionId}` — Delete a webhook subscription
- **GET** `/webhook-subscriptions` — Get all webhook subscriptions for the authenticated user
- **POST** `/webhook-subscriptions/{webhookSubscriptionId}/test` — Test a webhook subscription by sending a test event

### Customers

- **POST** `/customers/{customerId}/charge` — Charge a customer using a specific payment method
- **GET** `/customers/{customerId}/payment-methods` — Get saved payment methods for a customer
- **GET** `/customers` — Get unique customers for a creator

### Subscribers

- **GET** `/subscribers` — Get all subscribers for a creator with optional filtering

### Discount Codes

- **POST** `/discount-codes` — Create a new discount code
- **DELETE** `/discount-codes/{id}` — Delete a discount code
- **GET** `/discount-codes/{id}` — Get a specific discount code
- **GET** `/discount-codes` — List discount codes with pagination and search
- **PUT** `/discount-codes/{id}` — Update an existing discount code

### Products

- **GET** `/products` — List all products for a creator

### Transactions

- **GET** `/transactions/{transactionId}` — Get a single transaction by ID

---

## Checkout Sessions

### DELETE `/checkout-sessions/{checkoutSessionId}/subscriptions/{subscriptionId}`

**Description:** Cancel a specific subscription for a checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}/subscriptions/{subscriptionId}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session
- `subscriptionId` (string, required) — ID of the subscription to cancel (AgencyServiceSubscriber ID from subscription list)

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Subscription cancelled successfully`
- `data` (object, optional)
  - `id` (string, optional) — AgencyServiceSubscriber ID
  - `subscription_id` (string, optional) — Same as id, for backwards compatibility
  - `cancelled_at` (string (date-time), optional)
  - `subscription_status` (string, optional) — example: `cancelled`

**400** — Bad Request

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Subscription is not active or already cancelled`
- `data` (array, optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session or subscription not found`
- `data` (array, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to cancel subscription`
- `data` (array, optional)

---

### POST `/checkout-sessions`

**Description:** Create a checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions`

**Auth:** `x-api-key` header

**Request Body** (`application/json`):

- `product` (object, optional)
  - `title` (string, required) — maxLength: 255
  - `description` (string, nullable, optional)
- `amount_cents` (integer, optional) — min: 0
- `application_fee` (number, nullable, optional) — min: 0
- `type` (string, optional) — enum: ['subscription', 'onetime_reusable', 'onetime_non_reusable']
- `metadata` (object, optional)
- `expiration_date` (string, nullable (date), optional)
- `subscription` (object, nullable, optional)
  - `frequency_days` (integer, optional) — min: 1; Required if type is subscription
  - `auto_expire_after_x_periods` (integer, nullable, optional) — min: 1
  - `free_trial_days` (integer, nullable, optional)
  - `initial_fee` (number, nullable, optional) — min: 0
  - `initial_fee_days` (integer, nullable, optional)
- `success_url` (string (uri), optional)
- `webhook_url` (string, nullable (uri), optional)

<details>
<summary>Example Request Body</summary>

```json
{
  "product": {
    "title": "string",
    "description": "string"
  },
  "amount_cents": 0,
  "application_fee": 0,
  "type": "subscription",
  "metadata": {},
  "expiration_date": "2024-07-29",
  "subscription": {
    "frequency_days": 0,
    "auto_expire_after_x_periods": 0,
    "free_trial_days": 0,
    "initial_fee": 0,
    "initial_fee_days": 0
  },
  "success_url": "string",
  "webhook_url": "string"
}
```

</details>

**Responses:**

**200** — OK

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Created Product`
- `data` (object, optional)
  - `checkout_session_id` (integer, optional) — example: `123`
  - `payment_link` (string, optional) — example: `https://checkout.fanbasis.com/123`

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

---

### POST `/checkout-sessions/embedded`

**Description:** Create an embedded checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/embedded`

**Auth:** `x-api-key` header

**Request Body** (`application/json`):

- `metadata` (object, optional) — Arbitrary JSON object to store with the checkout session

<details>
<summary>Example Request Body</summary>

```json
{
  "metadata": {
    "key": "value",
    "custom_field": "custom_value"
  }
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Embedded checkout session created successfully`
- `data` (object, optional)
  - `id` (string, optional) — example: `123`
  - `checkout_session_secret` (string, optional) — example: `550e8400-e29b-41d4-a716-446655440000`
  - `metadata` (object, nullable, optional) — Arbitrary JSON object stored with the checkout session
  - `created_at` (string (date-time), optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to create embedded checkout session`
- `data` (array, optional)

---

### DELETE `/checkout-sessions/{checkoutSessionId}`

**Description:** Delete a checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session to delete

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Checkout session deleted successfully`
- `data` (array, optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session not found`
- `data` (array, optional)

---

### POST `/checkout-sessions/{checkoutSessionId}/extend-subscription`

**Description:** Extend a subscription for a specific user and product

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}/extend-subscription`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session (product)

**Request Body** (`application/json`):

- `user_id` (string, optional) — ID of the user whose subscription to extend
- `duration_days` (integer, optional) — min: 1; Number of days to extend the subscription

<details>
<summary>Example Request Body</summary>

```json
{
  "user_id": "string",
  "duration_days": 0
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Subscription extended successfully`
- `data` (object, optional)
  - `subscription_id` (string, optional)
  - `user_id` (string, optional)
  - `product_id` (string, optional)
  - `new_completion_date` (string (date-time), optional)
  - `extended_at` (string (date-time), optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session or active subscription not found`
- `data` (array, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to extend subscription`
- `data` (array, optional)

---

### GET `/checkout-sessions/{checkoutSessionId}`

**Description:** Get a checkout session by ID

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session to retrieve

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Checkout session retrieved successfully`
- `data` (object, optional)
  - `product` (object, optional)
    - `id` (string, optional)
    - `title` (string, optional)
    - `description` (string, nullable, optional)
  - `amount_cents` (integer, optional)
  - `type` (string, optional) — enum: ['subscription', 'onetime_reusable', 'onetime_non_reusable']
  - `metadata` (object, optional)
  - `expiration_date` (string, nullable (date), optional)
  - `subscription` (object, nullable, optional)
    - `frequency_days` (integer, optional)
    - `auto_expire_after_x_periods` (integer, nullable, optional)
    - `free_trial_days` (integer, nullable, optional)
    - `initial_fee` (number, nullable, optional)
    - `initial_fee_days` (integer, nullable, optional)
  - `success_url` (string (uri), optional)
  - `webhook_url` (string, nullable (uri), optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session not found`
- `data` (array, optional)

---

### GET `/checkout-sessions/{checkoutSessionId}/subscriptions`

**Description:** Get subscriptions for a specific checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}/subscriptions`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session to get subscriptions for

**Query Parameters:**

- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Subscriptions retrieved successfully`
- `data` (object, optional)
  - `subscriptions` (array, optional)
    Array items:
    - `id` (string, optional)
    - `first_name` (string, nullable, optional)
    - `last_name` (string, nullable, optional)
    - `email` (string, nullable, optional)
    - `phone` (string, nullable, optional)
    - `country_code` (string, nullable, optional)
    - `subscription_status` (string, optional)
    - `next_renewal_date` (string (date-time), optional)
    - `created_at` (string (date-time), optional)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session not found`
- `data` (array, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve subscriptions`
- `data` (array, optional)

---

### GET `/checkout-sessions/{checkoutSessionId}/transactions`

**Description:** Get transactions for a specific checkout session

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{checkoutSessionId}/transactions`

**Auth:** `x-api-key` header

**Path Parameters:**

- `checkoutSessionId` (string, required) — ID of the checkout session to get transactions for

**Query Parameters:**

- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Transactions retrieved successfully`
- `data` (object, optional)
  - `transactions` (array, optional)
    Array items:
    - `id` (string, optional)
    - `fan` (object, optional)
      - `id` (string, optional)
      - `name` (string, optional)
      - `email` (string, optional)
      - `phone` (string, optional)
      - `country_code` (string, optional)
    - `servicePayment` (object, optional)
      - `id` (string, optional)
      - `payment_type` (string, optional)
      - `fund_release_on` (string (date-time), optional)
      - `fund_released` (boolean, optional)
    - `subscriber` (object, optional)
    - `service` (object, optional)
      - `id` (string, optional)
      - `title` (string, optional)
      - `price` (number, optional)
    - `fee_amount` (number, optional) — The processing fee charged (in same currency as transaction)
    - `net_amount` (number, optional) — Amount after fees (transaction amount - fee)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized`
- `data` (array, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Checkout session not found`
- `data` (array, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve transactions`
- `data` (array, optional)

---

### GET `/checkout-sessions/{productId}/subscriptions`

**Description:** Get subscriptions for a specific product

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/{productId}/subscriptions`

**Auth:** `x-api-key` header

**Path Parameters:**

- `productId` (string, required) — ID of the product to get subscriptions for

**Query Parameters:**

- `product_id` (integer, optional) — Alternative way to specify the product ID
- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Subscriptions retrieved successfully`
- `data` (object, optional)
  - `subscriptions` (array, optional)
    Array items:
    - `id` (string, optional)
    - `first_name` (string, nullable, optional)
    - `last_name` (string, nullable, optional)
    - `email` (string, nullable, optional)
    - `phone` (string, nullable, optional)
    - `country_code` (string, nullable, optional)
    - `subscription_status` (string, optional)
    - `next_renewal_date` (string (date-time), optional)
    - `created_at` (string (date-time), optional)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve subscriptions`
- `data` (array, optional)

---

### GET `/checkout-sessions/transactions`

**Description:** Get all transactions for a creator with product filter

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/transactions`

**Auth:** `x-api-key` header

**Query Parameters:**

- `product_id` (['integer', 'string'], optional) — ID of the product to get transactions for
- `customer_id` (['integer', 'string'], optional) — ID of the customer to get transactions for
- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Transactions retrieved successfully`
- `data` (object, optional)
  - `transactions` (array, optional)
    Array items:
    - `id` (string, optional)
    - `fan` (object, optional)
      - `id` (string, optional)
      - `name` (string, optional)
      - `email` (string, optional)
      - `phone` (string, optional)
      - `country_code` (string, optional)
    - `servicePayment` (object, optional)
      - `id` (string, optional)
      - `payment_type` (string, optional)
      - `fund_release_on` (string (date-time), optional)
      - `fund_released` (boolean, optional)
    - `subscriber` (object, optional)
    - `service` (object, optional)
      - `id` (string, optional)
      - `title` (string, optional)
      - `price` (number, optional)
    - `fee_amount` (number, optional) — The processing fee charged (in same currency as transaction)
    - `net_amount` (number, optional) — Amount after fees (transaction amount - fee)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve transactions`
- `data` (array, optional)

---

### POST `/checkout-sessions/transactions/{transactionId}/refund`

**Description:** Refund a transaction

**Full URL:** `https://www.fanbasis.com/public-api/checkout-sessions/transactions/{transactionId}/refund`

**Auth:** `x-api-key` header

**Path Parameters:**

- `transactionId` (['string', 'integer'], required) — ID of the transaction to refund (can be hashid or payment_id)

**Request Body** (`application/json`):

- `amount_cents` (integer, optional) — min: 1; Amount in cents to refund

<details>
<summary>Example Request Body</summary>

```json
{
  "amount_cents": 0
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Transaction refunded successfully`
- `data` (object, optional)
  - `refund_id` (string, optional) — example: `re_1234567890`
  - `transaction_id` (string, optional) — example: `abc123`
  - `refund_amount` (number (float), optional) — example: `50`
  - `refund_amount_cents` (integer, optional) — example: `5000`
  - `refund_type` (string, optional) — enum: ['full', 'partial']; example: `partial`
  - `refund_cost` (number (float), optional) — example: `52.5`
  - `proportional_fee` (number (float), optional) — example: `2.5`
  - `creator_amount_deduction` (number (float), optional) — example: `50`
- `request_id` (string, optional) — example: `req_1234567890`

**400** — Validation Error or Refund Failed

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Refund amount exceeds remaining refundable amount`
- `data` (array, optional)
- `errors` (object, nullable, optional)
- `error` (string, nullable, optional)
- `request_id` (string, optional) — example: `req_1234567890`

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized - Transaction does not belong to this creator`
- `data` (array, optional)
- `request_id` (string, optional) — example: `req_1234567890`

**403** — Forbidden

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Your account is not approved by the FanBasis admin. Please contact support.`
- `data` (array, optional)
- `request_id` (string, optional) — example: `req_1234567890`

**404** — Transaction Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Transaction not found`
- `data` (array, optional)
- `request_id` (string, optional) — example: `req_1234567890`

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to refund transaction`
- `error` (string, optional) — example: `Internal server error`
- `data` (array, optional)
- `request_id` (string, optional) — example: `req_1234567890`

---

## Webhook Subscriptions

### POST `/webhook-subscriptions`

**Description:** Create a new webhook subscription

**Full URL:** `https://www.fanbasis.com/public-api/webhook-subscriptions`

**Auth:** `x-api-key` header

**Request Body** (`application/json`):

- `webhook_url` (string (uri), optional) — URL where webhook events will be sent
- `event_types` (array, optional) — Array of event types to subscribe to. Available event types: payment.succeeded, payment.failed, payment.expired, payment.canceled, product.purchased, subscription.created, subscription.renewed, subscription.completed, subscription.canceled

<details>
<summary>Example Request Body</summary>

```json
{
  "webhook_url": "string",
  "event_types": ["payment.succeeded"]
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Webhook subscription created successfully`
- `data` (object, optional)
  - `id` (string, optional)
  - `user_id` (string, optional)
  - `webhook_url` (string (uri), optional)
  - `event_types` (array, optional)
  - `secret_key` (string, optional)
  - `is_active` (boolean, optional)
  - `created_at` (string (date-time), optional)
  - `updated_at` (string (date-time), optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `User not found`
- `data` (array, optional)

---

### DELETE `/webhook-subscriptions/{webhookSubscriptionId}`

**Description:** Delete a webhook subscription

**Full URL:** `https://www.fanbasis.com/public-api/webhook-subscriptions/{webhookSubscriptionId}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `webhookSubscriptionId` (string, required) — ID of the webhook subscription to delete

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Webhook subscription deleted successfully`
- `data` (array, optional)
- `request_id` (string, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Webhook subscription not found`
- `data` (array, optional)

---

### GET `/webhook-subscriptions`

**Description:** Get all webhook subscriptions for the authenticated user

**Full URL:** `https://www.fanbasis.com/public-api/webhook-subscriptions`

**Auth:** `x-api-key` header

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Webhook subscriptions retrieved successfully`
- `data` (array, optional)
  Array items:
  - `id` (string, optional)
  - `webhook_url` (string (uri), optional)
  - `event_types` (array, optional)
  - `is_active` (boolean, optional)
  - `created_at` (string (date-time), optional)
  - `updated_at` (string (date-time), optional)

---

### POST `/webhook-subscriptions/{webhookSubscriptionId}/test`

**Description:** Test a webhook subscription by sending a test event

**Full URL:** `https://www.fanbasis.com/public-api/webhook-subscriptions/{webhookSubscriptionId}/test`

**Auth:** `x-api-key` header

**Path Parameters:**

- `webhookSubscriptionId` (string, required) — ID of the webhook subscription to test

**Request Body** (`application/json`):

- `event_type` (string, optional) — enum: ['payment.succeeded', 'payment.failed', 'payment.expired', 'payment.canceled', 'product.purchased', 'subscription.created', 'subscription.renewed', 'subscription.completed', 'subscription.canceled']; Type of event to test. Available: payment.succeeded, payment.failed, payment.expired, payment.canceled, product.purchased, subscription.created, subscription.renewed, subscription.completed, subscription.canceled

<details>
<summary>Example Request Body</summary>

```json
{
  "event_type": "payment.succeeded"
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Test event sent successfully`
- `data` (object, optional)
  - `event_sent` (boolean, optional)
  - `response_status` (integer, optional)
  - `response_body` (string, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**404** — Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Webhook subscription not found`
- `data` (array, optional)

---

## Customers

### POST `/customers/{customerId}/charge`

**Description:** Charge a customer using a specific payment method

**Full URL:** `https://www.fanbasis.com/public-api/customers/{customerId}/charge`

**Auth:** `x-api-key` header

**Path Parameters:**

- `customerId` (string, required) — ID of the customer to charge

**Request Body** (`application/json`):

- `payment_method_id` (string, optional)
- `service_id` (string, optional)
- `amount_cents` (integer, optional) — min: 1
- `description` (string, optional)
- `metadata` (object, optional)

<details>
<summary>Example Request Body</summary>

```json
{
  "payment_method_id": "string",
  "service_id": "string",
  "amount_cents": 0,
  "description": "string",
  "metadata": {}
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Customer charged successfully`
- `data` (object, optional)
  - `charge_id` (string, optional)
  - `amount` (number, optional)
  - `status` (string, optional)
  - `created_at` (string (date-time), optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**404** — Customer not found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Customer not found`
- `data` (array, optional)

---

### GET `/customers/{customerId}/payment-methods`

**Description:** Get saved payment methods for a customer

**Full URL:** `https://www.fanbasis.com/public-api/customers/{customerId}/payment-methods`

**Auth:** `x-api-key` header

**Path Parameters:**

- `customerId` (string, required) — ID of the customer

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Payment methods retrieved successfully`
- `data` (object, optional)
  - `customer` (object, optional)
    - `id` (string, optional)
    - `name` (string, optional)
    - `email` (string, optional)
  - `payment_methods` (array, optional)
    Array items:
    - `id` (string, optional)
    - `type` (string, optional)
    - `last4` (string, nullable, optional)
    - `brand` (string, nullable, optional)
    - `exp_month` (integer, nullable, optional)
    - `exp_year` (integer, nullable, optional)
    - `is_default` (boolean, nullable, optional)

**404** — Customer not found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Customer not found`
- `data` (array, optional)

---

### GET `/customers`

**Description:** Get unique customers for a creator

**Full URL:** `https://www.fanbasis.com/public-api/customers`

**Auth:** `x-api-key` header

**Query Parameters:**

- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100
- `search` (string, optional) — Search term to filter customers by email, name, or phone

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Customers retrieved successfully`
- `data` (object, optional)
  - `customers` (array, optional)
    Array items:
    - `id` (string, optional)
    - `name` (string, optional)
    - `email` (string, optional)
    - `phone` (string, nullable, optional)
    - `country_code` (string, nullable, optional)
    - `total_transactions` (integer, optional)
    - `total_spent` (number, optional)
    - `last_transaction_date` (string (date-time), optional)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

---

## Subscribers

### GET `/subscribers`

**Description:** Get all subscribers for a creator with optional filtering

**Full URL:** `https://www.fanbasis.com/public-api/subscribers`

**Auth:** `x-api-key` header

**Query Parameters:**

- `customer_id` (string, optional) — Filter by customer ID
- `product_id` (string, optional) — Filter by product ID
- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Subscribers retrieved successfully`
- `data` (object, optional)
  - `subscribers` (array, optional)
    Array items:
    - `id` (string, optional)
    - `customer` (object, optional)
      - `id` (string, optional)
      - `name` (string, optional)
      - `email` (string, optional)
      - `phone` (string, optional)
      - `country_code` (string, optional)
    - `product` (object, optional)
      - `id` (string, optional)
      - `title` (string, optional)
      - `description` (string, optional)
      - `price` (number, optional)
      - `payment_link` (string, optional)
    - `subscription` (object, optional)
      - `id` (string, optional)
      - `status` (string, optional)
      - `service_type` (string, optional)
      - `payment_frequency` (integer, optional)
      - `completion_date` (string (date-time), optional)
      - `cancelled_at` (string, nullable (date-time), optional)
      - `auto_renew_count` (integer, optional)
      - `charge_consent` (boolean, optional)
      - `created_at` (string (date-time), optional)
      - `updated_at` (string (date-time), optional)
  - `pagination` (object, optional)
    - `current_page` (integer, optional)
    - `total_pages` (integer, optional)
    - `per_page` (integer, optional)
    - `total_items` (integer, optional)
    - `has_more` (boolean, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve subscribers`
- `data` (array, optional)

---

## Discount Codes

### POST `/discount-codes`

**Description:** Create a new discount code

**Full URL:** `https://www.fanbasis.com/public-api/discount-codes`

**Auth:** `x-api-key` header

**Request Body** (`application/json`):

- `code` (string, required) — maxLength: 45
- `description` (string, nullable, optional)
- `discount_type` (string, required) — enum: ['cash', 'percentage']
- `value` (number, required)
- `duration` (string, required) — enum: ['once', 'forever', 'multiple_months']
- `expiry` (string, nullable (date), optional)
- `expiry_time` (string, nullable (H:i), optional)
- `limited_redemptions` (boolean, nullable, optional)
- `usable_number` (integer, nullable, optional)
- `no_of_months` (integer, nullable, optional)
- `one_time` (boolean, nullable, optional)
- `service_ids` (array, required)

<details>
<summary>Example Request Body</summary>

```json
{
  "code": "string",
  "description": "string",
  "discount_type": "cash",
  "value": 0,
  "duration": "once",
  "expiry": "2024-07-29",
  "expiry_time": "string",
  "limited_redemptions": true,
  "usable_number": 0,
  "no_of_months": 0,
  "one_time": true,
  "service_ids": [0]
}
```

</details>

**Responses:**

**201** — Created

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Discount code created successfully`
- `data` (object, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `errors` (object, optional)

---

### DELETE `/discount-codes/{id}`

**Description:** Delete a discount code

**Full URL:** `https://www.fanbasis.com/public-api/discount-codes/{id}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `id` (string, required) — ID of the discount code

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Discount code deleted successfully`
- `data` (array, optional)

**400** — Error

- `status` (string, optional) — example: `error`
- `message` (string, optional)

---

### GET `/discount-codes/{id}`

**Description:** Get a specific discount code

**Full URL:** `https://www.fanbasis.com/public-api/discount-codes/{id}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `id` (string, required) — ID of the discount code

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Discount code retrieved successfully`
- `data` (object, optional)

**400** — Error

- `status` (string, optional) — example: `error`
- `message` (string, optional)

---

### GET `/discount-codes`

**Description:** List discount codes with pagination and search

**Full URL:** `https://www.fanbasis.com/public-api/discount-codes`

**Auth:** `x-api-key` header

**Query Parameters:**

- `search` (string, optional) — Search term
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Discount codes retrieved successfully`
- `data` (object, optional)
  - `current_page` (integer, optional)
  - `data` (array, optional)
  - `total` (integer, optional)

**400** — Error

- `status` (string, optional) — example: `error`
- `message` (string, optional)

---

### PUT `/discount-codes/{id}`

**Description:** Update an existing discount code

**Full URL:** `https://www.fanbasis.com/public-api/discount-codes/{id}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `id` (string, required) — ID of the discount code

**Request Body** (`application/json`):

- `code` (string, required) — maxLength: 45
- `description` (string, nullable, optional)
- `discount_type` (string, required) — enum: ['cash', 'percentage']
- `value` (number, required)
- `duration` (string, required) — enum: ['once', 'forever', 'multiple_months']
- `expiry` (string, nullable (date), optional)
- `expiry_time` (string, nullable (H:i), optional)
- `limited_redemptions` (boolean, nullable, optional)
- `usable_number` (integer, nullable, optional)
- `no_of_months` (integer, nullable, optional)
- `one_time` (boolean, nullable, optional)
- `service_ids` (array, required)

<details>
<summary>Example Request Body</summary>

```json
{
  "code": "string",
  "description": "string",
  "discount_type": "cash",
  "value": 0,
  "duration": "once",
  "expiry": "2024-07-29",
  "expiry_time": "string",
  "limited_redemptions": true,
  "usable_number": 0,
  "no_of_months": 0,
  "one_time": true,
  "service_ids": [0]
}
```

</details>

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Discount code updated successfully`
- `data` (object, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `errors` (object, optional)

---

## Products

### GET `/products`

**Description:** List all products for a creator

**Full URL:** `https://www.fanbasis.com/public-api/products`

**Auth:** `x-api-key` header

**Query Parameters:**

- `page` (integer, optional) — Page number for pagination; min: 1
- `per_page` (integer, optional) — Number of items per page; min: 1; max: 100

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Products retrieved successfully`
- `data` (object, optional)
  - `current_page` (integer, optional)
  - `data` (array, optional)
    Array items:
    - `id` (string, optional)
    - `title` (string, optional)
    - `internal_name` (string, nullable, optional)
    - `description` (string, nullable, optional)
    - `price` (number, optional)
    - `payment_link` (string (uri), optional)
  - `first_page_url` (string (uri), optional)
  - `from` (integer, optional)
  - `last_page` (integer, optional)
  - `last_page_url` (string (uri), optional)
  - `next_page_url` (string, nullable (uri), optional)
  - `path` (string (uri), optional)
  - `per_page` (integer, optional)
  - `prev_page_url` (string, nullable (uri), optional)
  - `to` (integer, optional)
  - `total` (integer, optional)

**400** — Validation Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Validation failed`
- `data` (array, optional)
- `errors` (object, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve products`
- `data` (array, optional)

---

## Transactions

### GET `/transactions/{transactionId}`

**Description:** Get a single transaction by ID

**Full URL:** `https://www.fanbasis.com/public-api/transactions/{transactionId}`

**Auth:** `x-api-key` header

**Path Parameters:**

- `transactionId` (string, required) — ID of the transaction to retrieve (can be hashid or numeric)

**Responses:**

**200** — Success

- `status` (string, optional) — example: `success`
- `message` (string, optional) — example: `Transaction retrieved successfully`
- `data` (object, optional)
  - `id` (string, optional)
  - `transaction_date` (string (date-time), optional)
  - `fan` (object, optional)
    - `id` (string, optional)
    - `name` (string, optional)
    - `email` (string, optional)
    - `phone` (string, optional)
    - `country_code` (string, optional)
  - `servicePayment` (object, optional)
    - `id` (string, optional)
    - `payment_type` (string, optional)
    - `fund_release_on` (string (date-time), optional)
    - `fund_released` (boolean, optional)
  - `service` (object, optional)
    - `id` (string, optional)
    - `title` (string, optional)
    - `description` (string, optional)
    - `price` (number, optional)
    - `payment_link` (string, optional)
  - `product` (object, optional)
    - `id` (string, optional)
    - `title` (string, optional)
    - `description` (string, optional)
    - `price` (number, optional)
    - `payment_link` (string, optional)
  - `refunds` (array, optional)
    Array items:
    - `id` (string, optional)
    - `payment_id` (string, optional)
    - `amount` (number, optional)
    - `created_at` (string (date-time), optional)
  - `fee_amount` (number, optional) — The processing fee charged (in same currency as transaction)
  - `net_amount` (number, optional) — Amount after fees (transaction amount - fee)

**401** — Unauthorized

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Unauthorized - Transaction does not belong to this creator`
- `data` (array, optional)

**404** — Transaction Not Found

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Transaction not found`
- `data` (array, optional)

**500** — Server Error

- `status` (string, optional) — example: `error`
- `message` (string, optional) — example: `Failed to retrieve transaction`
- `data` (array, optional)

---
