import { storageDriver } from './storageDriver';
import { STORAGE_KEYS } from './keys';
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

  // Populate missing seed items
  if (!storageDriver.getItem(STORAGE_KEYS.CRUISES)) {
    cruiseRepository.reset();
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
