# Database Schema

This project uses Supabase Postgres.

The MVP data model must support:
- Guest checkout
- Registered user accounts
- Simple products
- Orders
- Payments
- Shipping addresses
- Internal admin management

---

## 1. profiles

Purpose:
Stores account profile information for registered users.

Columns:
- id (uuid, primary key, references auth.users.id)
- email (text, unique)
- full_name (text, nullable)
- is_admin (boolean, default false)
- created_at (timestamp)
- updated_at (timestamp)

Rules:
- A profile exists for registered users
- Guest users do not need a profile
- Admin access is determined through is_admin

---

## 2. products

Purpose:
Stores storefront product data.

Columns:
- id (uuid, primary key)
- name (text)
- slug (text, unique)
- description (text)
- price_cents (integer)
- image_url (text, nullable)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)

Rules:
- Products are simple products only
- No variants in MVP
- Inactive products should not appear on the storefront
- Prices are stored in cents to avoid float issues

---

## 3. orders

Purpose:
Stores top-level order records.

Columns:
- id (uuid, primary key)
- user_id (uuid, nullable, references profiles.id)
- guest_email (text, nullable)
- status (text)
- subtotal_cents (integer)
- shipping_cents (integer)
- total_cents (integer)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

Rules:
- Orders can belong to a logged-in user or a guest
- If user_id is null, guest_email must be present
- status should track order lifecycle separately from payment status

Suggested order status values:
- pending
- paid
- processing
- shipped
- completed
- cancelled

---

## 4. order_items

Purpose:
Stores the individual products inside each order.

Columns:
- id (uuid, primary key)
- order_id (uuid, references orders.id)
- product_id (uuid, references products.id)
- product_name (text)
- unit_price_cents (integer)
- quantity (integer)
- line_total_cents (integer)
- created_at (timestamp)

Rules:
- Product name and unit price should be copied at time of purchase
- This preserves order history even if product info changes later
- line_total_cents should equal unit_price_cents × quantity

---

## 5. addresses

Purpose:
Stores shipping address information for an order.

Columns:
- id (uuid, primary key)
- order_id (uuid, unique, references orders.id)
- full_name (text)
- email (text)
- phone (text, nullable)
- line1 (text)
- line2 (text, nullable)
- city (text)
- state (text)
- postal_code (text)
- country (text)
- created_at (timestamp)
- updated_at (timestamp)

Rules:
- Each order should have one shipping address
- Address is stored separately from profiles so guest checkout works cleanly
- Email is stored here for fulfillment/contact consistency

---

## 6. payments

Purpose:
Stores payment records and gateway results.

using payment cloud and authorize.net

Columns:
- id (uuid, primary key)
- order_id (uuid, unique, references orders.id)
- provider (text)
- provider_transaction_id (text, nullable)
- status (text)
- amount_cents (integer)
- raw_response (jsonb, nullable)
- created_at (timestamp)
- updated_at (timestamp)

Rules:
- Use one payment record per order for MVP
- provider should initially be authorize_net
- Payment status must be separate from order status
- raw_response may store gateway metadata for debugging and reconciliation

Suggested payment status values:
- pending
- authorized
- paid
- failed
- cancelled
- refunded

---

## Data Relationships

- profiles.id -> orders.user_id
- orders.id -> order_items.order_id
- products.id -> order_items.product_id
- orders.id -> addresses.order_id
- orders.id -> payments.order_id

---

## Guest Checkout Rules

Guest checkout must work without a user account.

For guest orders:
- user_id is null
- guest_email is required
- address record is still required
- payment record is still required

For logged-in orders:
- user_id is set
- guest_email may be null
- address record is still required
- payment record is still required

---

## Admin Rules

Admins must be able to:
- create products
- edit products
- view all orders
- update order status

Admin capability should be based on:
- profiles.is_admin = true

---

## Security / RLS Direction

RLS must be enabled on customer-facing tables.

Basic direction:
- Users can view their own profile
- Users can view their own orders
- Users can view order items for their own orders
- Users can view addresses for their own orders
- Users can view payments for their own orders
- Admins can view and manage all records through elevated logic or admin-safe policies

Note:
Guest orders cannot rely on normal authenticated ownership checks in the same way as registered users.
Guest order access should be handled carefully at the application layer for MVP.

---

## MVP Notes

This schema intentionally does NOT include:
- product variants
- inventory tracking
- coupons
- subscriptions
- reviews
- saved customer addresses
- advanced shipping logic

These can be added later only if needed.