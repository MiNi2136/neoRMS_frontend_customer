/* 
   TableReservationPage  /reservations

   Fetches all tables for the current restaurant.

   Availability is TIME-AWARE:
     A table is "blocked" only when the user's desired window
     [scheduledFor, scheduledFor + duration] overlaps with an
     existing reservation's window [r.scheduledFor, r.scheduledFor + r.duration].

   Overlap condition:
     desiredStart < resEnd  &&  desiredEnd > resStart

   If no date/time is selected yet, all tables are shown as
   "potentially available" with their existing reservation slots
   listed so the user can pick a non-conflicting time.
    */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, CalendarDays,
  Users, CheckCircle2, Ban, Utensils,
  Phone, Clock, StickyNote, X, PartyPopper, Info,
} from 'lucide-react';
import { getTablesByRestaurant, reserveTable } from '../services/tableService';
import { useRestaurant } from '../context/RestaurantContext';

/*  Theme  */
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

/* 
   Helpers
    */

/**
 * Returns true if [desiredStart, desiredStart + durationMin) overlaps
 * with any active reservation on the table.
 */
const isBookedAtTime = (table, desiredStart, durationMin) => {
  if (!desiredStart || !durationMin) return false;
  const ds = new Date(desiredStart).getTime();
  const de = ds + Number(durationMin) * 60_000;

  return (table.reservations ?? []).some((r) => {
    if (!r.scheduledFor || !r.duration) return false;
    if (r.status === 'CANCELLED' || r.status === 'REJECTED') return false;
    const rs = new Date(r.scheduledFor).getTime();
    const re = rs + Number(r.duration) * 60_000;
    return ds < re && de > rs; // classic interval-overlap test
  });
};

/** "Mar 17, 6:50 PM" */
const fmtDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

/** "Mar 17  6:50 PM  8:20 PM" */
const fmtRange = (r) => {
  if (!r?.scheduledFor || !r?.duration) return '';
  const start = new Date(r.scheduledFor);
  const end   = new Date(start.getTime() + Number(r.duration) * 60_000);
  const tOpts = { hour: 'numeric', minute: '2-digit' };
  const date  = start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  return `${date}  ${start.toLocaleTimeString('en-US', tOpts)}  ${end.toLocaleTimeString('en-US', tOpts)}`;
};

/** Minimum datetime-local string (now, rounded to minute) */
const nowLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/* 
   Component
    */

const TableReservationPage = () => {
  const navigate = useNavigate();
  const { currentRestaurant } = useRestaurant();
  const restaurantId = currentRestaurant?.id ?? currentRestaurant?._id ?? null;

  const [tables,     setTables    ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  /*  Top-panel search criteria  */
  const [filterDate,     setFilterDate    ] = useState('');
  const [filterDuration, setFilterDuration] = useState(90);
  const [filterParty,    setFilterParty   ] = useState(2);

  /*  Booking modal  */
  const [showModal,   setShowModal  ] = useState(false);
  const [submitting,  setSubmitting ] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookError,   setBookError  ] = useState('');

  /*  Extra form fields  */
  const [notes,        setNotes       ] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  /*  Accordion open state per table id  */
  const [openSlots, setOpenSlots] = useState({});
  const toggleSlots = (id) => setOpenSlots((prev) => ({ ...prev, [id]: !prev[id] }));

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
        scheduledFor: new Date(filterDate).toISOString(),
        duration:     Number(filterDuration),
        partySize:    Number(filterParty),
        notes:        notes.trim(),
        contactPhone: contactPhone.trim(),
      });
      setBookSuccess(true);
    } catch (err) {
      setBookError(
        err?.response?.data?.message ?? err?.message ?? 'Reservation failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*  Fetch tables  */
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

  /*  Derived availability  */
  const timeChosen = Boolean(filterDate);

  const classifyTable = (t) => {
    if (!timeChosen) return 'unknown';
    return isBookedAtTime(t, filterDate, filterDuration) ? 'booked' : 'available';
  };

  /* Tables that can seat the requested party — always applied */
  const suitableTables = tables.filter((t) => t.capacity >= Number(filterParty));

  const countAvailable = suitableTables.filter((t) => !isBookedAtTime(t, filterDate, filterDuration)).length;
  const countBooked    = suitableTables.filter((t) =>  isBookedAtTime(t, filterDate, filterDuration)).length;

  /*  Deselect table if it conflicts with updated criteria  */
  useEffect(() => {
    if (selectedId && timeChosen) {
      const t = tables.find((tb) => tb.id === selectedId);
      if (t && isBookedAtTime(t, filterDate, filterDuration)) setSelectedId(null);
    }
  }, [filterDate, filterDuration, tables]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 
     Render
      */
  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: C.bg, padding: '36px 16px 64px' }}>
      <style>{`
        @keyframes tr-spin { to { transform: rotate(360deg); } }
        @keyframes tr-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tr-card { transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s; animation: tr-fadeUp 0.3s ease both; }
        .tr-card.card-available:hover { box-shadow: 0 6px 28px rgba(230,57,70,0.14); transform: translateY(-2px); }
        .tr-book-btn {
          width: 100%; padding: 10px 0; border: none; border-radius: 10px;
          background: ${C.primary}; color: #fff;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: background-color 0.2s;
        }
        .tr-book-btn:hover { background: ${C.primaryHover}; }
        .tr-book-btn.selected { background: #166534; }
        .tr-book-btn.selected:hover { background: #14532D; }
        .tr-input {
          width: 100%; box-sizing: border-box;
          padding: 9px 12px; border-radius: 10px;
          border: 1.5px solid #E5E7EB;
          font-size: 14px; color: #1F2937;
          outline: none; background: #fff;
          font-family: inherit;
        }
        .tr-input:focus { border-color: ${C.primary}; }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/*  Page header  */}
        <div style={{ marginBottom: 28 }}>
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

        {/*  Search / filter panel  */}
        <div style={{
          background: C.cardBg, borderRadius: 16,
          border: `1.5px solid ${C.border}`,
          boxShadow: C.shadow,
          padding: '20px 24px',
          marginBottom: 28,
        }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.dark, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={C.primary} /> Pick a date &amp; time to see availability
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={labelStyle}>Date &amp; Time</label>
              <input
                type="datetime-local"
                className="tr-input"
                value={filterDate}
                min={nowLocal()}
                onChange={(e) => { setFilterDate(e.target.value); setSelectedId(null); }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={labelStyle}>Duration (min)</label>
              <input
                type="number"
                className="tr-input"
                min={15} max={360} step={15}
                value={filterDuration}
                onChange={(e) => { setFilterDuration(e.target.value); setSelectedId(null); }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={labelStyle}>Guests</label>
              <input
                type="number"
                className="tr-input"
                min={1} max={20}
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
              />
            </div>
          </div>

          {!timeChosen && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              marginTop: 14,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: 8, padding: '9px 12px',
              fontSize: 12, color: '#92400E',
            }}>
              <Info size={13} /> Select a date &amp; time above to see which tables are available.
            </div>
          )}
        </div>

        {/*  Loading  */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0' }}>
            <Loader2 size={36} color={C.primary} style={{ animation: 'tr-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>Loading tables</p>
          </div>
        )}

        {/*  Error  */}
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

        {/*  Empty  */}
        {!loading && !error && tables.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', textAlign: 'center' }}>
            <Utensils size={52} color="#D1D5DB" />
            <p style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: 0 }}>No tables found</p>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>This restaurant has no tables configured yet.</p>
          </div>
        )}

        {/*  No tables fit party size  */}
        {!loading && !error && tables.length > 0 && suitableTables.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', textAlign: 'center' }}>
            <Users size={48} color="#D1D5DB" />
            <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>No tables for {filterParty} guests</p>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Try reducing your party size — the largest table seats {Math.max(...tables.map((t) => t.capacity))}.</p>
          </div>
        )}

        {/*  Legend + Grid  */}
        {!loading && !error && suitableTables.length > 0 && (
          <>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {timeChosen ? (
                <>
                  <LegendItem color="#DCFCE7" borderColor="#86EFAC" label={`Available (${countAvailable})`} />
                  <LegendItem color="#FEE2E2" borderColor="#FECACA" label={`Unavailable at this time (${countBooked})`} />
                  {selectedId && <LegendItem color="#DBEAFE" borderColor="#93C5FD" label="Your selection" />}
                </>
              ) : (
                <LegendItem color="#F3F4F6" borderColor="#D1D5DB" label={`${suitableTables.length} table${suitableTables.length !== 1 ? 's' : ''} fit${suitableTables.length === 1 ? 's' : ''} your party — pick a date & time above`} />
              )}
            </div>

            {/* Table grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {suitableTables.map((t, i) => {
                const status   = classifyTable(t);
                const isBooked_ = status === 'booked';
                const selected  = selectedId === t.id;

                const borderColor = selected
                  ? '#3B82F6'
                  : isBooked_ ? '#FECACA'
                  : timeChosen ? '#86EFAC' : C.border;

                const bgColor = selected
                  ? '#DBEAFE'
                  : isBooked_ ? '#FEF2F2'
                  : timeChosen ? '#F0FDF4' : '#F9FAFB';

                const now = Date.now();
                const activeReservations = (t.reservations ?? []).filter(
                  (r) =>
                    r.status !== 'CANCELLED' && r.status !== 'REJECTED' &&
                    r.scheduledFor && r.duration &&
                    // exclude reservations whose end time is already in the past
                    (new Date(r.scheduledFor).getTime() + Number(r.duration) * 60_000) > now
                );

                return (
                  <div
                    key={t.id}
                    className={`tr-card ${isBooked_ ? 'card-booked' : 'card-available'}`}
                    style={{
                      background: C.cardBg, borderRadius: 16,
                      border: `2px solid ${borderColor}`,
                      boxShadow: C.shadow, padding: '20px 18px',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      animationDelay: `${i * 40}ms`,
                      opacity: isBooked_ ? 0.82 : 1,
                    }}
                  >
                    {/* Icon + badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 12, background: bgColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Utensils size={24} color={selected ? '#1D4ED8' : isBooked_ ? '#EF4444' : timeChosen ? '#16A34A' : C.muted} />
                      </div>
                      <StatusBadge status={status} selected={selected} />
                    </div>

                    {/* Table info */}
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: '0 0 4px' }}>
                        Table {t.tableNumber}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted, fontSize: 13 }}>
                        <Users size={13} /><span>Capacity: {t.capacity}</span>
                      </div>
                      {t.type && (
                        <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0', textTransform: 'capitalize' }}>{t.type}</p>
                      )}
                    </div>

                    {/* Reservation slots — accordion (always shown) */}
                    <div style={{
                        border: `1px solid ${C.border}`,
                        borderRadius: 9, overflow: 'hidden',
                      }}>
                        {/* Accordion trigger */}
                        <button
                          type="button"
                          onClick={() => toggleSlots(t.id)}
                          style={{
                            width: '100%', background: '#FAFAFA',
                            border: 'none', padding: '7px 10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Booked slots ({activeReservations.length})
                          </span>
                          <span style={{
                            fontSize: 11, color: C.muted,
                            transform: openSlots[t.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            display: 'inline-block',
                          }}>▾</span>
                        </button>
                        {/* Accordion body */}
                        {openSlots[t.id] && (
                          <div style={{
                            background: '#fff',
                            borderTop: `1px solid ${C.border}`,
                            padding: '8px 10px',
                            display: 'flex', flexDirection: 'column', gap: 5,
                          }}>
                            {activeReservations.length === 0 ? (
                              <p style={{ margin: 0, fontSize: 11, color: C.muted, fontStyle: 'italic' }}>No upcoming bookings.</p>
                            ) : activeReservations.map((r) => (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <div style={{
                                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                                  background: r.status === 'CONFIRMED' ? '#16A34A' : '#F59E0B',
                                }} />
                                <span style={{ fontSize: 11, color: C.dark, lineHeight: 1.5 }}>
                                  {fmtRange(r)}
                                  <span style={{ color: C.muted }}>{'  '}{r.duration} min</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    {/* Action button */}
                    {isBooked_ ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        background: '#FEE2E2', borderRadius: 10, padding: '9px 0',
                        fontSize: 13, fontWeight: 700, color: '#EF4444',
                      }}>
                        <Ban size={13} /> Unavailable at this time
                      </div>
                    ) : (
                      <button
                        className={`tr-book-btn${selected ? ' selected' : ''}`}
                        onClick={() => {
                          if (!timeChosen) {
                            document.querySelector('.tr-input')?.focus();
                            return;
                          }
                          setSelectedId(selected ? null : t.id);
                        }}
                        title={!timeChosen ? 'Select a date & time first' : undefined}
                      >
                        {selected ? (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} /> Selected
                          </span>
                        ) : timeChosen ? 'Select Table' : 'Pick a time first'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/*  Sticky confirm footer  */}
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
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.dark }}>Table {t.tableNumber} selected</p>
                        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                          {fmtDateTime(filterDate)}  {filterDuration} min  {filterParty} guest{filterParty > 1 ? 's' : ''}
                        </p>
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
                  >Cancel</button>
                  <button
                    onClick={openModal}
                    style={{
                      padding: '10px 28px', borderRadius: 10,
                      background: C.primary, color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(230,57,70,0.28)',
                    }}
                  >Confirm Booking </button>
                </div>
              </div>
            )}
            {selectedId && <div style={{ height: 80 }} />}
          </>
        )}
      </div>

      {/*  BOOKING MODAL  */}
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
              width: '100%', maxWidth: 480,
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
                      <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                        Table {t.tableNumber}  Capacity {t.capacity}
                      </p>
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

            {/* Success state */}
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
                <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Your table has been reserved. See you soon!</p>
                <button
                  onClick={() => { closeModal(); setSelectedId(null); }}
                  style={{
                    marginTop: 12, padding: '11px 36px', borderRadius: 10,
                    background: C.primary, color: '#fff', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >Done</button>
              </div>
            ) : (
              /* Booking form */
              <form onSubmit={handleBooking} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Read-only summary */}
                <div style={{
                  background: '#F0FDF4', border: '1.5px solid #86EFAC',
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#166534' }}>Reservation details</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, color: C.dark }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarDays size={12} color={C.muted} />{fmtDateTime(filterDate)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color={C.muted} />{filterDuration} min
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} color={C.muted} />{filterParty} guest{filterParty > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Contact phone */}
                <ModalField label="Contact Phone" icon={<Phone size={15} color={C.primary} />}>
                  <input
                    type="tel"
                    required
                    placeholder="+8801712345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={modalInputStyle}
                  />
                </ModalField>

                {/* Notes */}
                <ModalField label="Notes (optional)" icon={<StickyNote size={15} color={C.primary} />}>
                  <textarea
                    placeholder="E.g. window seat preferred, allergy info"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{ ...modalInputStyle, resize: 'vertical', minHeight: 72 }}
                  />
                </ModalField>

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
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '11px 0', borderRadius: 10,
                      background: submitting ? '#F87171' : C.primary,
                      color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(230,57,70,0.28)',
                      transition: 'background 0.2s',
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={16} style={{ animation: 'tr-spin 0.8s linear infinite' }} /> Booking</>
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

/*  Styles  */
const modalInputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 10,
  border: '1.5px solid #E5E7EB',
  fontSize: 14, color: '#1F2937',
  outline: 'none', background: '#FAFAFA',
  fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: 12, fontWeight: 700, color: '#4B5563',
};

/*  Modal form field wrapper  */
const ModalField = ({ label, icon, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon}{label}
    </label>
    {children}
  </div>
);

/*  Status badge  */
const StatusBadge = ({ status, selected }) => {
  if (selected) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#DBEAFE', color: '#1D4ED8' }}>Selected</span>
  );
  if (status === 'booked') return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#FEE2E2', color: '#DC2626' }}>Booked</span>
  );
  if (status === 'available') return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A' }}>Available</span>
  );
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280' }}>Select time</span>
  );
};

/*  Legend item  */
const LegendItem = ({ color, borderColor, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <div style={{ width: 16, height: 16, borderRadius: 4, background: color, border: `1.5px solid ${borderColor}`, flexShrink: 0 }} />
    <span style={{ fontSize: 13, color: '#4B5563', fontWeight: 500 }}>{label}</span>
  </div>
);

export default TableReservationPage;
