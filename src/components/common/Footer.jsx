import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Utensils } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../theme/colors';

const T = theme.colors;
const C = {
  bg:      '#1A0A0A',
  surface: '#2A1010',
  primary: T.primary,
  muted:   'rgba(255,255,255,0.55)',
  border:  'rgba(255,255,255,0.08)',
};

const Footer = () => {
  /* currentRestaurant is null when no restaurant is selected (e.g. on homepage) */
  const { currentRestaurant: restaurant } = useRestaurant();

  const name     = restaurant?.name        || 'neoRMS Restaurant';
  const tagline  = restaurant?.tagline     || 'Crafted with passion. Served with love.';
  const location = restaurant?.location    || null;
  const contact  = restaurant?.contactInfo || null;

  return (
    <footer
      style={{
        background:   C.bg,
        color:        '#fff',
        padding:      '32px 24px 20px',
        borderTop:    `3px solid ${C.primary}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top row */}
        <div
          style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        24,
            alignItems: 'flex-start',
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {/* Brand block */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Utensils size={18} color={C.primary} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{name}</span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              {tagline}
            </p>
          </div>

          {/* Quick links column */}
          <div style={{ flex: '1 1 180px' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.primary, marginBottom: 12 }}>
              Buttons
            </h4>
            <Link
              to="/restaurants"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: C.muted, textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              All Restaurants
            </Link>
          </div>

          {/* Location + contact (only shown when data exists) */}
          {(location || contact) && (
            <div style={{ flex: '1 1 220px' }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.primary, marginBottom: 12 }}>
                Contact
              </h4>
              {location && (
                <p style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.muted, margin: '0 0 8px' }}>
                  <MapPin size={14} color={C.primary} style={{ marginTop: 1, flexShrink: 0 }} />
                  {location}
                </p>
              )}
              {contact && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted, margin: 0 }}>
                  <Phone size={14} color={C.primary} style={{ flexShrink: 0 }} />
                  {contact}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom copyright */}
        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, margin: 0 }}>
          © {new Date().getFullYear()} {name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

