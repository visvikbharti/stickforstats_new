/**
 * Offline Storage Utility
 * 
 * This utility provides methods for storing and retrieving data
 * from IndexedDB to enable offline functionality.
 */

const DB_NAME = 'stickforstats-offline-db';
const DB_VERSION = 1;
const STORES = {
  DATASETS: 'datasets',
  CALCULATIONS: 'calculations',
  USER_PREFERENCES: 'user-preferences',
};

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} Promise resolving to the database instance
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.DATASETS)) {
        const datasetStore = db.createObjectStore(STORES.DATASETS, { keyPath: 'id' });
        datasetStore.createIndex('name', 'name', { unique: false });
        datasetStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.CALCULATIONS)) {
        const calculationsStore = db.createObjectStore(STORES.CALCULATIONS, { keyPath: 'id' });
        calculationsStore.createIndex('type', 'type', { unique: false });
        calculationsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
        db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Save data to a specific store
 * @param {string} storeName - Name of the store to save to
 * @param {Object} data - Data to save
 * @returns {Promise<string>} Promise resolving to the ID of the saved object
 */
const saveToStore = async (storeName, data) => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Add timestamp if not already present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }
    
    const request = store.put(data);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = (event) => {
      console.error(`Error saving to ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Get data from a specific store by ID
 * @param {string} storeName - Name of the store to get from
 * @param {string|number} id - ID of the object to retrieve
 * @returns {Promise<Object|null>} Promise resolving to the retrieved object or null if not found
 */
const getFromStore = async (storeName, id) => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = (event) => {
      console.error(`Error retrieving from ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Get all data from a specific store
 * @param {string} storeName - Name of the store to get from
 * @param {Object} [query] - Query parameters (index and range)
 * @returns {Promise<Array>} Promise resolving to an array of objects
 */
const getAllFromStore = async (storeName, query = null) => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    let request;
    
    if (query && query.index && query.range) {
      const index = store.index(query.index);
      request = index.getAll(query.range);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = (event) => {
      console.error(`Error retrieving all from ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Delete data from a specific store by ID
 * @param {string} storeName - Name of the store to delete from
 * @param {string|number} id - ID of the object to delete
 * @returns {Promise<void>} Promise resolving when the object is deleted
 */
const deleteFromStore = async (storeName, id) => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      console.error(`Error deleting from ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Clear all data from a specific store
 * @param {string} storeName - Name of the store to clear
 * @returns {Promise<void>} Promise resolving when the store is cleared
 */
const clearStore = async (storeName) => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      console.error(`Error clearing ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
  });
};

// Dataset specific methods
const saveDataset = (dataset) => saveToStore(STORES.DATASETS, dataset);
const getDataset = (id) => getFromStore(STORES.DATASETS, id);
const getAllDatasets = () => getAllFromStore(STORES.DATASETS);
const deleteDataset = (id) => deleteFromStore(STORES.DATASETS, id);

// Calculation specific methods
const saveCalculation = (calculation) => saveToStore(STORES.CALCULATIONS, calculation);
const getCalculation = (id) => getFromStore(STORES.CALCULATIONS, id);
const getAllCalculations = (type = null) => {
  if (type) {
    return getAllFromStore(STORES.CALCULATIONS, {
      index: 'type',
      range: IDBKeyRange.only(type),
    });
  }
  return getAllFromStore(STORES.CALCULATIONS);
};
const deleteCalculation = (id) => deleteFromStore(STORES.CALCULATIONS, id);

// User preferences methods
const saveUserPreference = (key, value) => {
  return saveToStore(STORES.USER_PREFERENCES, { key, value });
};
const getUserPreference = (key) => getFromStore(STORES.USER_PREFERENCES, key);

/**
 * Get all databases on the current origin
 * @returns {Promise<string[]>} Promise resolving to an array of database names
 */
const getAllDatabases = () => {
  return new Promise((resolve, reject) => {
    if (!indexedDB.databases) {
      // Not supported in all browsers
      resolve([]);
      return;
    }
    
    const request = indexedDB.databases();
    
    request.onsuccess = () => {
      resolve(request.result.map(db => db.name));
    };
    
    request.onerror = (event) => {
      console.error('Error getting all databases:', event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Check if the browser supports offline storage
 * @returns {boolean} True if IndexedDB is supported
 */
const isOfflineStorageSupported = () => {
  return !!window.indexedDB;
};

export {
  // General methods
  initDB,
  saveToStore,
  getFromStore,
  getAllFromStore,
  deleteFromStore,
  clearStore,
  getAllDatabases,
  isOfflineStorageSupported,
  
  // Dataset methods
  saveDataset,
  getDataset,
  getAllDatasets,
  deleteDataset,
  
  // Calculation methods
  saveCalculation,
  getCalculation,
  getAllCalculations,
  deleteCalculation,
  
  // User preferences methods
  saveUserPreference,
  getUserPreference,
  
  // Constants
  STORES,
};