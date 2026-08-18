import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { SEED_CRUISES } from './seedData';

export const cruiseRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.CRUISES);
    return data || SEED_CRUISES;
  },

  getById: (id) => {
    const cruises = cruiseRepository.getAll();
    return cruises.find((c) => c.id === id) || null;
  },

  updateAvailableSeats: (cruiseId, seatsToDeduct) => {
    const cruises = cruiseRepository.getAll();
    const index = cruises.findIndex((c) => c.id === cruiseId);
    if (index === -1) return false;

    if (cruises[index].availableSeats < seatsToDeduct) {
      throw new Error(`Insufficient seats available on cruise ${cruiseId}`);
    }

    cruises[index].availableSeats -= seatsToDeduct;
    storageDriver.setItem(STORAGE_KEYS.CRUISES, cruises);
    return cruises[index];
  },

  saveAll: (cruises) => {
    storageDriver.setItem(STORAGE_KEYS.CRUISES, cruises);
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.CRUISES, SEED_CRUISES);
  },
};
