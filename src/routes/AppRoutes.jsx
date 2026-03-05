/* ─────────────────────────────────────────────────────────────────
   AppRoutes

   All context providers that require React Router hooks (useNavigate,
   useLocation) are mounted INSIDE <BrowserRouter> so the router
   context is available to them.  Plain state providers (Order,
   Reservation) are also nested here for a single source of truth.

   Route groups:
   ┌──────────────────────────────────────────────────────────┐
   │ Public  — no auth required                               │
   │   / | /menu | /daily-menu | /qr-scan                    │
   │   /customize/:itemId | /reservations                    │
   │   /sign-in | /sign-up                                   │
   │   /restaurants           ← Restaurant explorer          │
   │   /restaurant/:id        ← Branded restaurant home      │
   │   /restaurant/:id/menu   ← Restaurant-scoped menu       │
   ├──────────────────────────────────────────────────────────┤
   │ Protected — login required                               │
   │   /cart | /order-review | /payment                      │
   │   /order-tracking | /order  | /reorder                  │
   │   /pre-order | /deposit-payment                         │
   │   /reservation-details | /notifications                 │
   └──────────────────────────────────────────────────────────┘
   ───────────────────────────────────────────────────────────────── */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* Providers */
import { AuthProvider }         from '../context/AuthContext';
import { CartProvider }         from '../context/CartContext';
import { OrderProvider }        from '../context/OrderContext';
import { ReservationProvider }  from '../context/ReservationContext';
import { RestaurantProvider }   from '../context/RestaurantContext';

/* Layout */
import CustomerLayout from '../layouts/CustomerLayout';

/* Auth */
import ProtectedRoute from '../components/auth/ProtectedRoute';
import SignInPage     from '../pages/SignInPage';
import SignUpPage     from '../pages/SignUpPage';

/* Restaurant explorer */
import RestaurantsPage        from '../pages/RestaurantsPage';
import RestaurantHomePage     from '../pages/RestaurantHomePage';
import RestaurantMenuPage     from '../pages/RestaurantMenuPage';
import AboutRestaurantPage    from '../pages/AboutRestaurantPage';
import RestaurantBoundary     from '../components/restaurant/RestaurantBoundary';

/* Pages */
import QRScanPage             from '../pages/QRScanPage';
import DigitalMenuPage        from '../pages/DigitalMenuPage';
import ItemCustomizationPage  from '../pages/ItemCustomizationPage';
import CartPage               from '../pages/CartPage';
import OrderReviewPage        from '../pages/OrderReviewPage';
import PaymentPage            from '../pages/PaymentPage';
import OrderTrackingPage      from '../pages/OrderTrackingPage';
import TableReservationPage   from '../pages/TableReservationPage';
import PreOrderPage           from '../pages/PreOrderPage';
import DepositPaymentPage     from '../pages/DepositPaymentPage';
import ReservationDetailsPage from '../pages/ReservationDetailsPage';
import OrderHistoryPage       from '../pages/OrderHistoryPage';
import ReorderPage            from '../pages/ReorderPage';
import NotificationsPage      from '../pages/NotificationsPage';
import OrderConfirmationPage  from '../pages/OrderConfirmationPage';
import PaymentSuccessPage     from '../pages/paymentStatus/PaymentSuccessPage';
import PaymentFailPage        from '../pages/paymentStatus/PaymentFailPage';
import PaymentCancelPage      from '../pages/paymentStatus/PaymentCancelPage';

const AppRoutes = () => (
  <BrowserRouter>
    {/*
      AuthProvider + CartProvider must be inside BrowserRouter
      because they use useNavigate / useLocation internally.
      RestaurantProvider is nested inside so all pages can
      access the currently-selected restaurant.
    */}
    <AuthProvider>
      <CartProvider>
        <RestaurantProvider>
          <OrderProvider>
            <ReservationProvider>
              <Routes>

                {/* ── Stand-alone pages (no layout shell) ── */}
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />

                {/* ── Customer layout shell ── */}
                <Route element={<CustomerLayout />}>

                  {/* ── Public routes ── */}
                  <Route path="/"                  element={<Navigate to="/restaurants" replace />} />
                  <Route path="/qr-scan"           element={<QRScanPage />} />
                  <Route path="/menu"              element={<DigitalMenuPage />} />
                  <Route path="/daily-menu"        element={<DigitalMenuPage />} />
                  <Route path="/customize/:itemId" element={<ItemCustomizationPage />} />
                  <Route path="/reservations"      element={<TableReservationPage />} />

                  {/* ── Restaurant explorer ── */}
                  <Route path="/restaurants" element={<RestaurantsPage />} />

                  {/* ── Payment gateway callbacks (public — gateway redirects here after payment) ── */}
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/payment/fail"    element={<PaymentFailPage />} />
                  <Route path="/payment/cancel"  element={<PaymentCancelPage />} />

                  {/* ── Restaurant-specific experience ──────────────────────
                        RestaurantBoundary fetches the restaurant by :restaurantId,
                        stores it in RestaurantContext and renders child pages.
                        All children can call useRestaurant() to get the data.
                    ──────────────────────────────────────────────────────── */}
                  <Route
                    path="/restaurant/:restaurantId"
                    element={<RestaurantBoundary />}
                  >
                    {/* Branded home page */}
                    <Route index element={<RestaurantHomePage />} />

                    {/* About Us — restaurant story, location, contact */}
                    <Route path="about" element={<AboutRestaurantPage />} />

                    {/* Restaurant-scoped menu — fetches ONLY when this route is active */}
                    <Route path="menu"              element={<RestaurantMenuPage />} />
                    <Route path="customize/:itemId" element={<ItemCustomizationPage />} />

                    {/* Restaurant-scoped cart — same CartPage, scoped by CartContext.cartRestaurantId */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="cart" element={<CartPage />} />
                    </Route>
                  </Route>

                  {/* ── Protected routes — login required ── */}
                  <Route element={<ProtectedRoute />}>
                    {/* Cart & Checkout */}
                    <Route path="/cart"                 element={<CartPage />} />
                    <Route path="/order-review"         element={<OrderReviewPage />} />
                    <Route path="/order-confirmation"   element={<OrderConfirmationPage />} />
                    <Route path="/payment"              element={<PaymentPage />} />
                    <Route path="/order-tracking"       element={<OrderTrackingPage />} />

                    {/* Reservations (post-selection flow) */}
                    <Route path="/pre-order"           element={<PreOrderPage />} />
                    <Route path="/deposit-payment"     element={<DepositPaymentPage />} />
                    <Route path="/reservation-details" element={<ReservationDetailsPage />} />

                    {/* Orders */}
                    <Route path="/order"  element={<OrderHistoryPage />} />
                    <Route path="/reorder" element={<ReorderPage />} />

                    {/* Notifications */}
                    <Route path="/notifications" element={<NotificationsPage />} />
                  </Route>

                </Route>

              </Routes>
            </ReservationProvider>
          </OrderProvider>
        </RestaurantProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default AppRoutes;
