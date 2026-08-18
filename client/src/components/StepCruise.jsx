import { Anchor, Calendar, Compass, Users } from 'lucide-react';
import fmt from '../utils/fmt';

export default function StepCruise({ cruises, selected, onSelect }) {
  // Safe image fallback if Unsplash fails to load or is offline
  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  };

  return (
    <div className="cruise-grid">
      {cruises.map((c) => {
        const soldOut = c.availableSeats === 0;
        const isSelected = selected?.id === c.id;

        return (
          <div
            key={c.id}
            className={[
              'cruise-card',
              isSelected ? 'selected' : '',
              soldOut ? 'sold-out' : '',
            ].join(' ')}
            onClick={() => !soldOut && onSelect(c)}
            role="button"
            tabIndex={soldOut ? -1 : 0}
            aria-pressed={isSelected}
            aria-disabled={soldOut}
            onKeyDown={(e) => e.key === 'Enter' && !soldOut && onSelect(c)}
          >
            {/* Cruise Ship Image */}
            <div className="cruise-image-container">
              <img
                src={c.imageUrl}
                alt={c.name}
                className="cruise-image"
                onError={handleImageError}
                loading="lazy"
              />
            </div>

            {/* Cruise Specifications */}
            <div className="cruise-details-section">
              <div className="cruise-header">
                <div className="cruise-line-tag">{c.line}</div>
                <div className="cruise-ship-name">{c.name}</div>
              </div>

              <div className="cruise-info-grid">
                <div className="cruise-info-item">
                  <Compass size={16} />
                  <span>{c.destination}</span>
                </div>
                <div className="cruise-info-item">
                  <Calendar size={16} />
                  <span>{c.durationNights} nights</span>
                </div>
                <div className="cruise-info-item">
                  <Users size={16} />
                  <span>{c.availableSeats} / {c.capacity} available</span>
                </div>
              </div>
            </div>

            {/* Cruise Pricing & Selection */}
            <div className="cruise-price-section">
              {soldOut ? (
                <span className="cruise-badge badge-soldout">Sold Out</span>
              ) : isSelected ? (
                <span className="cruise-badge badge-selected">✓ Selected</span>
              ) : (
                <span className="cruise-badge badge-available">Available</span>
              )}

              <div className="price-label">Lowest Fare</div>
              <div className="price-amount">
                {fmt(c.baseAdultFare)}
                <sub> / guest</sub>
              </div>

              <button
                type="button"
                className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={soldOut}
              >
                {isSelected ? 'Selected' : soldOut ? 'Sold Out' : 'Select Voyage'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
