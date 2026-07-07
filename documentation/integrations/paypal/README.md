# PayPal integration (legacy OAuth)

Log in with PayPal: users connect from Settings → Integrations; tokens are stored in `user_integrations`. Agents call legacy routes via `integration_capabilities` (`search_transactions`, `get_transaction`, `get_balance`).

## Environment variables (`apps/api/.env` and production host)

| Variable               | Description                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `PAYPAL_CLIENT_ID`     | PayPal app Client ID (Dashboard → Apps & Credentials)                                           |
| `PAYPAL_CLIENT_SECRET` | PayPal app secret                                                                               |
| `PAYPAL_REDIRECT_URI`  | Must match Return URL in PayPal app, e.g. `https://<api-host>/api/integrations/paypal/callback` |
| `PAYPAL_STATE_SECRET`  | Random secret for HMAC signing OAuth `state` (e.g. `openssl rand -hex 32`)                      |
| `PAYPAL_SANDBOX`       | `true` for sandbox API/UI; `false` for live                                                     |

Also required (existing): `APP_URL` (allowed OAuth return origin), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Database

Catalog row: `integrations_available.id = 'paypal'` (see `supabase/migrations/20260322130000_paypal_integration.sql`).

After deploy, run capabilities sync: `pnpm --filter @vibey/api sync:capabilities -- --only paypal`
