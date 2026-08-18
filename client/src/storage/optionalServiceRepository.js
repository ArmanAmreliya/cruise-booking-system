import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { SEED_OPTIONAL_SERVICES } from './seedData';

export const optionalServiceRepository = {
  getAll: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.OPTIONAL_SERVICES);
    return data || SEED_OPTIONAL_SERVICES;
  },

  getById: (id) => {
    const services = optionalServiceRepository.getAll();
    return services.find((s) => s.id === id) || null;
  },

  getByIds: (ids) => {
    if (!ids || !Array.isArray(ids)) return [];
    const services = optionalServiceRepository.getAll();
    return services.filter((s) => ids.includes(s.id));
  },

  save: (serviceData) => {
    const services = optionalServiceRepository.getAll();
    const existingIndex = services.findIndex((s) => s.id === serviceData.id);

    if (existingIndex >= 0) {
      services[existingIndex] = { ...services[existingIndex], ...serviceData };
    } else {
      const newService = {
        id: serviceData.id || `SVC-${Date.now()}`,
        ...serviceData,
      };
      services.push(newService);
      storageDriver.setItem(STORAGE_KEYS.OPTIONAL_SERVICES, services);
      return newService;
    }

    storageDriver.setItem(STORAGE_KEYS.OPTIONAL_SERVICES, services);
    return services[existingIndex];
  },

  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.OPTIONAL_SERVICES, SEED_OPTIONAL_SERVICES);
  },
};
