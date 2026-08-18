import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { SEED_CUSTOMERS } from './seedData';

export const customerRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.CUSTOMERS);
    return data || SEED_CUSTOMERS;
  },

  getById: (id) => {
    const customers = customerRepository.getAll();
    return customers.find((c) => c.id === id) || null;
  },

  getByEmail: (email) => {
    const customers = customerRepository.getAll();
    return customers.find((c) => c.email.toLowerCase() === email.toLowerCase()) || null;
  },

  save: (customerData) => {
    const customers = customerRepository.getAll();
    const existingIndex = customers.findIndex((c) => c.id === customerData.id);

    if (existingIndex >= 0) {
      customers[existingIndex] = { ...customers[existingIndex], ...customerData };
    } else {
      const newCustomer = {
        id: customerData.id || `CUST-${Date.now()}`,
        ...customerData,
        createdAt: new Date().toISOString(),
      };
      customers.push(newCustomer);
      storageDriver.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      return newCustomer;
    }

    storageDriver.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[existingIndex];
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
  },
};
