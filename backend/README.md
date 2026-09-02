# backend/

BoliBazzar API — currently served by the same Next.js instance in root `app/api/[[...path]]/route.js`.

All endpoints:

### Auth & profile
- `POST /api/auth/session`
- `GET /api/me/:email` (returns loyalty tier)
- `POST /api/admin/verify` (admin allowlist check)

### Buyer flow
- `POST /api/extract` (AI — multilingual)
- `POST /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests/:id/simulate` (kicks off supplier bidding)
- `POST /api/requests/:id/tick` (bidding countdown price drops)
- `GET /api/requests/:id/group-suggestion`

### Supplier flow
- `POST /api/suppliers`
- `GET /api/suppliers`
- `POST /api/supplier/rules` (auto-bid)
- `GET /api/supplier/rules/:email`
- `POST /api/supplier/rules/id/:id/toggle`
- `DELETE /api/supplier/rules/id/:id`
- `GET /api/analytics/supplier/:email`

### Store & offers
- `GET /api/store/:slug` (public storefront)
- `POST /api/requests/:id/offers` (manual supplier quote)
- `POST /api/offers/:id/accept`

### Chat
- `POST /api/messages`
- `GET /api/messages/:offer_id`
- `POST /api/messages/:offer_id/read`

### Payments (Razorpay)
- `POST /api/payments/order`
- `POST /api/payments/verify`

### Wallet & reviews
- `GET /api/wallet/:email`
- `POST /api/reviews`
- `GET /api/reviews/offer/:offer_id`

### Groups
- `POST /api/groups`
- `POST /api/groups/:id/join`

### Delivery
- `GET /api/delivery/:offer_id`

### Notifications
- `POST /api/push/register`
- `POST /api/push/notify`
- `GET /api/whatsapp/log`

## Data collections

- users, requests, offers, suppliers, supplier_rules, messages,
  reviews, payments, wallets, groups, whatsapp_log, push_tokens
