# Product
Research-products ecommerce MVP.

# Goal
Build a simple ecommerce website where users can browse research products, add them to a cart, and place orders through a hosted payment flow.

# Primary Business Objective
Launch a working store that can reliably accept orders and payments with the minimum amount of complexity needed for MVP.

# Users

## Guest Users
Guest users can:
- Browse the product catalog
- View individual product pages
- Add products to cart
- Checkout without creating an account
- Enter shipping and payment information
- Receive order confirmation email

## Registered Users
Registered users can:
- Do everything guest users can do
- Log in to their account
- View past orders

## Admin Users
Admin users can:
- Log in to an internal admin dashboard
- Create products
- Edit products
- View all orders
- Update order status

# Core MVP Features

## 1. Product Catalog
The storefront must include:
- A homepage or shop page listing products
- Product cards with name, price, and image
- Individual product detail pages

## 2. Cart
Users must be able to:
- Add products to cart
- Change quantity
- Remove products
- View cart totals

## 3. Checkout
The checkout flow must support:
- Guest checkout
- Shipping address collection
- Order summary review
- Redirect or embedded hosted payment flow through Authorize.net Accept Hosted

## 4. Payments
Payments must:
- Use Authorize.net Accept Hosted
- Avoid collecting raw card data directly in the app
- Create a payment record tied to the order
- Be verified server-side before the order is marked complete

## 5. Accounts
The app must support:
- User signup
- User login
- Viewing order history for logged-in users

Accounts are optional for purchase. Users are allowed to check out as guests.

## 6. Admin Panel
The app must include a minimal internal admin panel where admins can:
- Create and edit products
- View all orders
- Update order status manually

## 7. Email
The system must send basic transactional emails for:
- Account-related actions
- Order confirmation

# Business Rules

- Products are simple products only
- No product variants in MVP
- Free shipping on all orders
- No inventory tracking in MVP
- No discount or coupon system in MVP
- Bulk orders are handled manually through email
- Orders must still work for guests who do not create accounts

# Payment Rules

- Payment status must be stored separately from order status
- A successful payment response must not automatically skip server-side verification
- Failed, cancelled, and pending payment states must be handled cleanly

# Research-Use Positioning

The storefront must present products as research-use only.

The site must not:
- Make medical claims
- Mention treatment outcomes
- Give dosage advice
- Present products as intended for human consumption

# MVP Non-Goals

The MVP should NOT include:
- Product variants
- Subscription billing
- Inventory tracking
- Advanced shipping logic
- Customer reviews
- Loyalty systems
- Coupon systems
- Bulk-order automation
- Advanced analytics dashboards

# Suggested Initial Page List

## Customer-Facing Pages
- Home page
- Shop / product listing page
- Product detail page
- Cart page
- Checkout page
- Login page
- Signup page
- Account page
- Orders page
- Order confirmation page

## Admin Pages
- Admin login page
- Admin dashboard
- Admin products page
- Admin orders page

# Success Criteria for MVP

The MVP is successful when:
- An admin can create a product
- A customer can view that product on the storefront
- A customer can add it to cart
- A customer can complete guest checkout
- Payment is processed through Authorize.net hosted flow
- The order is stored correctly in the database
- Confirmation email is sent
- Admin can view the order and update its status