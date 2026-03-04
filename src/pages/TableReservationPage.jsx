/* ─────────────────────────────────────────────────────────────────
   TableReservationPage — /reservations

   Fetches all tables for the current restaurant.
   Tables with a non-empty `reservations` array are shown as
   BOOKED (red, disabled). Available tables can be selected.
   On "Confirm Booking" a modal collects booking details and calls
   POST /table/reserve/:tableId
   ───────────────────────────────────────────────────────────────── */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, CalendarDays,
  Users, CheckCircle2, Ban, Utensils,
  Phone, Clock, StickyNote, X, PartyPopper,
} from 'lucide-react';
import { getTablesByRestaurant, reserveTable } from '../services/tableService';
import { useRestaurant } from '../context/RestaurantContext';

/* ── Theme ── */
const C = {
  primary:      '#E63946',
  primaryHover: '#C0252E',
  dark:         '#1F2937',
  muted:        '#6B7280',
  border:       '#E5E7EB',
  bg:           '#F4FAF6',
  cardBg:       '#FFFFFF',
  shadow:       '0 2px 14px rgba(31,41,55,0.07)',
};

const TableReservationPage = () => {
  const navigate = useNavigate();
  const { currentRestaurant } = useRestaurant();
  const restaurantId = currentRestaurant?.id ?? currentRestaurant?._id ?? null;

  const [tables,     setTables    ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  /* ── Booking modal ── */
  const [showModal,   setShowModal  ] = useState(false);
  const [submitting,  setSubmitting ] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookError,   setBookError  ] = useState('');

  /* ── Form fields ── */
  const [scheduledFor,  setScheduledFor ] = useState('');
  const [duration,      setDuration     ] = useState(90);
  const [partySize,     setPartySize    ] = useState(2);
  const [notes,         setNotes        ] = useState('');
  const [contactPhone,  setContactPhone ] = useState('');

  const formRef = useRef(null);

  const openModal  = () => { setBookError(''); setBookSuccess(false); setShowModal(true); };
  const closeModal = () => { if (submitting) return; setShowModal(false); setBookSuccess(false); setBookError(''); };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setBookError('');
    try {
      await reserveTable(selectedId, {
        scheduledFor: new Date(scheduledFor).toISOString(),
        duration:     Number(duration),
        partySize:    Number(partySize),
        notes:        notes.trim(),
        contactPhone: contactPhone.trim(),
      });
      setBookSuccess(true);
    } catch (err) {
      setBookError(err?.response?.data?.message ?? err?.message ?? 'Reservation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      setError('No restaurant selected. Please choose a restaurant first.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    getTablesByRestaurant(restaurantId)
      .then((data) => { if (!cancelled) setTables(data); })
      .catch((err)  => { if (!cancelled) setError(err?.message || 'Could not load tables.'); })
      .finally(()   => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [restaurantId]);

  /* A table is "booked" if its reservations array has at least one entry */
  const isBooked = (t) =>
    Array.isArray(t.reservations) ? t.reservations.length > 0 : false;

  const available = tables.filter((t) => !isBooked(t));
  const booked    = tables.filter((t) =>  isBooked(t));

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: C.bg, padding: '36px 16px 64px' }}>
      <style>{`
        @keyframes tr-spin { to { transform: rotate(360deg); } }
        @keyframes tr-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tr-card { transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s; animation: tr-fadeUp 0.3s ease both; }
        .tr-card.available:hover { box-shadow: 0 6px 28px rgba(230,57,70,0.14); transform: translateY(-2px); }
        .tr-book-btn {
          width: 100%; padding: 10px 0; border: none; border-radius: 10px;
          background: ${C.primary}; color: #fff;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: background-color 0.2s;
        }
        .tr-book-btn:hover { background: ${C.primaryHover}; }
        .tr-book-btn.selected { background: #166534; }
        .tr-book-btn.selected:hover { background: #14532D; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(230,57,70,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarDays size={22} color={C.primary} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, margin: 0 }}>Book a Table</h1>
              {currentRestaurant?.name && (
                <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>{currentRestaurant.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0' }}>
            <Loader2 size={36} color={C.primary} style={{ animation: 'tr-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>Loading tables…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', textAlign: 'center' }}>
            <AlertCircle size={48} color="#EF4444" />
            <p style={{ fontSize: 16, fontWeight: 600, color: C.dark, margin: 0 }}>Could not load tables</p>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{error}</p>
            {!restaurantId && (
              <button
                onClick={() => navigate('/restaurants')}
                style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: C.primary, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Browse Restaurants
              </button>
            )}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && tables.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', textAlign: 'center' }}>
            <Utensils size={52} color="#D1D5DB" />
            <p style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: 0 }}>No tables found</p>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>This restaurant has no tables configured yet.</p>
          </div>
        )}

        {/* ── Legend + Grid ── */}
        {!loading && !error && tables.length > 0 && (
          <>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
              <LegendItem color="#DCFCE7" borderColor="#86EFAC" label={`Available (${available.length})`} />
              <LegendItem color="#FEE2E2" borderColor="#FECACA" label={`Booked (${booked.length})`} />
              {selectedId && <LegendItem color="#DBEAFE" borderColor="#93C5FD" label="Your selection" />}
            </div>

            {/* Table grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {tables.map((t, i) => {
                const booked_  = isBooked(t);
                const selected = selectedId === t.id;

                const borderColor = selected ? '#3B82F6' : booked_ ? '#FECACA' : '#86EFAC';
                const bgColor     = selected ? '#DBEAFE' : booked_ ? '#FEF2F2' : '#F0FDF4';

                return (
                  <div
                    key={t.id}
                    className={`tr-card ${booked_ ? 'booked' : 'available'}`}
                    style={{
                      background: C.cardBg, borderRadius: 16,
                      border: `2px solid ${borderColor}`,
                      boxShadow: C.shadow, padding: '20px 18px',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      animationDelay: `${i * 40}ms`,
                      opacity: booked_ ? 0.82 : 1,
                    }}
                  >
                    {/* Table icon + status badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 12,
                        background: bgColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Utensils size={24} color={selected ? '#1D4ED8' : booked_ ? '#EF4444' : '#16A34A'} />
                      </div>
                      <StatusBadge booked={booked_} selected={selected} />
                    </div>

                    {/* Table info */}
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: '0 0 5px' }}>
                        Table {t.tableNumber}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted, fontSize: 13 }}>
                        <Users size={13} />
                        <span>Capacity: {t.capacity}</span>
                      </div>
                      {t.type && (
                        <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0', textTransform: 'capitalize' }}>
                          {t.type}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {booked_ ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        background: '#FEE2E2', borderRadius: 10, padding: '9px 0',
                        fontSize: 13, fontWeight: 700, color: '#EF4444',
                      }}>
                        <Ban size={13} /> Not Available
                      </div>
                    ) : (
                      <button
                        className={`tr-book-btn${selected ? ' selected' : ''}`}
                        onClick={() => setSelectedId(selected ? null : t.id)}
                      >
                        {selected ? (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} /> Selected
                          </span>
                        ) : 'Select Table'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Sticky confirm footer ── */}
            {selectedId && (
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#fff', borderTop: `1px solid ${C.border}`,
                padding: '16px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, zIndex: 50,
                boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
              }}>
                <div>
                  {(() => {
                    const t = tables.find((tb) => tb.id === selectedId);
                    return t ? (
                      <>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.dark }}>
                          Table {t.tableNumber} selected
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Capacity: {t.capacity}</p>
                      </>
                    ) : null;
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: 'none', border: `1.5px solid ${C.border}`,
                      fontSize: 14, fontWeight: 500, color: C.muted, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={openModal}
                    style={{
                      padding: '10px 28px', borderRadius: 10,
                      background: C.primary, color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230,57,70,0.28)',
                    }}
                  >
                    Confirm Booking →
                  </button>
                </div>
              </div>
            )}

            {selectedId && <div style={{ height: 80 }} />}
          </>
        )}
      </div>

      {/* ═══════════════════ BOOKING MODAL ═══════════════════ */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            ref={formRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20,
              width: '100%', maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              animation: 'tr-fadeUp 0.25s ease both',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '20px 24px 18px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(230,57,70,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CalendarDays size={18} color={C.primary} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.dark }}>
                    {bookSuccess ? 'Reservation Confirmed!' : 'Complete Your Booking'}
                  </p>
                  {(() => {
                    const t = tables.find((tb) => tb.id === selectedId);
                    return t ? (
                      <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Table {t.tableNumber} · Capacity {t.capacity}</p>
                    ) : null;
                  })()}
                </div>
              </div>
              {!submitting && (
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* ── Success state ── */}
            {bookSuccess ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#DCFCE7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 4,
                }}>
                  <PartyPopper size={30} color="#16A34A" />
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: C.dark, margin: 0 }}>Booking Successful!</p>
                <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                  Your table has been reserved. See you soon!
                </p>
                <button
                  onClick={() => { closeModal(); setSelectedId(null); }}
                  style={{
                    marginTop: 12, padding: '11px 36px', borderRadius: 10,
                    background: C.primary, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Booking form ── */
              <form onSubmit={handleBooking} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Date & time */}
                <Field label="Date &amp; Time" icon={<CalendarDays size={15} color={C.primary} />}>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    style={inputStyle}
                  />
                </Field>

                {/* Duration + Party size — 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Duration (min)" icon={<Clock size={15} color={C.primary} />}>
                    <input
                      type="number"
                      required
                      min={15}
                      max={360}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Party Size" icon={<Users size={15} color={C.primary} />}>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={partySize}
                      onChange={(e) => setPartySize(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Contact phone */}
                <Field label="Contact Phone" icon={<Phone size={15} color={C.primary} />}>
                  <input
                    type="tel"
                    required
                    placeholder="+8801712345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                {/* Notes */}
                <Field label="Notes (optional)" icon={<StickyNote size={15} color={C.primary} />}>
                  <textarea
                    placeholder="E.g. window seat preferred, allergy info…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                  />
                </Field>

                {/* Error */}
                {bookError && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: '#DC2626',
                  }}>
                    <AlertCircle size={15} />{bookError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 10,
                      background: 'none', border: `1.5px solid ${C.border}`,
                      fontSize: 14, fontWeight: 500, color: C.muted, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '11px 0', borderRadius: 10,
                      background: submitting ? '#F87171' : C.primary,
                      color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(230,57,70,0.28)',
                      transition: 'background 0.2s',
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={16} style={{ animation: 'tr-spin 0.8s linear infinite' }} /> Booking…</>
                    ) : 'Confirm Reservation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Shared input style ── */
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 10,
  border: '1.5px solid #E5E7EB',
  fontSize: 14, color: '#1F2937',
  outline: 'none', background: '#FAFAFA',
  fontFamily: 'inherit',
};

/* ── Form field wrapper ── */
const Field = ({ label, icon, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon}{label}
    </label>
    {children}
  </div>
);

/* ── Status badge ── */
const StatusBadge = ({ booked, selected }) => {
  if (selected) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>
      Selected
    </span>
  );
  if (booked) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#FEE2E2', color: '#DC2626' }}>
      Booked
    </span>
  );
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A' }}>
      Available
    </span>
  );
};

/* ── Legend item ── */
const LegendItem = ({ color, borderColor, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <div style={{ width: 16, height: 16, borderRadius: 4, background: color, border: `1.5px solid ${borderColor}`, flexShrink: 0 }} />
    <span style={{ fontSize: 13, color: '#4B5563', fontWeight: 500 }}>{label}</span>
  </div>
);

export default TableReservationPage;
