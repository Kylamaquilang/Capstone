import { useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';

/**
 * Custom hook for auto-refresh functionality
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched (e.g., 'products', 'orders', 'categories')
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected } = useSocket();

  const handleDataRefresh = useCallback((data) => {
    console.log(`🔄 Auto-refresh triggered for ${dataType}:`, data);
    if (refreshFunction && typeof refreshFunction === 'function') {
      refreshFunction();
    }
  }, [refreshFunction, dataType]);

  const handleAdminDataRefresh = useCallback((data) => {
    console.log(`🔄 Admin auto-refresh triggered for ${dataType}:`, data);
    if (refreshFunction && typeof refreshFunction === 'function') {
      refreshFunction();
    }
  }, [refreshFunction, dataType]);

  const handleUserDataRefresh = useCallback((data) => {
    console.log(`🔄 User auto-refresh triggered for ${dataType}:`, data);
    if (refreshFunction && typeof refreshFunction === 'function') {
      refreshFunction();
    }
  }, [refreshFunction, dataType]);

  useEffect(() => {
    if (socket && isConnected) {
      // Listen for general data refresh events
      socket.on('data-refresh', (data) => {
        if (data.dataType === dataType) {
          handleDataRefresh(data);
        }
      });

      // Listen for admin-specific data refresh events
      socket.on('admin-data-refresh', (data) => {
        if (data.dataType === dataType) {
          handleAdminDataRefresh(data);
        }
      });

      // Listen for user-specific data refresh events
      socket.on('user-data-refresh', (data) => {
        if (data.dataType === dataType) {
          handleUserDataRefresh(data);
        }
      });

      return () => {
        socket.off('data-refresh');
        socket.off('admin-data-refresh');
        socket.off('user-data-refresh');
      };
    }
  }, [socket, isConnected, dataType, handleDataRefresh, handleAdminDataRefresh, handleUserDataRefresh]);

  // Return the refresh function for manual triggering
  return {
    refresh: refreshFunction,
    isConnected
  };
};

/**
 * Hook specifically for admin pages
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useAdminAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected, joinAdminRoom } = useSocket();

  const handleAdminDataRefresh = useCallback((data) => {
    console.log(`🔄 Admin auto-refresh triggered for ${dataType}:`, data);
    if (refreshFunction && typeof refreshFunction === 'function') {
      refreshFunction();
    }
  }, [refreshFunction, dataType]);

  useEffect(() => {
    if (socket && isConnected) {
      // Join admin room for admin-specific updates
      joinAdminRoom();

      // Listen for admin-specific data refresh events
      socket.on('admin-data-refresh', (data) => {
        if (data.dataType === dataType) {
          handleAdminDataRefresh(data);
        }
      });

      return () => {
        socket.off('admin-data-refresh');
      };
    }
  }, [socket, isConnected, dataType, handleAdminDataRefresh, joinAdminRoom]);

  return {
    refresh: refreshFunction,
    isConnected
  };
};

/**
 * Hook specifically for user pages
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useUserAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected, user } = useSocket();

  const handleUserDataRefresh = useCallback((data) => {
    console.log(`🔄 User auto-refresh triggered for ${dataType}:`, data);
    if (refreshFunction && typeof refreshFunction === 'function') {
      refreshFunction();
    }
  }, [refreshFunction, dataType]);

  useEffect(() => {
    if (socket && isConnected && user) {
      // Listen for user-specific data refresh events
      socket.on('user-data-refresh', (data) => {
        if (data.dataType === dataType) {
          handleUserDataRefresh(data);
        }
      });

      return () => {
        socket.off('user-data-refresh');
      };
    }
  }, [socket, isConnected, user, dataType, handleUserDataRefresh]);

  return {
    refresh: refreshFunction,
    isConnected
  };
};
