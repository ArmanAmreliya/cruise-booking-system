import { useState } from 'react';
import { validatePromotion } from '../services/promotionService';

/**
 * Step 4 — Promotion Code
 */
export default function StepPromotion({ promoCode, setPromoCode, subtotal, currentDate }) {
  const [input, setInput] = useState(promoCode);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleApply = () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const validation = validatePromotion({
        promoCode: input.trim(),
        preDiscountSubtotal: subtotal,
        currentDate,
      });

      setResult(validation);

      if (validation.valid) {
        setPromoCode(input.trim().toUpperCase());
      } else {
        setPromoCode('');
      }
    } catch (e) {
      setResult({ valid: false, error: e.message });
      setPromoCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
    setPromoCode('');
  };

  return (
    <div>
      <p style={{ fontSize: '.9rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Enter a promotional code to apply a discount. Only one code can be applied per booking.
      </p>

      <div className="promo-row">
        <input
          id="promo-code-input"
          className="form-input"
          type="text"
          placeholder="e.g. SUMMER10"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            if (result) setResult(null);
            if (promoCode) setPromoCode('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          disabled={loading}
          style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}
        />
        <button
          id="promo-apply-btn"
          className="btn btn-primary"
          onClick={handleApply}
          disabled={!input.trim() || loading}
        >
          {loading ? '...' : 'Apply'}
        </button>
        {(result || promoCode) && (
          <button id="promo-clear-btn" className="btn btn-outline" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {result && (
        <div className={`promo-msg ${result.valid ? 'ok' : 'err'}`} role="alert">
          {result.valid
            ? `✓ ${result.message}`
            : `✗ ${result.error}`}
        </div>
      )}

      {!promoCode && (
        <p style={{ marginTop: '1.25rem', fontSize: '.85rem', color: 'var(--muted)' }}>
          Skip this step if you do not have a code.
        </p>
      )}
    </div>
  );
}
