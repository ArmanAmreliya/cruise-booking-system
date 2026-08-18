import fmt from '../utils/fmt';

/**
 * Step 5 — Price Review
 * Renders the complete breakdown from pricingService output.
 */
export default function StepReview({ breakdown }) {
  if (!breakdown) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
        Price breakdown is being calculated…
      </p>
    );
  }

  const { cruise, passengers, groupDiscount, optionalServices,
    promotionalDiscount, tax, finalTotal,
    cruiseFareSubtotal, preDiscountSubtotal, discountedCruiseFare } = breakdown;

  return (
    <div className="breakdown-rows">
      {/* ── Cruise fares ── */}
      <div className="bd-row">
        <span className="label">Cruise Fares</span>
        <span className="val">{fmt(cruiseFareSubtotal)}</span>
      </div>

      {passengers.breakdown.map((p, i) => (
        <div key={i} className="bd-row sub-row">
          <span className="label">
            {p.type === 'Adult' ? `Adult` : `Child (age ${p.age})`}
            {p.farePercentage < 100 ? ` — ${p.farePercentage}%` : ''}
          </span>
          <span className="val">{fmt(p.fare)}</span>
        </div>
      ))}

      {/* ── Group Discount ── */}
      {groupDiscount.discountPercentage > 0 && (
        <div className="bd-row discount">
          <span className="label">Group Discount ({groupDiscount.discountPercentage}%)</span>
          <span className="val">−{fmt(groupDiscount.amount)}</span>
        </div>
      )}

      {/* ── Optional Services ── */}
      {optionalServices.items.length > 0 && (
        <>
          <div className="bd-row">
            <span className="label">Optional Services</span>
            <span className="val">{fmt(optionalServices.subtotal)}</span>
          </div>
          {optionalServices.items.map((svc, i) => (
            <div key={i} className="bd-row sub-row">
              <span className="label">{svc.name}</span>
              <span className="val">{fmt(svc.totalCost)}</span>
            </div>
          ))}
        </>
      )}

      {/* ── Promo Discount ── */}
      {promotionalDiscount?.applied && (
        <div className="bd-row discount">
          <span className="label">
            Promo: {promotionalDiscount.code}
            {' '}({promotionalDiscount.discountType === 'PERCENTAGE'
              ? `${promotionalDiscount.discountValue}% off`
              : `$${promotionalDiscount.discountValue} fixed`})
          </span>
          <span className="val">−{fmt(promotionalDiscount.amount)}</span>
        </div>
      )}

      {/* ── Tax ── */}
      <div className="bd-row">
        <span className="label">Tax ({tax.ratePercentage}%)</span>
        <span className="val">{fmt(tax.amount)}</span>
      </div>

      {/* ── Grand Total ── */}
      <div className="bd-row total">
        <span className="label">Total</span>
        <span className="val">{fmt(finalTotal)}</span>
      </div>
    </div>
  );
}
