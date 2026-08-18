import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { SEED_PROMO_CODES } from './seedData';

export const promoCodeRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.PROMO_CODES);
    return data || SEED_PROMO_CODES;
  },

  getByCode: (code) => {
    if (!code) return null;
    const codes = promoCodeRepository.getAll();
    return codes.find((p) => p.code.toUpperCase() === code.trim().toUpperCase()) || null;
  },

  save: (promoData) => {
    const codes = promoCodeRepository.getAll();
    const existingIndex = codes.findIndex((p) => p.code.toUpperCase() === promoData.code.toUpperCase());

    if (existingIndex >= 0) {
      codes[existingIndex] = { ...codes[existingIndex], ...promoData };
    } else {
      const newPromo = {
        id: promoData.id || `PROMO-${Date.now()}`,
        active: true,
        ...promoData,
      };
      codes.push(newPromo);
      storageDriver.setItem(STORAGE_KEYS.PROMO_CODES, codes);
      return newPromo;
    }

    storageDriver.setItem(STORAGE_KEYS.PROMO_CODES, codes);
    return codes[existingIndex];
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.PROMO_CODES, SEED_PROMO_CODES);
  },
};
