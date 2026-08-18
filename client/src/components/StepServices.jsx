import fmt from '../utils/fmt';

/**
 * Step 3 — Optional Services
 */
export default function StepServices({ services, selected, onToggle, cruise }) {
  const nights = cruise?.durationNights ?? 1;

  const servicePrice = (svc, passengerCount = 1) => {
    if (svc.billingModel === 'per_passenger') return svc.price * passengerCount;
    if (svc.billingModel === 'per_passenger_per_night') return svc.price * passengerCount * nights;
    return svc.price; // per_booking
  };

  return (
    <div className="service-list">
      {services.map((svc) => {
        const isSelected = selected.includes(svc.id);

        const priceLabel =
          svc.billingModel === 'per_passenger_per_night'
            ? `${fmt(svc.price)}/passenger/night`
            : svc.billingModel === 'per_passenger'
            ? `${fmt(svc.price)}/passenger`
            : `${fmt(svc.price)}/booking`;

        return (
          <div
            key={svc.id}
            id={`service-${svc.id}`}
            className={`service-item${isSelected ? ' selected' : ''}`}
            onClick={() => onToggle(svc.id)}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onToggle(svc.id)}
          >
            <div className="service-check">{isSelected ? '✓' : ''}</div>
            <div className="service-info">
              <div className="service-name">{svc.name}</div>
              <div className="service-desc">{svc.description}</div>
            </div>
            <div className="service-price">{priceLabel}</div>
          </div>
        );
      })}

      {services.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>No services available.</p>
      )}
    </div>
  );
}
