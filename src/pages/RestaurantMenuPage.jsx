/* ─────────────────────────────────────────────────────────────────
   RestaurantMenuPage  —  /restaurant/:restaurantId/menu

   Fetches and renders the menu for a specific restaurant.
   Menu API is called ONLY when this page is mounted.
   Never fetched on the restaurant home page.

   Backend API:  GET /api/menuProduct/:restaurantId
   Response:     { success, data: [ { productTitle, productDescription,
                   images[], variants[], addons[], status, ... }, ... ] }
   ───────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import FoodCard  from '../components/menu/FoodCard';
import FoodModal from '../components/menu/FoodModal';
import { getRestaurantMenu } from '../services/restaurantService';

/* ── Theme tokens ── */
const T = {
  primary:   '#2DBE60',
  dark:      '#1F2937',
  muted:     '#6B7280',
  border:    '#E5E7EB',
  badgeBg:   'rgba(45,190,96,0.12)',
};

/* ─────────────────────────────────────────────────────────────────
   normalise  —  maps the backend menuProduct shape → FoodCard shape
   Backend uses:  productTitle, productDescription, status
   FoodCard uses: name, description, isAvailable
   ───────────────────────────────────────────────────────────────── */
const normalise = (raw) => {
  // ── Variants ────────────────────────────────────────────────────
  // Backend sends { type: "SMALL", price: 7.99 }.
  // FoodModal reads v.size ?? v.name for the label and key, so we
  // remap `type` into both fields so every consumer works correctly.
  const variants = (Array.isArray(raw.variants) ? raw.variants : []).map((v) => ({
    ...v,
    name: v.name ?? v.type ?? v.size ?? 'Option',
    size: v.size ?? v.type ?? v.name ?? 'Option',
  }));

  const addons = Array.isArray(raw.addons) ? raw.addons : [];

  // ── Images ───────────────────────────────────────────────────────
  // Backend sends an images[] array. Support single-image fallbacks too.
  const images = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images.filter(Boolean)          // drop null/empty entries
    : raw.image    ? [raw.image]
    : raw.imageUrl ? [raw.imageUrl]
    : [];

  // ── Price ─────────────────────────────────────────────────────────
  const basePrice = variants.length > 0
    ? Number(variants[0].price ?? 0)
    : Number(raw.price ?? 0);

  // ── Availability ──────────────────────────────────────────────────
  // Backend may send status in ANY case: 'AVAILABLE', 'available', 'active', etc.
  // Normalise to lowercase before comparing so case never causes false negatives.
  const statusLower = (raw.status ?? '').toLowerCase();
  const activeStatuses   = ['active', 'available'];
  const inactiveStatuses = ['inactive', 'unavailable'];
  const isAvailable = statusLower
    ? activeStatuses.includes(statusLower)
    : raw.isAvailable !== false && !inactiveStatuses.includes(statusLower);

  // ── Category ──────────────────────────────────────────────────────
  const category =
    raw.category        ??
    raw.categoryName    ??
    raw.categoryTitle   ??
    raw.productCategory ??
    'Menu';

  return {
    id:            raw._id ?? raw.id,
    name:          raw.productTitle       ?? raw.name        ?? 'Unnamed Item',
    description:   raw.productDescription ?? raw.description ?? '',
    images,
    image:         images[0] ?? '',
    category,
    variants,
    addons,
    price:         basePrice,
    priceCurrency: raw.priceCurrency ?? 'USD',
    isAvailable,
    badge:         raw.badge ?? (raw.isPopular ? 'Popular' : null),
    rating:        Number(raw.rating  ?? 0),
    orders:        Number(raw.orders  ?? 0),
  };
};

/* ── Group flat items into category buckets ── */
const buildCategories = (items) => {
  const map = new Map();
  for (const item of items) {
    const cat = item.category;
    if (!map.has(cat)) {
      map.set(cat, {
        id:    cat.toLowerCase().replace(/\s+/g, '-'),
        title: cat,
        items: [],
      });
    }
    map.get(cat).items.push(item);
  }
  return Array.from(map.values());
};

/* ── Skeleton ── */
const Skeleton = () => (
  <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
    <style>{`@keyframes rm-skel { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
    {[1, 2].map((s) => (
      <div key={s} style={{ marginBottom: 80 }}>
        <div style={{
          height: 28, width: 200, background: '#E5E7EB', borderRadius: 8,
          marginBottom: 12, animation: 'rm-skel 1.4s ease-in-out infinite',
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 24 }}>
          {[1, 2, 3, 4].map((c) => (
            <div key={c} style={{
              borderRadius: 12, overflow: 'hidden', background: '#F9FAFB',
              animation: 'rm-skel 1.4s ease-in-out infinite',
            }}>
              <div style={{ height: 160, background: '#E5E7EB' }} />
              <div style={{ padding: 12 }}>
                <div style={{ height: 16, background: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 14, width: '60%', background: '#F3F4F6', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ── useInView for section fade-in ── */
const useInView = (threshold = 0.08) => {
  const ref = useRef(null);
  const [inView, setInView] = React.useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

/* ── Category section ── */
const CategorySection = ({ category, onSelectItem }) => {
  const [ref, inView] = useInView(0.06);
  return (
    <section
      ref={ref}
      id={category.id}
      className="scroll-mt-28"
      style={{ marginTop: 20, marginBottom: 44 }}
    >
      <div className={inView ? 'rm-fade-in' : 'opacity-0'}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: T.primary, marginBottom: 18 }}>
          {category.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
        {category.items.map((item, i) => (
          <div
            key={item.id}
            className={inView ? 'rm-fade-in' : 'opacity-0'}
            style={{ animationDelay: `${0.06 * i}s` }}
          >
            <FoodCard item={item} onClick={onSelectItem} />
          </div>
        ))}
      </div>
    </section>
  );
};

/* ────────────────── Main Page ────────────────── */
const RestaurantMenuPage = () => {
  const { restaurantId } = useParams();

  const [selected,   setSelected  ] = useState(null);
  const [activeTab,  setActiveTab ] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [apiError,   setApiError  ] = useState(null);

  /* ── Fetch menu — only when restaurantId is present ── */
  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      setApiError('No restaurant selected.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setApiError(null);
    setCategories([]);

    getRestaurantMenu(restaurantId)
      .then((items) => {
        if (cancelled) return;
        const cats = buildCategories(items.map(normalise));
        setCategories(cats);
        setActiveTab(cats[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setApiError(err?.message || 'Failed to load menu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [restaurantId]);

  /* ── Scroll spy for sticky tab bar ── */
  useEffect(() => {
    if (categories.length === 0) return;
    const handleScroll = () => {
      for (const cat of categories) {
        const el = document.getElementById(cat.id);
        if (!el) continue;
        const { top } = el.getBoundingClientRect();
        if (top <= 140) setActiveTab(cat.id);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const scrollToCategory = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Loading ── */
  if (loading) return <Skeleton />;

  /* ── Error / unavailable ── */
  if (apiError) return (
    <div style={{
      minHeight: 'calc(100vh - 80px)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <Utensils size={52} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark, marginBottom: 8 }}>
          Menu Unavailable
        </h2>
        <p style={{ fontSize: 14, color: T.muted }}>{apiError}</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes rmFadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .rm-fade-in { animation: rmFadeSlideUp 0.55s cubic-bezier(.4,0,.2,1) both; }

        .popular-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(31,41,55,0.13);
        }
        .popular-card:focus-visible { box-shadow: 0 0 0 3px #2DBE60; }
        .popular-card:hover .popular-card-img { transform: scale(1.05); }

        .rm-tab-btn {
          transition: all 0.2s ease;
          white-space: nowrap;
          cursor: pointer;
          border: none;
          background: none;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        .rm-tab-btn:hover { background-color: rgba(45,190,96,0.1); color: #2DBE60 !important; }
      `}</style>

      <div className="w-full" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* ── Sticky category tab bar ── */}
        {categories.length > 0 && (
          <div
            className="sticky z-40 w-full"
            style={{
              top: 80,
              backgroundColor: '#ffffff',
              borderBottom: `1px solid ${T.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{
              maxWidth: 1100, width: '100%',
              marginLeft: 'auto', marginRight: 'auto',
              padding: '10px 24px',
              display: 'flex', alignItems: 'center', gap: 4,
              overflowX: 'auto',
            }}>
              {categories.map(({ id, title }) => (
                <button
                  key={id}
                  onClick={() => scrollToCategory(id)}
                  className="rm-tab-btn shrink-0"
                  style={{
                    color:           activeTab === id ? T.primary : T.dark,
                    backgroundColor: activeTab === id ? T.badgeBg : 'transparent',
                    fontWeight:      activeTab === id ? 700       : 500,
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Menu items ── */}
        <div style={{
          maxWidth: 1100, width: '100%',
          marginLeft: 'auto', marginRight: 'auto',
          paddingLeft: 24, paddingRight: 24,
          paddingTop: 57, paddingBottom: 64,
        }}>
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted }}>
              <Utensils size={44} color="#D1D5DB" style={{ marginBottom: 14 }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>No menu items found for this restaurant.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                onSelectItem={setSelected}
              />
            ))
          )}
        </div>
      </div>

      {selected && (
        <FoodModal
          item={selected}
          restaurantId={restaurantId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default RestaurantMenuPage;
