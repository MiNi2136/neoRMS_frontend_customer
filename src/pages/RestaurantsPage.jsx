/* ─────────────────────────────────────────────────────────────────
   RestaurantsPage  —  /restaurants

   Layout order:
     1. Sticky search bar (directly below navbar)
     2. Round food-category icons (filter)
     3. Restaurant cards grid

   No hero banner. No popular dishes.
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ChevronRight, Utensils, X, Truck, QrCode, Camera, XCircle } from 'lucide-react';
import { getAllRestaurants } from '../services/restaurantService';
import { useRestaurant } from '../context/RestaurantContext';
import { theme } from '../theme/colors';

/* ── Theme tokens ── */
const T = theme.colors;
const C = {
  primary:     T.primary,
  primaryHover:T.primaryHover,
  highlight:   T.highlight,
  dark:        T.dark,
  muted:       T.muted,
  border:      T.border,
  bg:          T.bg,
  cardBg:      T.cardBg,
  shadow:      theme.shadows.card,
  shadowHover: theme.shadows.cardHover,
};

/* ── Food categories for filtering ── */
const CATEGORIES = [
  { id: 'burger',   label: 'Burger',   image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=75',  keywords: ['burger', 'burgers', 'fast food', 'american'] },
  { id: 'pizza',    label: 'Pizza',    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=75',  keywords: ['pizza', 'italian', 'pizzeria'] },
  { id: 'biryani',  label: 'Biryani',  image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=200&q=75',  keywords: ['biryani', 'rice', 'indian', 'mughlai'] },
  { id: 'chinese',  label: 'Chinese',  image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=200&q=75',  keywords: ['chinese', 'noodles', 'dim sum', 'asian', 'wok'] },
  { id: 'sushi',    label: 'Sushi',    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=200&q=75',  keywords: ['sushi', 'japanese', 'ramen', 'sashimi'] },
  { id: 'seafood',  label: 'Seafood',  image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=200&q=75',  keywords: ['seafood', 'fish', 'prawn', 'crab', 'lobster'] },
  { id: 'desserts', label: 'Desserts', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=200&q=75',  keywords: ['dessert', 'desserts', 'cake', 'sweet', 'ice cream', 'bakery'] },
  { id: 'drinks',   label: 'Drinks',   image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=75',  keywords: ['drinks', 'juice', 'smoothie', 'cafe', 'coffee', 'beverage', 'bar'] },
  { id: 'healthy',  label: 'Healthy',  image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=200&q=75',  keywords: ['healthy', 'salad', 'vegan', 'vegetarian', 'organic', 'diet'] },
  { id: 'mexican',  label: 'Mexican',  image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=200&q=75',  keywords: ['mexican', 'taco', 'tacos', 'burrito', 'quesadilla'] },
];

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div
    style={{
      background: C.cardBg, borderRadius: 16, overflow: 'hidden',
      boxShadow: C.shadow, animation: 'rp-pulse 1.5s ease-in-out infinite',
    }}
  >
    <div style={{ height: 190, background: '#E5E7EB' }} />
    <div style={{ padding: '18px 20px 22px' }}>
      <div style={{ height: 18, width: '65%', background: '#E5E7EB', borderRadius: 8, marginBottom: 10 }} />
      <div style={{ height: 13, width: '85%', background: '#F3F4F6', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 13, width: '45%', background: '#F3F4F6', borderRadius: 6 }} />
    </div>
  </div>
);

/* ── Category icon (circular) ── */
const CategoryIcon = ({ cat, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const lit = active || hovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, cursor: 'pointer', background: 'none', border: 'none',
        padding: '6px 8px', outline: 'none', minWidth: 76,
      }}
      aria-label={`Filter by ${cat.label}`}
    >
      {/* Outer ring (active glow) */}
      <div style={{
        width: 76, height: 76, borderRadius: '50%', padding: 3, flexShrink: 0,
        background: active
          ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryHover} 100%)`
          : 'transparent',
        boxShadow: active
          ? `0 0 0 2px rgba(230,57,70,0.18), 0 6px 18px rgba(230,57,70,0.22)`
          : lit ? '0 4px 14px rgba(31,41,55,0.11)' : 'none',
        transform: lit ? 'translateY(-4px) scale(1.07)' : 'translateY(0) scale(1)',
        transition: 'all 0.22s ease',
      }}>
        {/* Inner circle with image */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
          border: active ? '2px solid #fff' : `2px solid ${lit ? '#D1D5DB' : '#E5E7EB'}`,
        }}>
          <img src={cat.image} alt={cat.label} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>
      <span style={{
        fontSize: 11.5, fontWeight: active ? 700 : 500,
        color: active ? C.primary : lit ? C.dark : C.muted,
        letterSpacing: '0.2px', whiteSpace: 'nowrap',
        transition: 'color 0.2s ease',
        lineHeight: 1.2,
      }}>
        {cat.label}
      </span>
    </button>
  );
};

/* ── Restaurant card ── */
const RestaurantCard = ({ restaurant, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const bannerSrc = restaurant.bannerImage || restaurant.image || restaurant.logo || null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    C.cardBg,
        borderRadius:  16,
        overflow:      'hidden',
        boxShadow:     hovered ? C.shadowHover : C.shadow,
        cursor:        'pointer',
        transform:     hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition:    'all 0.22s ease',
        border:        `1.5px solid ${hovered ? C.primary : C.border}`,
        outline:       'none',
      }}
    >
      {/* Banner */}
      <div
        style={{
          height:              190,
          background:          bannerSrc
            ? `url(${bannerSrc}) center/cover no-repeat`
            : `linear-gradient(135deg, #1F5C2E 0%, ${C.primary} 100%)`,
          position:            'relative',
          display:             'flex',
          alignItems:          'center',
          justifyContent:      'center',
          overflow:            'hidden',
        }}
      >
        {/* Dark tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: bannerSrc
            ? 'rgba(0,0,0,0.35)'
            : 'rgba(0,0,0,0.10)',
        }} />

        {/* Fallback icon */}
        {!bannerSrc && (
          <Utensils size={52} color="rgba(255,255,255,0.6)" style={{ position: 'relative', zIndex: 1 }} />
        )}

        {/* "Open" pill */}
        <div style={{
          position:         'absolute', top: 12, right: 12,
          background:       C.primary, color: '#fff',
          fontSize:         11, fontWeight: 700, letterSpacing: '0.5px',
          padding:          '3px 10px', borderRadius: 20, zIndex: 2,
        }}>
          OPEN
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '18px 20px 20px' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.dark, margin: '0 0 5px' }}>
          {restaurant.name || 'Restaurant'}
        </h3>

        {restaurant.tagline && (
          <p style={{
            fontSize: 13, color: C.muted, margin: '0 0 10px',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {restaurant.tagline}
          </p>
        )}

        {restaurant.location && (
          <p style={{
            fontSize: 12, color: C.muted,
            display: 'flex', alignItems: 'center', gap: 4, margin: '0 0 14px',
          }}>
            <button
              title="View on map"
              aria-label="View on map"
              onClick={(e) => {
                e.stopPropagation();
                const q = encodeURIComponent(
                  (restaurant.lat && restaurant.lng)
                    ? `${restaurant.lat},${restaurant.lng}`
                    : restaurant.location
                );
                window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
              }}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                flexShrink: 0,
                borderRadius: 4,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <MapPin size={13} color={C.primary} strokeWidth={2.2} />
            </button>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {restaurant.location}
            </span>
          </p>
        )}

        {/* CTA row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: restaurant.location ? 0 : 14,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: C.primary,
            background: `rgba(230,57,70,0.10)`, padding: '4px 10px',
            borderRadius: 20,
          }}>
            View Menu
          </span>
          <ChevronRight size={16} color={C.primary} />
        </div>
      </div>
    </div>
  );
};

/* ── Match restaurant against a category's keywords ── */
const restaurantMatchesCategory = (r, cat) => {
  const haystack = [
    r.name, r.tagline, r.description, r.cuisine,
    r.category, r.cuisineType,
    ...(Array.isArray(r.categories) ? r.categories : []),
  ]
    .filter(Boolean).join(' ').toLowerCase();
  return cat.keywords.some((kw) => haystack.includes(kw));
};

/* ── Main page ── */
const RestaurantsPage = () => {
  const navigate = useNavigate();
  const { setCurrentRestaurant } = useRestaurant();
  const [searchParams, setSearchParams] = useSearchParams();

  const [restaurants,    setRestaurants   ] = useState([]);
  const [loading,        setLoading       ] = useState(true);
  const [error,          setError         ] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  /* Search is driven by URL ?q= param so it stays in sync with the nav search bar */
  const search    = searchParams.get('q') || '';
  const setSearch = (val) => {
    if (val) setSearchParams({ q: val }, { replace: true });
    else     setSearchParams({},         { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAllRestaurants()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.data ?? data?.restaurants ?? []);
        setRestaurants(list);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load restaurants.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setCurrentRestaurant(null); }, [setCurrentRestaurant]);

  const filtered = restaurants.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const textMatch =
        (r.name     || '').toLowerCase().includes(q) ||
        (r.tagline  || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.cuisine  || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q);
      if (!textMatch) return false;
    }
    if (activeCategory) {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat && !restaurantMatchesCategory(r, cat)) return false;
    }
    return true;
  });

  const handleSelect = (r) => {
    if (r.tenantId) localStorage.setItem('tenantId', r.tenantId);
    navigate(`/restaurant/${r._id ?? r.id}`);
  };
  const toggleCategory = (id) => setActiveCategory((prev) => (prev === id ? null : id));
  const clearAll       = () => { setSearch(''); setActiveCategory(null); };
  const hasFilters     = !!(search || activeCategory);

  /* ── QR Scan modal ── */
  const [qrOpen,    setQrOpen   ] = useState(false);
  const [camError,  setCamError ] = useState(null);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!qrOpen) {
      /* stop any running stream when modal closes */
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCamError(null);
      return;
    }
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Camera not supported on this device.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCamError('Camera access denied. Please allow camera permission.'));
  }, [qrOpen]);

  return (
    <div style={{ minHeight: 'calc(100vh - var(--nav-h, 80px))' }}>
      <style>{`
        @keyframes rp-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .rp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 28px;
        }
        @media (max-width: 640px) {
          .rp-grid { grid-template-columns: 1fr; }
        }
        /* Category row */
        .rp-cat-row {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding: 4px 4px 8px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        @media (min-width: 768px) {
          .rp-cat-row {
            justify-content: center;
            flex-wrap: wrap;
            overflow-x: visible;
            gap: 8px;
          }
        }
        .rp-cat-row::-webkit-scrollbar { display: none; }
        .rp-cat-row { scrollbar-width: none; }
        /* Sticky band */
        .rp-sticky {
          position: sticky;
          top: var(--nav-h, 80px);
          z-index: 30;
          background: #FFFFFF;
          box-shadow: 0 2px 12px rgba(31,41,55,0.06);
        }
        /* QR FAB */
        .rp-qr-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 200;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: ${C.primary};
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          box-shadow: 0 4px 20px rgba(230,57,70,0.40);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .rp-qr-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(230,57,70,0.50);
        }
        .rp-qr-fab span {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1;
        }
        /* QR modal overlay */
        .rp-qr-overlay {
          position: fixed;
          inset: 0;
          z-index: 400;
          background: rgba(0,0,0,0.70);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .rp-qr-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 380px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.30);
          position: relative;
        }
        .rp-qr-video {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          display: block;
          background: #111;
        }
        .rp-qr-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0,0,0,0.55);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rp-qr-close:hover { background: rgba(0,0,0,0.80); }
        .rp-section-label {
          font-size: 18px;
          font-weight: 700;
          color: ${C.dark};
          margin: 0;
          letter-spacing: -0.2px;
          line-height: 1.3;
        }
        .rp-section-sub {
          font-size: 13px;
          color: ${C.muted};
          margin: 3px 0 0;
        }
        /* Promo banner card */
        .rp-promo-card {
          background: linear-gradient(120deg, #FFF5F3 0%, #FFE8E4 100%);
          border: 1.5px solid rgba(230,57,70,0.18);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(230,57,70,0.10);
          overflow: hidden;
        }
        .rp-promo-signup-btn {
          transition: background-color 0.2s, transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .rp-promo-signup-btn:hover {
          background-color: ${C.primaryHover} !important;
          transform: scale(1.03);
          box-shadow: 0 4px 14px rgba(230,57,70,0.30);
        }
        /* Half-width on desktop, full on mobile */
        .rp-promo-wrap {
          width: 50%;
          min-width: 320px;
        }
        @media (max-width: 767px) {
          .rp-promo-wrap { width: 100%; }
        }
      `}</style>

      {/* ══ ZONE 1: Promo — soft blush ══ */}
      {/* <div style={{ background: '#FFF0EE', paddingTop: 28, paddingBottom: 18 }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>
        <div className="rp-promo-wrap">
        <div className="rp-promo-card" style={{
          padding: '22px 28px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 20,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '1.2px',
              color: C.primary, textTransform: 'uppercase',
            }}>
              First-time here?
            </span>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1.3 }}>
              Free delivery on your first order
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 12px', lineHeight: 1.4 }}>
              Sign up now and save on every meal delivered to your door.
            </p>
            <a
              href="/sign-up"
              className="rp-promo-signup-btn"
              style={{
                alignSelf: 'flex-start',
                fontSize: 13.5, fontWeight: 700,
                background: C.primary,
                color: '#fff',
                padding: '9px 22px', borderRadius: 10,
              }}
            >
              Sign Up Free
            </a>
          </div>
          <div style={{
            flexShrink: 0,
            width: 76, height: 76,
            borderRadius: '50%',
            background: 'rgba(230,57,70,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Truck size={36} color={C.primary} strokeWidth={1.7} />
          </div>
        </div>
        </div>
      </div>
      </div> */}
      {/* end Zone 1 */}

      {/* ══ ZONE 2: Cuisine — pure white ══ */}
      <div style={{ background: '#FFFFFF' }}>
      {/* ② Browse by Cuisine — sticky heading + icons */}
      <div className="rp-sticky" style={{ marginTop: 0 }}>
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 0 12px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>

            {/* Section title row */}
            <div style={{
              display: 'flex', alignItems: 'baseline',
              justifyContent: 'space-between', marginBottom: 16,
            }}>
              <div>
                <h2 className="rp-section-label">Cuisine</h2>
              </div>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12.5, color: C.primary, fontWeight: 600,
                    textDecoration: 'underline', flexShrink: 0,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Icon row */}
            <div className="rp-cat-row">
              {CATEGORIES.map((cat) => (
                <CategoryIcon
                  key={cat.id}
                  cat={cat}
                  active={activeCategory === cat.id}
                  onClick={() => toggleCategory(cat.id)}
                />
              ))}
            </div>

          </div>
        </div>
      </div>{/* end sticky band */}
      </div>{/* end Zone 2 */}

      {/* ══ ZONE 3: Restaurants — light gray ══ */}
      <div style={{ background: '#F8F9FB', paddingBottom: 60 }}>

      {/* ③ Active filter chips */}
      {hasFilters && (
        <div style={{
          maxWidth: 1140, margin: '20px auto 0', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Filters:</span>

          {search && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `rgba(230,57,70,0.10)`, color: C.primary,
              fontSize: 12.5, fontWeight: 600, padding: '4px 12px',
              borderRadius: 20, border: `1px solid rgba(230,57,70,0.25)`,
            }}>
              &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: C.primary, display: 'flex', alignItems: 'center' }}>
                <X size={13} />
              </button>
            </span>
          )}

          {activeCategory && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `rgba(230,57,70,0.10)`, color: C.primary,
              fontSize: 12.5, fontWeight: 600, padding: '4px 12px',
              borderRadius: 20, border: `1px solid rgba(230,57,70,0.25)`,
            }}>
              {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              <button onClick={() => setActiveCategory(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: C.primary, display: 'flex', alignItems: 'center' }}>
                <X size={13} />
              </button>
            </span>
          )}

          <button onClick={clearAll}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: C.muted, textDecoration: 'underline', padding: 0 }}>
            Clear all
          </button>
        </div>
      )}

      {/* ④ Restaurant Cards */}
      <div style={{ maxWidth: 1140, margin: '32px auto 0', padding: '0 24px' }}>

        {/* Section header */}
        {!loading && !error && (
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: C.dark,
                margin: 0, letterSpacing: '-0.3px', lineHeight: 1.3,
              }}>
                {hasFilters ? 'Search Results' : 'All Restaurants'}
              </h2>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0', fontWeight: 400 }}>
                {hasFilters
                  ? `Showing results for${search ? ` "${search}"` : ''}${activeCategory ? ` in ${CATEGORIES.find(c => c.id === activeCategory)?.label}` : ''}`
                  : 'Browse and order from restaurants near you'}
              </p>
            </div>
            <span style={{
              fontSize: 13, color: C.muted, flexShrink: 0, paddingTop: 6,
              fontWeight: 500,
            }}>
              {filtered.length === 0
                ? 'No restaurants found'
                : `${filtered.length} restaurant${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rp-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: C.cardBg, borderRadius: 16, boxShadow: C.shadow,
          }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#EF4444', marginBottom: 8 }}>
              Oops! Something went wrong.
            </p>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: 10, background: C.primary,
                color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '72px 24px',
            background: C.cardBg, borderRadius: 16, boxShadow: C.shadow,
          }}>
            <Utensils size={56} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
              {hasFilters ? 'No matches found' : 'No Restaurants Yet'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: hasFilters ? 20 : 0 }}>
              {hasFilters
                ? 'Try a different search or category.'
                : 'Check back soon — new restaurants are joining!'}
            </p>
            {hasFilters && (
              <button
                onClick={clearAll}
                style={{
                  padding: '9px 22px', borderRadius: 10, background: C.primary,
                  color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Cards grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="rp-grid">
            {filtered.map((r) => (
              <RestaurantCard
                key={r._id ?? r.id}
                restaurant={r}
                onClick={() => handleSelect(r)}
              />
            ))}
          </div>
        )}
      </div>
      </div>{/* end Zone 3 */}

      {/* ── QR Scan Floating Action Button ── */}
      <button
        className="rp-qr-fab"
        onClick={() => setQrOpen(true)}
        aria-label="Scan QR code"
        title="Scan QR Code"
      >
        <QrCode size={24} strokeWidth={2} />
        <span>SCAN</span>
      </button>

      {/* ── QR Scan Modal ── */}
      {qrOpen && (
        <div className="rp-qr-overlay" onClick={() => setQrOpen(false)}>
          <div className="rp-qr-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '18px 20px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `rgba(230,57,70,0.10)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <QrCode size={18} color={C.primary} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.dark }}>Scan QR Code</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Point your camera at a restaurant QR</p>
              </div>
            </div>

            {/* Camera viewport */}
            <div style={{ position: 'relative' }}>
              {camError ? (
                <div style={{
                  width: '100%', aspectRatio: '1', background: '#111',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <Camera size={48} color="#555" />
                  <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '0 24px', margin: 0 }}>
                    {camError}
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="rp-qr-video"
                    playsInline
                    muted
                    autoPlay
                  />
                  {/* Scanning frame overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      width: '60%', aspectRatio: '1',
                      border: `2.5px solid ${C.primary}`,
                      borderRadius: 16,
                      boxShadow: `0 0 0 2000px rgba(0,0,0,0.35)`,
                    }} />
                  </div>
                  {/* Scan line animation */}
                  <style>{`
                    @keyframes rp-scan-line {
                      0%   { top: 20%; }
                      50%  { top: 76%; }
                      100% { top: 20%; }
                    }
                    .rp-scan-anim {
                      position: absolute;
                      left: 20%; width: 60%; height: 2px;
                      background: linear-gradient(90deg, transparent, ${C.primary}, transparent);
                      animation: rp-scan-line 2s ease-in-out infinite;
                      pointer-events: none;
                    }
                  `}</style>
                  <div className="rp-scan-anim" />
                </>
              )}

              {/* Close button */}
              <button
                className="rp-qr-close"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR scanner"
              >
                <XCircle size={20} color="#fff" />
              </button>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Tap outside or press ✕ to dismiss
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;
