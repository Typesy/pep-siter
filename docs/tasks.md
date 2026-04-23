# Build Tasks

## Phase 1 — Project Setup

- [x] Initialize Next.js app with TypeScript and Tailwind
- [x] Set up project folder structure (app, components, lib, etc.)
- [x] Install and configure Supabase client
- [x] Set up environment variables

---

## Phase 2 — Database Schema

- [ ] Create products table
- [ ] Create profiles table
- [ ] Create orders table
- [ ] Create order_items table
- [ ] Create addresses table
- [ ] Create payments table

- [ ] Set up relationships between tables
- [ ] Enable Row Level Security (RLS)
- [ ] Create basic RLS policies (users can only access their own data)

---

## Phase 3 — Auth

- [ ] Set up Supabase Auth
- [ ] Create signup flow
- [ ] Create login flow
- [ ] Create session handling
- [ ] Create user profile record on signup

---

## Phase 4 — Product System

- [ ] Create product listing page
- [ ] Create product card component
- [ ] Create product detail page
- [ ] Fetch products from database

---

## Phase 5 — Cart System

- [ ] Create cart state (local or global state)
- [ ] Add product to cart
- [ ] Remove product from cart
- [ ] Update product quantity
- [ ] Create cart page UI
- [ ] Display cart totals

---

## Phase 6 — Checkout Flow

- [ ] Create checkout page
- [ ] Collect shipping information
- [ ] Display order summary
- [ ] Create order record before payment

---

## Phase 7 — Payments (Authorize.net)

- [ ] Integrate Authorize.net Accept Hosted
- [ ] Redirect user to hosted payment page
- [ ] Handle return from payment flow
- [ ] Verify payment server-side
- [ ] Update payment record
- [ ] Update order status

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