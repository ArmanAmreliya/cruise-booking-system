import fmt from '../utils/fmt';

/**
 * Step 1 — Cruise Selection
 */
export default function StepCruise({ cruises, selected, onSelect }) {
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
            <div className="cruise-card-header">
              <div>
                <div className="cruise-name">{c.name}</div>
                <div className="cruise-line">{c.line}</div>
              </div>
              {soldOut ? (
                <span className="cruise-badge badge-soldout">Sold Out</span>
              ) : isSelected ? (
                <span className="cruise-badge badge-selected">✓ Selected</span>
              ) : (
                <span className="cruise-badge badge-available">Available</span>
              )}
            </div>

            <div className="cruise-meta">
              <div className="cruise-meta-item">
                Destination: <span>{c.destination}</span>
              </div>
              <div className="cruise-meta-item">
                Duration: <span>{c.durationNights} nights</span>
              </div>
              <div className="cruise-meta-item">
                Capacity: <span>{c.availableSeats} / {c.capacity} seats</span>
              </div>
            </div>

            <div className="cruise-fare-big">
              {fmt(c.baseAdultFare)} <sub>per adult</sub>
            </div>
          </div>
        );
      })}
    </div>
  );
}
