'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    // Test server connection first
    const testConnection = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/health`);
        if (!response.ok) {
          throw new Error('Server not responding');
        }
        console.log('🔌 Server health check passed');
        return true;
      } catch (error) {
        console.warn('🔌 Server health check failed:', error.message);
        return false;
      }
    };

    const initializeSocket = async () => {
      const serverAvailable = await testConnection();
      
      if (!serverAvailable) {
        console.warn('🔌 Server not available, skipping Socket.IO initialization');
        setConnectionFailed(true);
        return;
      }

      // Socket.IO should connect to the root URL, not the API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const serverUrl = apiUrl.replace('/api', '') || 'http://localhost:5000';
      console.log('🔌 Initializing Socket.IO connection to:', serverUrl);

      // Initialize socket connection to default namespace
      const socketInstance = io(serverUrl, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 1000,
        timeout: 10000,
        upgrade: true,
        rememberUpgrade: false
      });

      // Connection event handlers
      socketInstance.on('connect', () => {
        console.log('🔌 Connected to server:', socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error);
        console.error('🔌 Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          transport: error.transport
        });
        setIsConnected(false);
        
        // If it's a namespace error, disable socket functionality
        if (error.message && error.message.includes('Invalid namespace')) {
          console.warn('🔌 Disabling Socket.IO due to namespace error');
          console.warn('🔌 Real-time features will be disabled. The app will still work normally.');
          setConnectionFailed(true);
          socketInstance.disconnect();
        }
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('🔌 Reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('🔌 Reconnection error:', error);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('🔌 Reconnection failed - giving up');
        setConnectionFailed(true);
      });

      setSocket(socketInstance);
    };

    // Initialize socket
    initializeSocket();

    // Cleanup on unmount
    return () => {
      // Cleanup will be handled by the socket instance
    };
  }, []);

  const joinUserRoom = (userId) => {
    if (socket && userId && !connectionFailed) {
      socket.emit('join-user-room', userId);
      console.log(`👤 Joined user room for user ${userId}`);
    }
  };

  const joinAdminRoom = () => {
    if (socket && !connectionFailed) {
      socket.emit('join-admin-room');
      console.log('👨‍💼 Joined admin room');
    }
  };

  const emitCartUpdate = (data) => {
    if (socket && !connectionFailed) {
      socket.emit('cart-updated', data);
    }
  };

  const emitOrderUpdate = (data) => {
    if (socket && !connectionFailed) {
      socket.emit('order-status-updated', data);
    }
  };

  const emitNotification = (data) => {
    if (socket && !connectionFailed) {
      socket.emit('new-notification', data);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionFailed,
        joinUserRoom,
        joinAdminRoom,
        emitCartUpdate,
        emitOrderUpdate,
        emitNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

