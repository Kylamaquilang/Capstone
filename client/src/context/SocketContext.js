'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('🔌 Connected to server:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinUserRoom = (userId) => {
    if (socket && userId) {
      socket.emit('join-user-room', userId);
      console.log(`👤 Joined user room for user ${userId}`);
    }
  };

  const joinAdminRoom = () => {
    if (socket) {
      socket.emit('join-admin-room');
      console.log('👨‍💼 Joined admin room');
    }
  };

  const emitCartUpdate = (data) => {
    if (socket) {
      socket.emit('cart-updated', data);
    }
  };

  const emitOrderUpdate = (data) => {
    if (socket) {
      socket.emit('order-status-updated', data);
    }
  };

  const emitNotification = (data) => {
    if (socket) {
      socket.emit('new-notification', data);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
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

