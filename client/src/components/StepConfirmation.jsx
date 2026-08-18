import { Check } from 'lucide-react';
import fmt from '../utils/fmt';

export default function StepConfirmation({ booking, onStartOver }) {
  if (!booking) return null;

  return (
    <div>
      <div className="confirm-banner">
        <div className="confirm-success-icon">
          <Check size={36} strokeWidth={3} />
        </div>
        <h2>Booking Confirmed</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Thank you! Your booking request has been successfully processed and confirmed.
        </p>

        <div className="confirm-ref-box">
          <div className="confirm-ref-label">Booking Reference</div>
          <div className="confirm-ref-value">{booking.bookingReference}</div>
        </div>
      </div>

      <div className="confirm-grid">
        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Cruise Line</div>
          <div className="confirm-detail-value">{booking.cruise.line}</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Ship / Vessel</div>
          <div className="confirm-detail-value">{booking.cruise.name}</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Destination</div>
          <div className="confirm-detail-value">{booking.cruise.destination}</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Sailing Duration</div>
          <div className="confirm-detail-value">{booking.cruise.durationNights} Nights</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Primary Guest</div>
          <div className="confirm-detail-value">{booking.customer.name}</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Contact Email</div>
          <div className="confirm-detail-value">{booking.customer.email}</div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Travelling Party</div>
          <div className="confirm-detail-value">
            {booking.passengerCounts.adults} Adult{booking.passengerCounts.adults !== 1 ? 's' : ''}
            {booking.passengerCounts.children > 0
              ? `, ${booking.passengerCounts.children} Child${booking.passengerCounts.children !== 1 ? 'ren' : ''}`
              : ''}
          </div>
        </div>

        <div className="confirm-detail-item">
          <div className="confirm-detail-label">Total Amount Charged</div>
          <div className="confirm-detail-value" style={{ color: 'var(--success)' }}>
            {fmt(booking.finalTotal)}
          </div>
        </div>
      </div>

      <div className="navigation-bar" style={{ justifyContent: 'center', marginTop: '2.5rem' }}>
        <button
          id="start-over-btn"
          className="btn btn-outline"
          onClick={onStartOver}
          type="button"
        >
          Book Another Voyage
        </button>
      </div>
    </div>
  );
}
