import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Utensils, CalendarDays, Bell, LogIn, LogOut, User } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import { useAuth, AUTH_STATUS } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';

/* ─── Theme tokens ─── */
const C = {
  bg:           '#FFFFFF',
  primary:      '#2DBE60',
  primaryHover: '#22A455',
  dark:         '#1F2937',
  gray:         '#6B7280',
  border:       '#E5E7EB',
  cartBg:       '#F3F4F6',
  cartHover:    '#E5E7EB',
  shadow:       '0px 6px 20px rgba(45, 190, 96, 0.25)',
};

const BASE_NAV_LINKS = [
  { to: '/',             label: 'Home' },
  { to: '/restaurants',  label: 'Restaurants' },
  { to: '/daily-menu',   label: 'Daily Menu' },
  { to: '/order',        label: 'Order Food Online' },
  { to: '/reservations', label: 'Dine In' },
];

const Header = () => {
  const [mobileOpen,   setMobileOpen  ] = useState(false);
  const [scrolled,     setScrolled    ] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location                        = useLocation();
  const navigate                        = useNavigate();
  /* Guard against the rare case where CartContext hasn't mounted yet */
  const { cart = [] } = useContext(CartContext) ?? {};
  const { status, user, logout, openAuthModal } = useAuth();

  const { currentRestaurant, clearCurrentRestaurant } = useRestaurant();
  const restaurantId = currentRestaurant?.id ?? currentRestaurant?._id ?? null;

  /* Route-based flags — must be declared BEFORE navLinks to avoid TDZ */
  const isHome            = location.pathname === '/';
  const isRestaurantsPage = location.pathname === '/restaurants';
  const isRestaurantHome  = !!restaurantId && location.pathname === `/restaurant/${restaurantId}`;

  /* Dynamic nav rules:
     - Inside a restaurant  → full restaurant-scoped 6-item nav
     - On / or /restaurants → minimal discovery nav (Home + Restaurants only)
     - Everywhere else      → standard BASE_NAV_LINKS
  */
  const navLinks = restaurantId
    ? [
        { to: `/restaurant/${restaurantId}`,       label: 'Home'              },
        { to: '/restaurants',                      label: 'Restaurants',       onClick: clearCurrentRestaurant },
        { to: `/restaurant/${restaurantId}/menu`,  label: 'Daily Menu'        },
        { to: `/restaurant/${restaurantId}/menu`,  label: 'Order Food Online' },
        { to: '/reservations',                     label: 'Dine In'           },
        { to: `/restaurant/${restaurantId}/about`, label: 'About Us'          },
      ]
    : (isHome || isRestaurantsPage)
      ? [
          { to: '/',            label: 'Home'        },
          { to: '/restaurants', label: 'Restaurants' },
        ]
      : BASE_NAV_LINKS;

  /* Logo destination + text */
  const logoTo   = restaurantId ? `/restaurant/${restaurantId}` : '/';
  const logoText = currentRestaurant?.name ? currentRestaurant.name : 'GreenBite';
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  /* Active nav label — first link whose `to` exactly matches the current path.
     Using label identity (not `to`) ensures only ONE item is ever active,
     even when two links share the same `to` URL (e.g. Daily Menu / Order Food Online). */
  const activeNavLabel = navLinks.find(link => link.to === location.pathname)?.label ?? null;
  const isNavActive  = (label) => label === activeNavLabel;
  /* One-off exact check used for non-nav links (notifications, orders, etc.) */
  const pathActive   = (path)  => location.pathname === path;

  /* Navigate to cart if authenticated, else open sign-in modal.
     When inside a restaurant we use the restaurant-scoped /cart route
     so the RestaurantBoundary context is preserved. */
  const handleCartClick = () => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigate(restaurantId ? `/restaurant/${restaurantId}/cart` : '/cart');
    } else {
      openAuthModal('signin');
    }
  };

  const userMenuRef = useRef(null);

  /* ── Close user dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Scroll listener ── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Dynamic colour set based on scroll + page ── */
  const onHero    = (isHome || isRestaurantHome) && !scrolled;
  const linkColor = (label) => {
    if (isNavActive(label)) return C.primary;
    return onHero ? 'rgba(255,255,255,0.92)' : C.dark;
  };
  const iconColor  = onHero ? '#FFFFFF' : C.dark;
  const iconBg     = onHero ? 'rgba(255,255,255,0.15)' : C.cartBg;
  const iconHoverBg= onHero ? 'rgba(255,255,255,0.28)' : C.cartHover;

  return (
    <>
      <style>{`
        .nb-link {
          position: relative;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }
        .nb-link::after {
          content: '';
          position: absolute;
          left: 0; bottom: -4px;
          width: 0; height: 2px;
          border-radius: 2px;
          background: ${C.primary};
          transition: width 0.2s ease-in-out;
        }
        .nb-link:hover::after,
        .nb-link.nb-active::after { width: 100%; }
        .nb-link:hover { color: ${C.primary} !important; }

        .nb-icon-btn {
          transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
          cursor: pointer; border: none; text-decoration: none;
        }
        .nb-icon-btn:hover { transform: scale(1.06); }

        .nb-cta {
          transition: background-color 0.2s ease-in-out,
                      transform        0.2s ease-in-out,
                      box-shadow       0.2s ease-in-out;
          text-decoration: none;
        }
        .nb-cta:hover {
          background-color: ${C.primaryHover} !important;
          transform: scale(1.02);
        }
        .nb-cta-ghost {
          transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, transform 0.2s ease-in-out;
          text-decoration: none;
        }
        .nb-cta-ghost:hover {
          background-color: rgba(255,255,255,0.18) !important;
          transform: scale(1.02);
        }
        .nb-mobile-link {
          text-decoration: none; border-radius: 8px;
          font-size: 16px; font-weight: 500; padding: 10px 12px;
          transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
        }
        .nb-mobile-link:hover {
          background-color: rgba(45,190,96,0.08);
          color: ${C.primary} !important;
        }
        .nb-hamburger {
          transition: background-color 0.2s ease-in-out;
          border: none; cursor: pointer;
        }
        .nb-hamburger:hover { filter: brightness(0.9); }

        .nb-user-menu {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #fff; border: 1px solid ${C.border};
          border-radius: 12px; min-width: 180px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 100; overflow: hidden;
        }
        .nb-user-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; font-size: 14px; font-weight: 500;
          color: ${C.dark}; text-decoration: none; background: none; border: none;
          cursor: pointer; width: 100%; text-align: left;
          transition: background-color 0.15s;
        }
        .nb-user-item:hover { background-color: rgba(45,190,96,0.08); color: ${C.primary}; }
        .nb-user-item.danger:hover { background-color: #FEF2F2; color: #EF4444; }
      `}</style>

      <header
        style={{
          backgroundColor: onHero ? 'transparent' : C.bg,
          borderBottom: onHero ? 'none' : `1px solid ${C.border}`,
          backdropFilter: (!onHero) ? 'none' : 'none',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: scrolled && !onHero ? '0 2px 16px rgba(0,0,0,0.08)' : 'none',
        }}
        className="w-full fixed top-0 z-50"
      >
        {/* ── Main bar ── */}
        <div
          style={{ maxWidth: 1400, padding: '0 32px', height: 80 }}
          className="mx-auto flex items-center justify-between"
        >

          {/* Logo — shows restaurant name when inside a restaurant */}
          <Link to={logoTo} className="flex items-center gap-2 flex-shrink-0" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: C.primary, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Utensils size={20} color="#FFFFFF" strokeWidth={2.2} />
            </div>
            <span style={{
              color: onHero ? '#FFFFFF' : C.dark,
              fontWeight: 600,
              fontSize: logoText.length > 18 ? 14 : logoText.length > 12 ? 16 : 20,
              letterSpacing: '-0.3px',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s ease, font-size 0.2s ease',
            }}>
              {logoText}
            </span>
          </Link>

          {/* Desktop nav – centre */}
          <nav className="hidden md:flex items-center" style={{ gap: 28 }}>
            {navLinks.map(({ to, label, onClick }) => (
              <Link
                key={label}
                to={to}
                onClick={onClick}
                className={`nb-link${isNavActive(label) ? ' nb-active' : ''}`}
                style={{
                  color: linkColor(label),
                  fontSize: 15, fontWeight: 500, letterSpacing: '0.3px', whiteSpace: 'nowrap',
                  transition: 'color 0.3s ease',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center flex-shrink-0" style={{ gap: 10 }}>

            {/* Notifications — protected; ProtectedRoute handles unauthenticated access */}
            <Link
              to="/notifications"
              className="nb-icon-btn relative flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 44, height: 44, backgroundColor: iconBg }}
              aria-label="Notifications"
            >
              <Bell size={20} color={iconColor} />
              {/* static unread dot */}
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 9, height: 9, borderRadius: '50%',
                backgroundColor: '#EF4444',
                boxShadow: '0 0 0 2px ' + (onHero ? 'transparent' : '#fff'),
              }} />
            </Link>

            {/* Cart — opens modal if not authenticated; navigates to /cart if authenticated */}
            <button
              onClick={handleCartClick}
              className="nb-icon-btn relative flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 44, height: 44, backgroundColor: iconBg, border: 'none', cursor: 'pointer' }}
              aria-label="Cart"
            >
              <ShoppingCart size={20} color={iconColor} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 18, height: 18, borderRadius: '50%',
                  backgroundColor: C.primary, color: '#FFFFFF',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, boxShadow: '0 0 0 2px ' + (onHero ? 'transparent' : '#fff'),
                }}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <div style={{ width: 6 }} className="hidden sm:block" />

            {/* ── Auth area ── */}
            {status === AUTH_STATUS.AUTHENTICATED ? (
              /* User avatar + dropdown */
              <div
                ref={userMenuRef}
                style={{ position: 'relative' }}
                className="hidden sm:block"
              >
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        '0 14px',
                    height:         44,
                    borderRadius:   10,
                    border:         'none',
                    cursor:         'pointer',
                    backgroundColor: onHero ? 'rgba(255,255,255,0.15)' : C.cartBg,
                    color:           onHero ? '#fff' : C.dark,
                    fontSize:       14,
                    fontWeight:     600,
                    transition:     'background-color 0.2s',
                  }}
                >
                  <User size={17} />
                  <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name ?? user?.email ?? 'Account'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="nb-user-menu">
                    <Link
                      to="/orders"
                      className="nb-user-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <ShoppingCart size={15} /> My Orders
                    </Link>
                    <button
                      className="nb-user-item danger"
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Sign In CTA — opens modal overlay (does NOT navigate away) */
              <button
                onClick={() => openAuthModal('signin')}
                className={`hidden sm:flex items-center flex-shrink-0 nb-cta`}
                style={{
                  height:          44,
                  padding:         '0 20px',
                  borderRadius:    10,
                  gap:             7,
                  backgroundColor: onHero ? 'rgba(255,255,255,0.15)' : C.primary,
                  border:          onHero ? '1.5px solid rgba(255,255,255,0.7)' : 'none',
                  color:           '#FFFFFF',
                  fontSize:        15,
                  fontWeight:      600,
                  boxShadow:       onHero ? 'none' : C.shadow,
                  cursor:          'pointer',
                }}
              >
                <LogIn size={16} color="#FFFFFF" />
                Sign In
              </button>
            )}

            {/* Book A Table CTA — only shown when authenticated or on desktop */}
            {status === AUTH_STATUS.AUTHENTICATED && (
              <Link
                to="/reservations"
                className={`hidden lg:flex items-center flex-shrink-0 ${onHero ? 'nb-cta-ghost' : 'nb-cta'}`}
                style={onHero ? {
                  height: 44, padding: '0 22px', borderRadius: 10, gap: 8,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.7)',
                  color: '#FFFFFF', fontSize: 15, fontWeight: 600,
                } : {
                  height: 44, padding: '0 22px', borderRadius: 10, gap: 8,
                  backgroundColor: C.primary, color: '#FFFFFF',
                  fontSize: 15, fontWeight: 600, boxShadow: C.shadow,
                }}
              >
                <CalendarDays size={16} color="#FFFFFF" />
                Book A Table
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="nb-hamburger md:hidden flex items-center justify-center rounded-lg"
              style={{ width: 44, height: 44, backgroundColor: iconBg }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} color={iconColor} /> : <Menu size={22} color={iconColor} />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div
            style={{ backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, padding: '12px 24px 20px' }}
            className="md:hidden"
          >
            <nav className="flex flex-col" style={{ gap: 2 }}>
              {navLinks.map(({ to, label, onClick }) => (
                <Link
                  key={label}
                  to={to}
                  className="nb-mobile-link"
                  style={{
                    color: isNavActive(label) ? C.primary : C.dark,
                    backgroundColor: isNavActive(label) ? 'rgba(45,190,96,0.08)' : 'transparent',
                  }}
                  onClick={() => { onClick?.(); setMobileOpen(false); }}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/notifications"
                className="nb-mobile-link flex items-center gap-2"
                style={{ color: pathActive('/notifications') ? C.primary : C.dark }}
                onClick={() => setMobileOpen(false)}
              >
                <Bell size={16} /> Notifications
              </Link>

              {/* Mobile auth */}
              {status === AUTH_STATUS.AUTHENTICATED ? (
                <>
                  <Link
                    to="/orders"
                    className="nb-mobile-link flex items-center gap-2"
                    style={{ color: pathActive('/orders') ? C.primary : C.dark }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ShoppingCart size={16} /> My Orders
                  </Link>
                  <button
                    className="nb-mobile-link flex items-center gap-2"
                    style={{ color: '#EF4444', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { setMobileOpen(false); logout(); }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              ) : (
                <button
                  className="nb-mobile-link flex items-center gap-2"
                  style={{
                    color: C.primary, fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '100%', textAlign: 'left', padding: 0,
                  }}
                  onClick={() => { setMobileOpen(false); openAuthModal('signin'); }}
                >
                  <LogIn size={16} /> Sign In
                </button>
              )}

              <Link
                to="/reservations"
                className="nb-cta flex items-center justify-center"
                style={{
                  marginTop: 14, height: 44, borderRadius: 10, gap: 8,
                  backgroundColor: C.primary, color: '#FFFFFF',
                  fontSize: 15, fontWeight: 600, boxShadow: C.shadow,
                }}
                onClick={() => setMobileOpen(false)}
              >
                <CalendarDays size={16} color="#FFFFFF" />
                Book A Table
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
