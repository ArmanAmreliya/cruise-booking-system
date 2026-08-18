import { User, Users } from 'lucide-react';

export default function StepTravellers({
  customer,
  setCustomer,
  adults,
  setAdults,
  childAges,
  setChildAges,
}) {
  const setChildAge = (idx, val) => {
    const next = [...childAges];
    next[idx] = val === '' ? '' : parseInt(val, 10);
    setChildAges(next);
  };

  const changeChildren = (delta) => {
    const next = childAges.length + delta;
    if (next < 0) return;
    if (delta > 0) setChildAges([...childAges, '']);
    else setChildAges(childAges.slice(0, -1));
  };

  const totalPassengers = adults + childAges.length;

  return (
    <div>
      {/* Contact Details */}
      <div className="card">
        <div className="card-title">
          <User size={20} />
          <span>Primary Contact</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="customer-name">Full Name</label>
            <input
              id="customer-name"
              className="form-input"
              type="text"
              placeholder="e.g. Jane Smith"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="customer-email">Email Address</label>
            <input
              id="customer-email"
              className="form-input"
              type="email"
              placeholder="e.g. jane@example.com"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="customer-phone">Phone Number (Optional)</label>
          <input
            id="customer-phone"
            className="form-input"
            type="tel"
            placeholder="e.g. +1 (555) 0100"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>
      </div>

      {/* Travelling Party composition */}
      <div className="card">
        <div className="card-title">
          <Users size={20} />
          <span>Travelling Party</span>
        </div>

        {/* Adults Counter */}
        <div className="passenger-counter-container" style={{ marginBottom: '1.25rem' }}>
          <div className="counter-details">
            <h3>Adults</h3>
            <p>Ages 18 and older</p>
          </div>
          <div className="passenger-counter">
            <button
              id="adults-dec"
              className="count-btn"
              type="button"
              onClick={() => setAdults(Math.max(1, adults - 1))}
              disabled={adults <= 1}
              aria-label="Decrease adult count"
            >
              −
            </button>
            <span className="count-val" aria-live="polite">{adults}</span>
            <button
              id="adults-inc"
              className="count-btn"
              type="button"
              onClick={() => setAdults(adults + 1)}
              aria-label="Increase adult count"
            >
              +
            </button>
          </div>
        </div>

        {/* Children Counter */}
        <div className="passenger-counter-container">
          <div className="counter-details">
            <h3>Children</h3>
            <p>Ages 0 to 17</p>
          </div>
          <div className="passenger-counter">
            <button
              id="children-dec"
              className="count-btn"
              type="button"
              onClick={() => changeChildren(-1)}
              disabled={childAges.length === 0}
              aria-label="Decrease child count"
            >
              −
            </button>
            <span className="count-val" aria-live="polite">{childAges.length}</span>
            <button
              id="children-inc"
              className="count-btn"
              type="button"
              onClick={() => changeChildren(1)}
              aria-label="Increase child count"
            >
              +
            </button>
          </div>
        </div>

        {/* Child Ages details */}
        {childAges.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Specify ages of travelling children:
            </h4>
            <div className="child-ages-grid">
              {childAges.map((age, i) => (
                <div key={i} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor={`child-age-${i}`}>Child {i + 1}</label>
                  <input
                    id={`child-age-${i}`}
                    className="form-input"
                    type="number"
                    min="0"
                    max="17"
                    placeholder="Age"
                    value={age}
                    onChange={(e) => setChildAge(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Total Party Size: <strong style={{ color: 'var(--text-color)' }}>{totalPassengers}</strong>
      </div>
    </div>
  );
}
