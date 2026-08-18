import fmt from '../utils/fmt';

export default function StepReview({ breakdown }) {
  if (!breakdown) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Calculating exact quotation details...
      </p>
    );
  }

  const {
    cruiseFareSubtotal,
    passengers,
    groupDiscount,
    optionalServices,
    promotionalDiscount,
    tax,
    finalTotal,
  } = breakdown;

  return (
    <div className="breakdown-table">
      {/* Cruise Fares */}
      <div className="breakdown-row" style={{ fontWeight: 700 }}>
        <span className="lbl">Base Cruise Fare</span>
        <span className="val">{fmt(cruiseFareSubtotal)}</span>
      </div>

      {passengers.breakdown.map((p, i) => (
        <div key={i} className="breakdown-row indent">
          <span>
            {p.type === 'Adult' ? 'Adult Guest' : `Child Guest (Age ${p.age})`}
            {p.farePercentage < 100 ? ` (${p.farePercentage}% fare rule)` : ''}
          </span>
          <span className="val">{fmt(p.fare)}</span>
        </div>
      ))}

      {/* Group Discounts */}
      {groupDiscount.discountPercentage > 0 && (
        <div className="breakdown-row discount">
          <span>Group Discount ({groupDiscount.discountPercentage}%)</span>
          <span className="val">−{fmt(groupDiscount.amount)}</span>
        </div>
      )}

      {/* Optional Services */}
      {optionalServices.items.length > 0 && (
        <>
          <div className="breakdown-row" style={{ fontWeight: 700, marginTop: '0.5rem' }}>
            <span>Optional Amenities</span>
            <span className="val">{fmt(optionalServices.subtotal)}</span>
          </div>
          {optionalServices.items.map((svc, i) => (
            <div key={i} className="breakdown-row indent">
              <span>{svc.name}</span>
              <span className="val">{fmt(svc.totalCost)}</span>
            </div>
          ))}
        </>
      )}

      {/* Promotional Discounts */}
      {promotionalDiscount?.applied && (
        <div className="breakdown-row discount" style={{ marginTop: '0.5rem' }}>
          <span>
            Promo Code Discount: {promotionalDiscount.code} ({promotionalDiscount.discountType === 'PERCENTAGE' ? `${promotionalDiscount.discountValue}%` : 'Fixed'})
          </span>
          <span className="val">−{fmt(promotionalDiscount.amount)}</span>
        </div>
      )}

      {/* Taxes & Port Fees */}
      <div className="breakdown-row" style={{ marginTop: '0.5rem' }}>
        <span>Taxes & Fees ({tax.ratePercentage}%)</span>
        <span className="val">{fmt(tax.amount)}</span>
      </div>

      {/* Grand Charged Total */}
      <div className="breakdown-row total-row">
        <span>Grand Total Charged</span>
        <span className="val">{fmt(finalTotal)}</span>
      </div>
    </div>
  );
}
