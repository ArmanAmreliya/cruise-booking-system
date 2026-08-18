import { Shield, Wifi, Compass, Check } from 'lucide-react';
import fmt from '../utils/fmt';

export default function StepServices({ services, selected, onToggle, cruise }) {
  const nights = cruise?.durationNights ?? 1;

  // Render proper icon matching each service definition
  const renderServiceIcon = (id) => {
    switch (id) {
      case 'SVC-001':
        return <Shield size={24} />;
      case 'SVC-002':
        return <Wifi size={24} />;
      case 'SVC-003':
        return <Compass size={24} />;
      default:
        return <Shield size={24} />;
    }
  };

  return (
    <div className="service-list">
      {services.map((svc) => {
        const isSelected = selected.includes(svc.id);

        const priceLabel =
          svc.billingModel === 'per_passenger_per_night'
            ? `${fmt(svc.price)} / guest / night`
            : svc.billingModel === 'per_passenger'
            ? `${fmt(svc.price)} / guest`
            : `${fmt(svc.price)} / booking`;

        return (
          <div
            key={svc.id}
            id={`service-${svc.id}`}
            className={`service-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggle(svc.id)}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onToggle(svc.id)}
          >
            {/* Service Check Box Indicator */}
            <div className="service-check-box">
              {isSelected && <Check size={14} strokeWidth={3} />}
            </div>

            {/* Service Illustration Icon */}
            <div style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', marginRight: '1.25rem' }}>
              {renderServiceIcon(svc.id)}
            </div>

            {/* Service Descriptive Info */}
            <div className="service-info">
              <div className="service-name-text">{svc.name}</div>
              <div className="service-desc-text">{svc.description}</div>
            </div>

            {/* Service Pricing Breakdown */}
            <div className="service-price-value">{priceLabel}</div>
          </div>
        );
      })}

      {services.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No optional services available.</p>
      )}
    </div>
  );
}
