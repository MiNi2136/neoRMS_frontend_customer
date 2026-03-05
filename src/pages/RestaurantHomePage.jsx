/* ─────────────────────────────────────────────────────────────────
   RestaurantHomePage  —  /restaurant/:restaurantId

   The branded landing page for a specific restaurant.
   All text, images and links are dynamically sourced from the
   restaurant object stored in RestaurantContext.
   ───────────────────────────────────────────────────────────────── */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  UtensilsCrossed, CalendarDays, ClipboardList, BookOpen,
} from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import BannerCarousel from '../components/restaurant/BannerCarousel';

/* ── Theme ── */
const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  muted:        '#6B7280',
  border:       '#E5E7EB',
  cardBg:       '#FFFFFF',
  shadow:       '0 2px 14px rgba(31,41,55,0.07)',
  shadowHover:  '0 6px 28px rgba(31,41,55,0.12)',
};

/* ── Quick-action card ── */
const QuickCard = ({ to, icon, label, desc }) => (
  <Link
    to={to}
    style={{
      display:        'flex', flexDirection: 'column', alignItems: 'center',
      textAlign:      'center', borderRadius: 16, padding: '28px 20px',
      background:     C.cardBg, border: `1.5px solid ${C.border}`,
      textDecoration: 'none',
      transition:     'all 0.22s',
      boxShadow:      C.shadow,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow   = C.shadowHover;
      e.currentTarget.style.borderColor = C.primary;
      e.currentTarget.style.transform   = 'translateY(-3px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow   = C.shadow;
      e.currentTarget.style.borderColor = C.border;
      e.currentTarget.style.transform   = 'translateY(0)';
    }}
  >
    <div style={{
      width: 58, height: 58, borderRadius: 14,
      background: 'rgba(230,57,70,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.primary, marginBottom: 14,
    }}>
      {icon}
    </div>
    <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{label}</span>
    <span style={{ fontSize: 12, color: C.muted }}>{desc}</span>
  </Link>
);

/* ── Main component ── */
const RestaurantHomePage = () => {
  const { restaurantId }     = useParams();
  const { currentRestaurant } = useRestaurant();

  if (!currentRestaurant) return null; // RestaurantBoundary shows loader

  const r = currentRestaurant;

  const quickActions = [
    { to: `/restaurant/${restaurantId}/menu`,  icon: <UtensilsCrossed size={28} />, label: 'View Menu',     desc: 'Browse all dishes' },
    { to: `/restaurant/${restaurantId}/about`, icon: <BookOpen size={28} />,        label: 'About Us',      desc: 'Our story & info' },
    { to: '/reservations',                     icon: <CalendarDays size={28} />,    label: 'Book A Table',  desc: 'Reserve your seat' },
    { to: '/order',                            icon: <ClipboardList size={28} />,   label: 'Order History', desc: 'View past orders' },
  ];

  return (
    <>
      {/* ── Carousel Hero ── */}
      <BannerCarousel restaurant={r} restaurantId={restaurantId} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 64px' }}>
        {/* ── Quick Actions ── */}
        <section style={{ marginBottom: 64, paddingTop: 64 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(230,57,70,0.10)',
              color: C.primary, fontSize: 12, fontWeight: 700,
              letterSpacing: '1.4px', textTransform: 'uppercase',
              padding: '4px 16px', borderRadius: 20, marginBottom: 10,
            }}>
              Quick Access
            </span>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: C.dark, margin: 0 }}>
              What would you like to do?
            </h2>
          </div>

          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 240px))',
            gap:                 20,
            justifyContent:      'center',
          }}>
            {quickActions.map(({ to, icon, label, desc }) => (
              <QuickCard key={to} to={to} icon={icon} label={label} desc={desc} />
            ))}
          </div>
        </section>

      </div>
    </>
  );
};

export default RestaurantHomePage;
