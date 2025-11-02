// client/src/utils/statePersistence.ts
import React from "react";

/**
 * State persistence utilities
 * 
 * This module provides utilities for persisting and restoring
 * application state using localStorage with proper error handling.
 */

/**
 * Storage key prefix for the application
 */
const STORAGE_PREFIX = "declare-card-game-";

/**
 * Storage keys for different state types
 */
export const STORAGE_KEYS = {
  GAME_STATE: `${STORAGE_PREFIX}game-state`,
  UI_STATE: `${STORAGE_PREFIX}ui-state`,
  USER_PREFERENCES: `${STORAGE_PREFIX}user-preferences`,
  PLAYER_DATA: `${STORAGE_PREFIX}player-data`,
} as const;

/**
 * Interface for storable data
 */
interface StorableData {
  [key: string]: unknown;
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(message: string, public key: string, public originalError?: Error) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Safely stores data in localStorage
 * 
 * @param key - The storage key
 * @param data - The data to store
 * @throws {StorageError} If storage fails
 */
export const storeData = <T extends StorableData>(key: string, data: T): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    throw new StorageError(
      `Failed to store data for key "${key}"`,
      key,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Safely retrieves data from localStorage
 * 
 * @param key - The storage key
 * @param defaultValue - Default value if data doesn't exist
 * @returns The stored data or default value
 * @throws {StorageError} If retrieval fails
 */
export const retrieveData = <T extends StorableData>(
  key: string,
  defaultValue: T
): T => {
  try {
    const serializedData = localStorage.getItem(key);
    
    if (serializedData === null) {
      return defaultValue;
    }

    const parsedData = JSON.parse(serializedData);
    return parsedData as T;
  } catch (error) {
    throw new StorageError(
      `Failed to retrieve data for key "${key}"`,
      key,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Safely removes data from localStorage
 * 
 * @param key - The storage key
 * @throws {StorageError} If removal fails
 */
export const removeData = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      `Failed to remove data for key "${key}"`,
      key,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Checks if localStorage is available
 * 
 * @returns True if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets storage usage information
 * 
 * @returns Storage usage information
 */
export const getStorageInfo = (): {
  isAvailable: boolean;
  usedSpace: number;
  totalSpace: number;
  keys: string[];
} => {
  if (!isStorageAvailable()) {
    return {
      isAvailable: false,
      usedSpace: 0,
      totalSpace: 0,
      keys: [],
    };
  }

  let usedSpace = 0;
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keys.push(key);
      const value = localStorage.getItem(key);
      if (value) {
        usedSpace += key.length + value.length;
      }
    }
  }

  // Estimate total space (most browsers have 5-10MB limit)
  const totalSpace = 5 * 1024 * 1024; // 5MB estimate

  return {
    isAvailable: true,
    usedSpace,
    totalSpace,
    keys,
  };
};

/**
 * Clears all application data from localStorage
 * 
 * @throws {StorageError} If clearing fails
 */
export const clearAllData = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    throw new StorageError(
      "Failed to clear application data",
      "all",
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Hook for managing persistent state
 * 
 * @param key - The storage key
 * @param defaultValue - Default value
 * @returns State and setter function
 */
export const usePersistentState = <T extends StorableData>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] => {
  const [state, setState] = React.useState<T>(() => {
    try {
      return retrieveData(key, defaultValue);
    } catch {
      return defaultValue;
    }
  });

  const setPersistentState = React.useCallback((value: T) => {
    try {
      storeData(key, value);
      setState(value);
    } catch (error) {
      console.error(`Failed to persist state for key "${key}":`, error);
      // Still update local state even if persistence fails
      setState(value);
    }
  }, [key]);

  return [state, setPersistentState];
};

/**
 * Higher-order component for adding persistence to components
 * 
 * @param key - The storage key
 * @param Component - The component to wrap
 * @returns Wrapped component with persistence
 */
export const withPersistence = <P extends object>(
  key: string,
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return React.memo((props: P) => {
    const [persistedProps, setPersistedProps] = usePersistentState(
      key,
      props as StorableData
    );

    return React.createElement(Component, {
      ...props,
      ...persistedProps,
      onStateChange: setPersistedProps,
    });
  });
};

export default {
  storeData,
  retrieveData,
  removeData,
  isStorageAvailable,
  getStorageInfo,
  clearAllData,
  usePersistentState,
  withPersistence,
  STORAGE_KEYS,
};
