import { useState, useEffect, useMemo } from 'react';
import './booking.css';

import { initLocalStorage, cruiseRepository, optionalServiceRepository } from './storage';
import { calculatePriceBreakdown } from './services/pricingService';
import { confirmBooking }          from './services/bookingService';

import StepCruise        from './components/StepCruise.jsx';
import StepTravellers    from './components/StepTravellers.jsx';
import StepServices      from './components/StepServices.jsx';
import StepPromotion     from './components/StepPromotion.jsx';
import StepReview        from './components/StepReview.jsx';
import StepConfirmation  from './components/StepConfirmation.jsx';

// ── Initialise local-storage seed data once ──────────────────────────────────
initLocalStorage(false);

const TODAY = new Date().toISOString().split('T')[0];

const STEPS = [
  { id: 1, label: 'Cruise' },
  { id: 2, label: 'Travellers' },
  { id: 3, label: 'Services' },
  { id: 4, label: 'Promo' },
  { id: 5, label: 'Review' },
  { id: 6, label: 'Done' },
];

export default function App() {
  const [step, setStep]       = useState(1);
  const [error, setError]     = useState('');

  // ── Booking State ──────────────────────────────────────────────────────────
  const [cruise,      setCruise]      = useState(null);
  const [customer,    setCustomer]    = useState({ name: '', email: '', phone: '' });
  const [adults,      setAdults]      = useState(1);
  const [childAges,   setChildAges]   = useState([]);
  const [serviceIds,  setServiceIds]  = useState([]);
  const [promoCode,   setPromoCode]   = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // ── Static data from localStorage ─────────────────────────────────────────
  const [cruises,  setCruises]  = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    setCruises(cruiseRepository.getAll());
    setServices(optionalServiceRepository.getAll());
  }, []);

  // ── Passenger list for pricing engine ─────────────────────────────────────
  const passengers = useMemo(() => {
    const adultPassengers = Array.from({ length: adults }, () => ({ age: 30 }));
    const childPassengers = childAges.map((a) => ({ age: Number(a) }));
    return [...adultPassengers, ...childPassengers];
  }, [adults, childAges]);

  // ── Live price breakdown (computed whenever inputs change) ─────────────────
  const breakdown = useMemo(() => {
    if (!cruise || passengers.length === 0) return null;
    const validAges = passengers.every(
      (p) => Number.isInteger(p.age) && p.age >= 0
    );
    if (!validAges) return null;
    try {
      return calculatePriceBreakdown({
        cruise,
        passengers,
        selectedOptionalServiceIds: serviceIds,
        promoCode,
        currentDate: TODAY,
      });
    } catch {
      return null;
    }
  }, [cruise, passengers, serviceIds, promoCode]);

  // ── Toggle service selection ───────────────────────────────────────────────
  const toggleService = (id) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ── Navigation ────────────────────────────────────────────────────────────
  const canAdvance = () => {
    setError('');
    if (step === 1) {
      if (!cruise) { setError('Please select a cruise to continue.'); return false; }
    }
    if (step === 2) {
      if (!customer.name.trim()) { setError('Please enter your full name.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        setError('Please enter a valid email address.'); return false;
      }
      if (adults < 1) { setError('At least one adult is required.'); return false; }
      const badAge = childAges.findIndex((a) => a === '' || isNaN(a) || Number(a) < 0 || Number(a) > 17);
      if (badAge !== -1) {
        setError(`Please enter a valid age (0–17) for child ${badAge + 1}.`); return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (canAdvance()) setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Confirm booking ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    setError('');
    try {
      const booking = confirmBooking({
        customer,
        cruise,
        passengers,
        selectedOptionalServiceIds: serviceIds,
        promoCode,
        currentDate: TODAY,
      });
      setConfirmedBooking(booking);
      setStep(6);
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Start over ─────────────────────────────────────────────────────────────
  const handleStartOver = () => {
    // Reload cruise data so seat counts are fresh
    setCruises(cruiseRepository.getAll());
    setCruise(null);
    setCustomer({ name: '', email: '', phone: '' });
    setAdults(1);
    setChildAges([]);
    setServiceIds([]);
    setPromoCode('');
    setConfirmedBooking(null);
    setError('');
    setStep(1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const stepTitles = ['Select a Cruise', 'Travellers', 'Optional Services',
    'Promotional Code', 'Review & Price', 'Booking Confirmed'];

  return (
    <div className="booking-app">
      {/* ── App Header ── */}
      <header className="app-header">
        <div className="brand">🚢 Cruise Booking System</div>
        <h1>Book Your Cruise</h1>
        <p>Find your perfect voyage and confirm in minutes</p>
      </header>

      {/* ── Stepper ── */}
      <nav className="stepper" aria-label="Booking steps">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={[
              'step-pill',
              step === s.id && step < 6 ? 'active' : '',
              step > s.id ? 'done' : '',
              step < s.id ? 'disabled' : '',
              s.id === 6 && step === 6 ? 'active' : '',
            ].join(' ')}
            aria-current={step === s.id ? 'step' : undefined}
          >
            <span className="step-num">{step > s.id && s.id < 6 ? '✓' : s.id}</span>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </nav>

      {/* ── Error Banner ── */}
      {error && (
        <div className="alert alert-err" role="alert">{error}</div>
      )}

      {/* ── Step Content ── */}
      <div className="card">
        <div className="card-title">{stepTitles[step - 1]}</div>

        {step === 1 && (
          <StepCruise cruises={cruises} selected={cruise} onSelect={(c) => {
            setCruise(c); setError('');
          }} />
        )}

        {step === 2 && (
          <StepTravellers
            customer={customer} setCustomer={setCustomer}
            adults={adults} setAdults={setAdults}
            childAges={childAges} setChildAges={setChildAges}
          />
        )}

        {step === 3 && (
          <StepServices
            services={services}
            selected={serviceIds}
            onToggle={toggleService}
            cruise={cruise}
          />
        )}

        {step === 4 && (
          <StepPromotion
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            subtotal={breakdown?.preDiscountSubtotalCents ?? 0}
            currentDate={TODAY}
          />
        )}

        {step === 5 && (
          <StepReview breakdown={breakdown} />
        )}

        {step === 6 && (
          <StepConfirmation booking={confirmedBooking} onStartOver={handleStartOver} />
        )}
      </div>

      {/* ── Navigation Buttons ── */}
      {step < 6 && (
        <div className="btn-row">
          {step > 1 ? (
            <button id="back-btn" className="btn btn-outline" onClick={goBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < 5 && (
            <button id="next-btn" className="btn btn-primary" onClick={goNext}>
              Next →
            </button>
          )}

          {step === 5 && (
            <button
              id="confirm-btn"
              className="btn btn-success"
              onClick={handleConfirm}
              disabled={!breakdown}
            >
              ✓ Confirm Booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}
