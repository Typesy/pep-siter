# Build Tasks

## Phase 1 — Project Setup

- [x] Initialize Next.js app with TypeScript and Tailwind
- [x] Set up project folder structure (app, components, lib, etc.)
- [x] Install and configure Supabase client
- [x] Set up environment variables

---

## Phase 2 — Database Schema

- [x] Create products table
- [x] Create profiles table
- [x] Create orders table
- [x] Create order_items table
- [x] Create addresses table
- [x] Create payments table

- [x] Set up relationships between tables
- [x] Enable Row Level Security (RLS)
- [x] Create basic RLS policies (users can only access their own data)

---

## Phase 3 — Auth

- [x] Set up Supabase Auth
- [x] Create signup flow
- [x] Create login flow
- [x] Create session handling
- [x] Create user profile record on signup

---

## Phase 4 — Product System

- [x] Create product listing page
- [x] Create product card component
- [x] Create product detail page
- [x] Fetch products from database

---

## Phase 5 — Cart System

- [x] Create cart state (local or global state)
- [x] Add product to cart
- [x] Remove product from cart
- [x] Update product quantity
- [x] Create cart page UI
- [x] Display cart totals

---

## Phase 6 — Checkout Flow

- [x] Create checkout page
- [x] Collect shipping information
- [x] Display order summary
- [x] Create order record before payment

---

## Phase 7 — Payments (Authorize.net)

- [x] Integrate Authorize.net Accept Hosted
- [x] Redirect user to hosted payment page
- [x] Handle return from payment flow
- [x] Verify payment server-side
- [x] Update payment record
- [x] Update order status

---

## Phase 8 — Orders

- [ ] Save order data in database
- [ ] Link order to user (if logged in) or guest email
- [ ] Create order confirmation page

---

## Phase 9 — Admin Panel

- [ ] Create admin login protection
- [ ] Create admin dashboard
- [ ] Create product management page
- [ ] Create order management page
- [ ] Allow updating order status

---

## Phase 10 — Email

- [ ] Set up email service
- [ ] Send order confirmation email
- [ ] Send account-related emails

---

## Phase 11 — Testing

- [ ] Test full checkout flow
- [ ] Test guest checkout
- [ ] Test logged-in checkout
- [ ] Test admin product creation
- [ ] Test admin order updates

---

## Phase 12 — Cleanup

- [ ] Fix UI inconsistencies
- [ ] Remove unused code
- [ ] Ensure environment variables are secure
- [ ] Prepare for deployment