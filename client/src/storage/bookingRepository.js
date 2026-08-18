import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';

export const bookingRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.BOOKINGS);
    return data || [];
  },

  getByReference: (bookingReference) => {
    const bookings = bookingRepository.getAll();
    return bookings.find((b) => b.bookingReference === bookingReference) || null;
  },

  getById: (id) => {
    const bookings = bookingRepository.getAll();
    return bookings.find((b) => b.id === id) || null;
  },

  save: (bookingData) => {
    const bookings = bookingRepository.getAll();
    const newBooking = {
      id: bookingData.id || `BKG-${Date.now()}`,
      bookingReference: bookingData.bookingReference || `CRZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      ...bookingData,
    };

    bookings.push(newBooking);
    storageDriver.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    return newBooking;
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.BOOKINGS, []);
  },
};
