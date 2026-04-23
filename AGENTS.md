# Project Overview
Research-products ecommerce MVP.

# Core Stack
Next.js, TypeScript, Tailwind, Supabase Auth/DB, Authorize.net Accept Hosted.

# Primary Features
Guest checkout, user accounts, products, cart, checkout, internal admin, email.

# Non-Goals for MVP
No subscriptions, no inventory tracking, no bulk automation, no advanced shipping logic.

# Safety Boundaries
No medical claims. Research-use framing only. No dosage/treatment language.

# Build Priorities
1. Product catalog
2. Cart
3. Guest checkout
4. Payment flow
5. Order persistence
6. Admin panel
7. Email flows

# Project Overview

This is a research-products ecommerce MVP.

The goal is to allow users to browse products and place orders through a simple checkout flow.

# Core Stack

* Next.js (App Router)
* TypeScript
* TailwindCSS
* Supabase (Auth + Database)
* Authorize.net (Accept Hosted for payments)

# Primary Features

* Product catalog
* Product detail pages
* Cart system
* Guest checkout
* Optional user accounts
* Order creation and storage
* Payment flow via Authorize.net hosted page
* Internal admin dashboard (products + orders)
* Transactional email (account + order confirmation)

# User Types

* Guest users (can browse and checkout)
* Registered users (can view order history)
* Admin users (manage products and orders)

# MVP Constraints

* Simple products only (no variants)
* Free shipping model
* No inventory tracking
* No subscriptions
* No discount system
* Bulk orders handled via email (no automation)

# Payment Direction

Use Authorize.net Accept Hosted.

* Do NOT collect raw card data directly
* Redirect or embed hosted payment form
* Verify payment server-side before marking order complete

# Data Model Direction

Core tables should include:

* profiles
* products
* orders
* order_items
* addresses
* payments

Guest checkout must still create valid order records.

# Admin Panel

A minimal internal admin panel must exist to:

* Create/edit products
* View orders
* Update order status

Do NOT rely on raw database editing.

# Email

Basic transactional email is required:

* Account creation
* Order confirmation

# Safety Constraints

Products must be presented as research-use only.

DO NOT:

* Make medical claims
* Suggest treatments
* Provide dosage information
* Present products as for human consumption

# Build Priorities

1. Database schema
2. Auth setup
3. Product catalog
4. Cart system
5. Checkout flow
6. Payment integration
7. Order persistence
8. Admin panel
9. Email system
