import { useState, useEffect, useCallback } from 'react';
import * as offlineStorage from '../utils/offlineStorage';

/**
 * A hook for using offline storage capabilities
 * @param {string} storeName - The name of the store to interact with
 * @returns {Object} Methods and state for interacting with offline storage
 */
const useOfflineStorage = (storeName) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Check if offline storage is supported
  useEffect(() => {
    setIsSupported(offlineStorage.isOfflineStorageSupported());
  }, []);
  
  /**
   * Save data to the store
   * @param {Object} data - The data to save
   * @returns {Promise<string>} Promise resolving to the ID of the saved item
   */
  const saveData = useCallback(async (data) => {
    if (!isSupported) {
      throw new Error('Offline storage is not supported in this browser');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const id = await offlineStorage.saveToStore(storeName, data);
      return id;
    } catch (err) {
      setError(err.message || 'Failed to save data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeName, isSupported]);
  
  /**
   * Get a single item by ID
   * @param {string|number} id - The ID of the item to retrieve
   * @returns {Promise<Object|null>} Promise resolving to the item or null if not found
   */
  const getData = useCallback(async (id) => {
    if (!isSupported) {
      throw new Error('Offline storage is not supported in this browser');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      return await offlineStorage.getFromStore(storeName, id);
    } catch (err) {
      setError(err.message || 'Failed to get data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeName, isSupported]);
  
  /**
   * Get all items from the store
   * @param {Object} [query] - Optional query parameters
   * @returns {Promise<Array>} Promise resolving to an array of items
   */
  const getAllData = useCallback(async (query = null) => {
    if (!isSupported) {
      throw new Error('Offline storage is not supported in this browser');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      return await offlineStorage.getAllFromStore(storeName, query);
    } catch (err) {
      setError(err.message || 'Failed to get all data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeName, isSupported]);
  
  /**
   * Delete an item by ID
   * @param {string|number} id - The ID of the item to delete
   * @returns {Promise<void>} Promise resolving when the item is deleted
   */
  const deleteData = useCallback(async (id) => {
    if (!isSupported) {
      throw new Error('Offline storage is not supported in this browser');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await offlineStorage.deleteFromStore(storeName, id);
    } catch (err) {
      setError(err.message || 'Failed to delete data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeName, isSupported]);
  
  /**
   * Clear all items from the store
   * @returns {Promise<void>} Promise resolving when the store is cleared
   */
  const clearData = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Offline storage is not supported in this browser');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await offlineStorage.clearStore(storeName);
    } catch (err) {
      setError(err.message || 'Failed to clear data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [storeName, isSupported]);
  
  return {
    saveData,
    getData,
    getAllData,
    deleteData,
    clearData,
    isLoading,
    error,
    isSupported,
  };
};

export default useOfflineStorage;