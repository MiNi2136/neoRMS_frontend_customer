# neoRMS Frontend Customer Service

## Purpose
This service is the customer-facing web application for neoRMS. It provides the UI and client-side flows for discovering restaurants, browsing menus, placing orders, reserving tables, making payments, and viewing order history.

## Responsibilities
- Render the customer experience for restaurant discovery and restaurant-specific menu browsing.
- Manage client-side authentication state (sign in/sign up/session restore/logout).
- Manage cart, order, reservation, and restaurant state via React context providers.
- Call backend APIs for auth, restaurants, menu, orders, reservations, reviews, and payments.
- Handle payment provider redirect callbacks (`/payment/success`, `/payment/fail`, `/payment/cancel`).

## Tech Stack
- React 19
- React Router DOM 7
- Vite 7
- Tailwind CSS 4
- Axios
- ESLint

## Project Structure
- `src/pages/` — route-level pages (menu, cart, checkout, reservation, tracking, auth, payment status).
- `src/components/` — reusable UI and feature components (auth, menu, restaurant, common).
- `src/context/` — global state providers (`AuthContext`, `CartContext`, `OrderContext`, `ReservationContext`, `RestaurantContext`).
- `src/services/` — API client and domain service modules (`authService`, `restaurantService`, `orderService`, `paymentService`, `tableService`, `reviewService`).
- `src/routes/` — app routing and protected/public route wiring.
- `src/layouts/` — layout shell(s) for routed pages.
- `src/theme/` — shared theme tokens.

## Setup / Installation
### Prerequisites
- Node.js (LTS recommended)
- npm

### Install dependencies
```bash
npm install
```

## Configuration
Create a `.env` file in the repository root:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Environment Variables
- `VITE_API_BASE_URL` (required): Base URL for backend API requests, including `/api` prefix.

Notes:
- If not set, the app defaults to `http://localhost:5000/api`.
- During local development, Vite is configured to proxy `/api` requests to `http://localhost:5000`.

## Running the Service
### Development
```bash
npm run dev
```
- Starts Vite dev server on port `3000`.
- Opens browser automatically.

### Lint
```bash
npm run lint
```

### Preview production build
```bash
npm run preview
```

## API / Interfaces
This service consumes backend HTTP APIs via `src/services/` modules using a shared Axios client.

### Auth & Session
- `POST /auth/login/customer`
- `POST /user/signup`
- `GET /user/me`

### Restaurant & Menu
- `GET /restaurant`
- `GET /restaurant/:id`
- `GET /menuProduct/:restaurantId`
- `POST /menuProduct/recommendation`

### Orders, Coupons, Reviews
- `POST /order`
- `GET /order/:orderId`
- `GET /order/customer-orders`
- `POST /coupon/validate`
- `POST /review`
- `GET /review/my/order/:orderId`
- `GET /review/my/menu-product/:menuProductId`

### Tables & Payments
- `GET /table/:restaurantId`
- `POST /table/reserve/:tableId`
- `POST /payment/init`

### Request Headers
When present in local storage, this frontend automatically attaches:
- `Authorization: Bearer <accessToken>`
- `x-tenant-id: <tenantId>`

## Related Services
- neoRMS backend API service (expected at `http://localhost:5000` in local dev), which provides auth, restaurant, menu, order, table, review, and payment endpoints.
- External payment gateway/provider, which redirects the user back to this frontend’s payment status routes.
