import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';

export const promoRedemptionRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.PROMO_REDEMPTIONS);
    return data || [];
  },

  getByPromoCode: (promoCode) => {
    const redemptions = promoRedemptionRepository.getAll();
    return redemptions.filter((r) => r.promoCode.toUpperCase() === promoCode.toUpperCase());
  },

  saveRedemption: (redemptionData) => {
    const redemptions = promoRedemptionRepository.getAll();
    const newRedemption = {
      id: `RED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      redeemedAt: new Date().toISOString(),
      ...redemptionData,
    };

    redemptions.push(newRedemption);
    storageDriver.setItem(STORAGE_KEYS.PROMO_REDEMPTIONS, redemptions);
    return newRedemption;
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.PROMO_REDEMPTIONS, []);
  },
};
