/**
 * Step 2 — Travellers
 * customer details + adult/child counts + child ages
 */
export default function StepTravellers({ customer, setCustomer, adults, setAdults, childAges, setChildAges }) {
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
      {/* ── Customer Details ── */}
      <div className="card">
        <div className="card-title">Contact Details</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="customer-name">Full Name</label>
            <input
              id="customer-name"
              className="form-input"
              type="text"
              placeholder="Jane Smith"
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
              placeholder="jane@example.com"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="customer-phone">Phone (optional)</label>
          <input
            id="customer-phone"
            className="form-input"
            type="tel"
            placeholder="+1 555 0100"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>
      </div>

      {/* ── Adults ── */}
      <div className="card">
        <div className="card-title">Adults (age 18+)</div>
        <div className="passenger-counter">
          <button
            id="adults-dec"
            className="count-btn"
            onClick={() => setAdults(Math.max(1, adults - 1))}
            disabled={adults <= 1}
            aria-label="Remove adult"
          >−</button>
          <span className="count-val" aria-live="polite">{adults}</span>
          <button
            id="adults-inc"
            className="count-btn"
            onClick={() => setAdults(adults + 1)}
            aria-label="Add adult"
          >+</button>
          <span style={{ fontSize: '.85rem', color: 'var(--muted)', marginLeft: '.5rem' }}>
            At least 1 adult required
          </span>
        </div>
      </div>

      {/* ── Children ── */}
      <div className="card">
        <div className="card-title">Children (under 18)</div>
        <div className="passenger-counter">
          <button
            id="children-dec"
            className="count-btn"
            onClick={() => changeChildren(-1)}
            disabled={childAges.length === 0}
            aria-label="Remove child"
          >−</button>
          <span className="count-val" aria-live="polite">{childAges.length}</span>
          <button
            id="children-inc"
            className="count-btn"
            onClick={() => changeChildren(1)}
            aria-label="Add child"
          >+</button>
        </div>

        {childAges.length > 0 && (
          <div className="child-ages-section">
            <h4>Enter each child's age</h4>
            <div className="child-ages-grid">
              {childAges.map((age, i) => (
                <div key={i} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor={`child-age-${i}`}>Child {i + 1}</label>
                  <input
                    id={`child-age-${i}`}
                    className="form-input child-age-input"
                    type="number"
                    min="0"
                    max="17"
                    placeholder="age"
                    value={age}
                    onChange={(e) => setChildAge(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalPassengers > 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '.85rem', textAlign: 'right' }}>
          Total passengers: <strong style={{ color: 'var(--text)' }}>{totalPassengers}</strong>
        </p>
      )}
    </div>
  );
}
