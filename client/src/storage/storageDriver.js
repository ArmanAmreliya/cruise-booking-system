const memoryStore = {};

export const storageDriver = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (e) {
      console.warn(`LocalStorage read error for key "${key}":`, e);
    }
    return memoryStore[key] ? JSON.parse(JSON.stringify(memoryStore[key])) : null;
  },

  setItem: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
      memoryStore[key] = value;
      return true;
    } catch (e) {
      console.warn(`LocalStorage write error for key "${key}":`, e);
      memoryStore[key] = value;
      return false;
    }
  },

  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete memoryStore[key];
    } catch (e) {
      console.warn(`LocalStorage remove error for key "${key}":`, e);
      delete memoryStore[key];
    }
  },

  clear: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    }
  },
};
