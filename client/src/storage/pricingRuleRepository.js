import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { SEED_PRICING_RULES } from './seedData';

export const pricingRuleRepository = {
  getRules: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.PRICING_RULES);
    return data || SEED_PRICING_RULES;
  },

  updateRules: (newRules) => {
    const currentRules = pricingRuleRepository.getRules();
    const updated = { ...currentRules, ...newRules };
    storageDriver.setItem(STORAGE_KEYS.PRICING_RULES, updated);
    return updated;
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.PRICING_RULES, SEED_PRICING_RULES);
  },
};
