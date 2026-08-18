import fmt from '../utils/fmt';

/**
 * Step 6 — Confirmation
 * Shows the booking reference and final summary.
 */
export default function StepConfirmation({ booking, onStartOver }) {
  if (!booking) return null;

  return (
    <div>
      <div className="confirm-hero">
        <div className="confirm-icon" role="img" aria-label="Confirmed">🎉</div>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '.25rem' }}>
          Your booking is confirmed!
        </p>
        <div className="confirm-ref" aria-label="Booking reference">{booking.bookingReference}</div>
        <div className="confirm-total">{fmt(booking.finalTotal)}</div>
        <p style={{ color: 'var(--muted)', fontSize: '.8rem', marginTop: '.5rem' }}>
          Confirmed on {new Date(booking.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="confirm-summary">
        <div className="confirm-row">
          <span className="lbl">Cruise Line</span>
          <span className="val">{booking.cruise.line}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Ship</span>
          <span className="val">{booking.cruise.name}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Destination</span>
          <span className="val">{booking.cruise.destination}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Duration</span>
          <span className="val">{booking.cruise.durationNights} nights</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Passengers</span>
          <span className="val">
            {booking.passengerCounts.adults} adult{booking.passengerCounts.adults !== 1 ? 's' : ''}
            {booking.passengerCounts.children > 0
              ? `, ${booking.passengerCounts.children} child${booking.passengerCounts.children !== 1 ? 'ren' : ''}`
              : ''}
          </span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Guest Name</span>
          <span className="val">{booking.customer.name}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Email</span>
          <span className="val">{booking.customer.email}</span>
        </div>
        {booking.appliedPromotionalCode && (
          <div className="confirm-row">
            <span className="lbl">Promo Applied</span>
            <span className="val">{booking.appliedPromotionalCode.code}</span>
          </div>
        )}
        <div className="confirm-row">
          <span className="lbl">Amount Charged</span>
          <span className="val" style={{ color: 'var(--primary)', fontWeight: 800 }}>
            {fmt(booking.finalTotal)}
          </span>
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: '2rem', justifyContent: 'center' }}>
        <button
          id="start-over-btn"
          className="btn btn-outline"
          onClick={onStartOver}
        >
          Book Another Cruise
        </button>
      </div>
    </div>
  );
}
