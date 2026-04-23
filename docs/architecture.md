# Architecture

This project is a full-stack ecommerce MVP for research products.

Core stack:
- Next.js (App Router)
- TypeScript
- TailwindCSS
- Supabase Auth
- Supabase Postgres
- Authorize.net Accept Hosted
- Transactional email service

The system must support:
- Guest checkout
- Optional user accounts
- Product browsing
- Cart and checkout
- Hosted payment flow
- Internal admin panel
- Order persistence
- Basic email notifications

---

## 1. High-Level System Structure

The app has 4 major parts:

1. Customer storefront
2. Checkout and payment flow
3. Account and order history
4. Internal admin panel

Data is stored in Supabase.
Authentication is handled by Supabase Auth.
Payments are handled through Authorize.net Accept Hosted.
Sensitive verification logic must run server-side.

---

## 2. Route Structure

## Customer-Facing Routes

- `/`
  - Homepage or storefront landing page

- `/shop`
  - Product listing page

- `/products/[slug]`
  - Individual product detail page

- `/cart`
  - Cart page

- `/checkout`
  - Checkout page for guest or logged-in users

- `/checkout/success`
  - Order success / confirmation page after verified payment

- `/checkout/cancel`
  - Payment cancelled page

- `/login`
  - User login page

- `/signup`
  - User signup page

- `/account`
  - User account overview page

- `/account/orders`
  - Logged-in user order history

- `/account/orders/[id]`
  - Logged-in user order detail page

## Admin Routes

- `/admin`
  - Admin dashboard

- `/admin/products`
  - Product management page

- `/admin/products/new`
  - Create product page

- `/admin/products/[id]`
  - Edit product page

- `/admin/orders`
  - Order management page

- `/admin/orders/[id]`
  - Order detail / status update page

---

## 3. App Layers

## UI Layer
Responsible for:
- pages
- components
- forms
- cart UI
- admin tables
- order summary views

## Data Access Layer
Responsible for:
- reading/writing Supabase data
- creating orders
- fetching products
- fetching user order history
- updating admin-managed records

Recommended location:
- `lib/`
- `lib/supabase/`
- `lib/services/`

## Payment Layer
Responsible for:
- creating Authorize.net hosted payment session/request
- returning hosted payment URL or token
- handling payment return flow
- verifying transaction result server-side
- updating `payments` and `orders`

Recommended location:
- `lib/payments/`

## Email Layer
Responsible for:
- sending order confirmation
- sending account-related emails

Recommended location:
- `lib/email/`

---

## 4. Customer Storefront Flow

### Product Browsing Flow
1. User visits `/` or `/shop`
2. App fetches active products from Supabase
3. User opens `/products/[slug]`
4. Product detail page displays name, description, image, and price
5. User adds product to cart

### Cart Flow
1. User adds products to cart
2. Cart is stored in client-side state for MVP
3. User can change quantity or remove items
4. `/cart` shows subtotal and total
5. User proceeds to `/checkout`

---

## 5. Checkout Flow

### Checkout Input
The checkout page must collect:
- contact email
- shipping name
- shipping address
- optional phone number
- cart contents review

For logged-in users:
- user identity may be attached to the order

For guests:
- checkout must still work without account creation

### Order Creation Before Payment
Before redirecting to payment:
1. App validates cart and shipping data
2. Server creates an `orders` record with status `pending`
3. Server creates related `order_items`
4. Server creates related `addresses`
5. Server creates a `payments` record with status `pending`

This creates a durable order before payment begins.

---

## 6. Payment Flow

### MVP Payment Method
Use Authorize.net Accept Hosted.

### Payment Sequence
1. User submits checkout form
2. Server creates order + payment records
3. Server requests hosted payment session/token from Authorize.net
4. User is redirected to or shown the hosted payment page
5. User completes or cancels payment
6. App receives return from payment flow
7. Server verifies payment result
8. `payments.status` is updated
9. `orders.status` is updated accordingly
10. User lands on success or cancel page

### Payment Rules
- Raw card data must never pass through the app
- Payment verification must happen server-side
- Payment success must not rely only on client redirect
- `payments` and `orders` must be updated separately

---

## 7. Account Flow

### Signup/Login
- Supabase Auth handles signup and login
- A `profiles` record is created for registered users
- Logged-in users can access `/account`

### Order History
- Logged-in users can view their own orders
- Order history is fetched from Supabase with ownership protection
- Guest orders are not automatically shown in account history unless explicitly linked later

---

## 8. Admin Flow

### Admin Authentication
Admin access is based on:
- authenticated user
- `profiles.is_admin = true`

Non-admin users must not access admin routes.

### Admin Product Management
Admins can:
- create products
- edit products
- mark products active/inactive

### Admin Order Management
Admins can:
- view all orders
- view order details
- update order status manually

Admin tools are internal pages inside the app.
Do not rely on direct database editing as the main workflow.

---

## 9. Data Access Patterns

### Public Reads
Public users can read:
- active products

### Authenticated User Reads
Logged-in users can read:
- their own profile
- their own orders
- their own order items
- their own addresses
- their own payment records where appropriate

### Admin Reads/Writes
Admins can:
- manage products
- view all orders
- update order status

### Server-Side Sensitive Operations
The following must happen server-side:
- order creation
- payment session creation
- payment verification
- admin authorization checks
- email sending

---

## 10. State Management Direction

### Cart State
For MVP, cart state can be client-side.

Recommended approach:
- React context or a small client store
- persisted locally if desired

### Auth State
Handled through Supabase session logic.

### Order and Payment State
Must be stored in database, not client state.

---

## 11. Email Flow

### Order Confirmation Email
Send after verified successful payment.

Email should include:
- order number or id
- purchased items summary
- total amount
- shipping name/address summary

### Account Emails
Basic account-related email support is required through the auth/email setup.

---

## 12. Suggested Code Organization

```text
app/
  (storefront)/
  admin/
  account/
  checkout/

components/
  products/
  cart/
  checkout/
  admin/
  ui/

lib/
  supabase/
  services/
  payments/
  email/
  utils/