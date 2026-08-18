import { useState } from 'react';
import { Gift, CheckCircle2, AlertCircle } from 'lucide-react';
import { validatePromotion } from '../services/promotionService';

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
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Have a promotional offer code? Enter it below to apply it to your booking subtotal. Only one promotion can be used per voyage.
      </p>

      <div className="promo-input-group">
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
          style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, maxWidth: '280px' }}
        />
        <button
          id="promo-apply-btn"
          className="btn btn-primary"
          onClick={handleApply}
          disabled={!input.trim() || loading}
          type="button"
        >
          {loading ? 'Validating...' : 'Apply Code'}
        </button>
        {(result || promoCode) && (
          <button id="promo-clear-btn" className="btn btn-outline" onClick={handleClear} type="button">
            Remove
          </button>
        )}
      </div>

      {result && (
        <div className={`promo-msg ${result.valid ? 'ok' : 'err'}`} role="alert" style={{ marginTop: '1rem' }}>
          {result.valid ? (
            <>
              <CheckCircle2 size={16} />
              <span>{result.message}</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              <span>{result.error}</span>
            </>
          )}
        </div>
      )}

      {!promoCode && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          You can safely skip this step and click Next if you do not have an active promo code.
        </p>
      )}
    </div>
  );
}
