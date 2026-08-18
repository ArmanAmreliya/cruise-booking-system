import { storageDriver } from './storageDriver';
import { STORAGE_KEYS, CURRENT_SEED_VERSION } from './keys';
import { cruiseRepository } from './cruiseRepository';
import { customerRepository } from './customerRepository';
import { bookingRepository } from './bookingRepository';
import { promoCodeRepository } from './promoCodeRepository';
import { promoRedemptionRepository } from './promoRedemptionRepository';
import { pricingRuleRepository } from './pricingRuleRepository';
import { optionalServiceRepository } from './optionalServiceRepository';

export const initLocalStorage = (forceReset = false) => {
  if (forceReset) {
    storageDriver.clear();
  }

  // Re-seed cruises any time the seed version bumps (e.g. new image URLs).
  // This preserves bookings and other user data — only cruise catalogue is refreshed.
  const storedVersion = storageDriver.getItem(STORAGE_KEYS.SEED_VERSION);
  if (!storedVersion || storedVersion !== CURRENT_SEED_VERSION) {
    cruiseRepository.reset();
    storageDriver.setItem(STORAGE_KEYS.SEED_VERSION, CURRENT_SEED_VERSION);
  }

  if (!storageDriver.getItem(STORAGE_KEYS.PROMO_CODES)) {
    promoCodeRepository.reset();
  }

  if (!storageDriver.getItem(STORAGE_KEYS.PRICING_RULES)) {
    pricingRuleRepository.reset();
  }

  if (!storageDriver.getItem(STORAGE_KEYS.OPTIONAL_SERVICES)) {
    optionalServiceRepository.reset();
  }

  if (!storageDriver.getItem(STORAGE_KEYS.CUSTOMERS)) {
    customerRepository.reset();
  }

  if (!storageDriver.getItem(STORAGE_KEYS.BOOKINGS)) {
    bookingRepository.reset();
  }

  if (!storageDriver.getItem(STORAGE_KEYS.PROMO_REDEMPTIONS)) {
    promoRedemptionRepository.reset();
  }
};

export {
  STORAGE_KEYS,
  storageDriver,
  cruiseRepository,
  customerRepository,
  bookingRepository,
  promoCodeRepository,
  promoRedemptionRepository,
  pricingRuleRepository,
  optionalServiceRepository,
};
