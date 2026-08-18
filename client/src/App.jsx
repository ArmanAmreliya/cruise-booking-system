import { useState, useEffect, useMemo } from 'react';
import {
  Ship,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Users,
  Shield,
  Gift,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import './booking.css';

// Services and storage are now fully handled by the Express/MySQL backend.


import StepCruise from './components/StepCruise.jsx';
import StepTravellers from './components/StepTravellers.jsx';
import StepServices from './components/StepServices.jsx';
import StepPromotion from './components/StepPromotion.jsx';
import StepReview from './components/StepReview.jsx';
import StepConfirmation from './components/StepConfirmation.jsx';

// Initialise local-storage seed data once
// No localStorage initialization needed


const TODAY = new Date().toISOString().split('T')[0];

const STEPS = [
  { id: 1, label: 'Cruise', icon: Ship },
  { id: 2, label: 'Travellers', icon: Users },
  { id: 3, label: 'Services', icon: Shield },
  { id: 4, label: 'Promo', icon: Gift },
  { id: 5, label: 'Review', icon: FileText },
  { id: 6, label: 'Done', icon: CheckCircle2 },
];

export default function App() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Booking State
  const [cruise, setCruise] = useState(null);
  const [customer, setCustomer] = useState({ id: 'CUST-ARMAN', name: 'Arman', email: 'arman@example.com', phone: '+91-9999-0001' });
  const [adults, setAdults] = useState(1);
  const [childAges, setChildAges] = useState([]);
  const [serviceIds, setServiceIds] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Static data from localStorage
  const [cruises, setCruises] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [cruisesRes, servicesRes] = await Promise.all([
          fetch('/api/cruises'),
          fetch('/api/services')
        ]);
        const cruisesData = await cruisesRes.json();
        const servicesData = await servicesRes.json();
        setCruises(cruisesData);
        setServices(servicesData);
      } catch (err) {
        console.error('Failed to load cruises/services:', err);
        setError('Connection failure: Unable to fetch voyages or service pricing rules.');
      }
    };
    loadStaticData();
  }, []);

  // Passenger list for pricing engine
  const passengers = useMemo(() => {
    const adultPassengers = Array.from({ length: adults }, () => ({ age: 30 }));
    const childPassengers = childAges.map((a) => ({ age: a === '' ? NaN : Number(a) }));
    return [...adultPassengers, ...childPassengers];
  }, [adults, childAges]);

  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    if (!cruise || passengers.length === 0) {
      setBreakdown(null);
      return;
    }
    const validAges = passengers.every(
      (p) => Number.isInteger(p.age) && p.age >= 0
    );
    if (!validAges) {
      setBreakdown(null);
      return;
    }

    let active = true;
    const fetchQuote = async () => {
      try {
        const res = await fetch('/api/bookings/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cruiseId: cruise.id,
            passengers,
            selectedOptionalServiceIds: serviceIds,
            promoCode,
            customerId: customer.id || null,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch quote');
        }
        const data = await res.json();
        if (active) {
          setBreakdown(data);
          setError('');
        }
      } catch (err) {
        if (active) {
          setBreakdown(null);
          // Don't show validation errors as banner alerts during typing, just log them
          console.warn('Quote calculation error:', err.message);
        }
      }
    };

    fetchQuote();
    return () => {
      active = false;
    };
  }, [cruise, passengers, serviceIds, promoCode, customer.id]);

  // Toggle service selection
  const toggleService = (id) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Navigation validation
  const canAdvance = () => {
    setError('');
    if (step === 1) {
      if (!cruise) {
        setError('Please select a cruise itinerary to continue.');
        return false;
      }
    }
    if (step === 2) {
      if (!customer.name.trim()) {
        setError('Please enter your full name.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
      if (adults < 1) {
        setError('At least one adult passenger is required.');
        return false;
      }
      const badAgeIndex = childAges.findIndex(
        (a) => a === '' || isNaN(a) || Number(a) < 0 || Number(a) > 17
      );
      if (badAgeIndex !== -1) {
        setError(`Please specify a valid age (0-17) for Child ${badAgeIndex + 1}.`);
        return false;
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

  // Confirm booking
  const handleConfirm = async () => {
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          cruiseId: cruise.id,
          passengers,
          selectedOptionalServiceIds: serviceIds,
          promoCode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Booking confirmation failed.');
      }

      const booking = await res.json();
      setConfirmedBooking(booking);
      setStep(6);
    } catch (e) {
      setError(e.message);
    }
  };

  // Start over
  const handleStartOver = async () => {
    // Reload cruises so seat counts are fresh in real-time
    try {
      const res = await fetch('/api/cruises');
      const data = await res.json();
      setCruises(data);
    } catch (err) {
      console.error('Failed to reload cruises:', err);
    }
    setCruise(null);
    setCustomer({ id: 'CUST-ARMAN', name: 'Arman', email: 'arman@example.com', phone: '+91-9999-0001' });
    setAdults(1);
    setChildAges([]);
    setServiceIds([]);
    setPromoCode('');
    setConfirmedBooking(null);
    setError('');
    setStep(1);
  };

  // Render Step Title Icon
  const getStepIcon = (currentStep) => {
    const matched = STEPS.find((s) => s.id === currentStep);
    if (!matched) return null;
    const IconComponent = matched.icon;
    return <IconComponent size={22} />;
  };

  const stepTitles = [
    'Select Your Cruise',
    'Traveller Details',
    'Optional Services & Amenities',
    'Apply Promotional Discount',
    'Review Quotation Details',
    'Booking Confirmed',
  ];

  return (
    <div className="booking-app">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <Ship size={18} />
          <span>Cruise Booking System</span>
        </div>
        <h1>Book Your Voyage</h1>
        <p>Explore luxury cruise liners, configure your travel party, and confirm booking instantly.</p>
      </header>

      {/* Stepper with Progress Dividers */}
      <nav className="stepper" aria-label="Booking steps">
        {STEPS.map((s, index) => {
          const isActive = step === s.id && step < 6;
          const isDone = step > s.id;
          const isDoneFinal = s.id === 6 && step === 6;
          const isFuture = step < s.id;

          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexGrow: index < STEPS.length - 1 ? 1 : 0 }}>
              <div
                className={[
                  'step-pill',
                  isActive ? 'active' : '',
                  isDone ? 'done' : '',
                  isFuture ? 'disabled' : '',
                  isDoneFinal ? 'active' : '',
                ].join(' ')}
              >
                <span className="step-num">
                  {isDone && s.id < 6 ? <Check size={12} strokeWidth={3} /> : s.id}
                </span>
                <span className="step-label">{s.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={[
                    'step-divider',
                    isDone ? 'done' : '',
                    isActive ? 'active' : '',
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-err" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="card">
        <div className="card-title">
          {getStepIcon(step)}
          <span>{stepTitles[step - 1]}</span>
        </div>

        {step === 1 && (
          <StepCruise
            cruises={cruises}
            selected={cruise}
            onSelect={(c) => {
              setCruise(c);
              setError('');
            }}
          />
        )}

        {step === 2 && (
          <StepTravellers
            customer={customer}
            setCustomer={setCustomer}
            adults={adults}
            setAdults={setAdults}
            childAges={childAges}
            setChildAges={setChildAges}
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

        {step === 5 && <StepReview breakdown={breakdown} />}

        {step === 6 && <StepConfirmation booking={confirmedBooking} onStartOver={handleStartOver} />}
      </div>

      {/* Stepper Navigation Buttons */}
      {step < 6 && (
        <div className="navigation-bar">
          {step > 1 ? (
            <button id="back-btn" className="btn btn-outline" onClick={goBack} type="button">
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <span />
          )}

          {step < 5 && (
            <button id="next-btn" className="btn btn-primary" onClick={goNext} type="button">
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          )}

          {step === 5 && (
            <button
              id="confirm-btn"
              className="btn btn-success"
              onClick={handleConfirm}
              disabled={!breakdown}
              type="button"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Confirm & Lock Booking</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
