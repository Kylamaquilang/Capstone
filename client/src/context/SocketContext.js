'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.io connection
    const socketInstance = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket.io connected successfully');
      setIsConnected(true);
      setSocket(socketInstance);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket.io disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Socket.io connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinUserRoom = (userId) => {
    if (socket && isConnected) {
      socket.emit('join-user-room', userId);
      console.log(`👤 Joined user room for user ${userId}`);
    } else {
      console.log(`👤 Socket not connected - cannot join user room for user ${userId}`);
    }
  };

  const joinAdminRoom = () => {
    if (socket && isConnected) {
      socket.emit('join-admin-room');
      console.log('👨‍💼 Joined admin room');
    } else {
      console.log('👨‍💼 Socket not connected - cannot join admin room');
    }
  };

  const emitCartUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('cart-update', data);
      console.log('🛒 Cart update sent via Socket.io');
    } else {
      console.log('🛒 Socket not connected - cart update not sent');
    }
  };

  const emitOrderUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('order-update', data);
      console.log('📦 Order update sent via Socket.io');
    } else {
      console.log('📦 Socket not connected - order update not sent');
    }
  };

  const emitNotification = (data) => {
    if (socket && isConnected) {
      socket.emit('notification', data);
      console.log('🔔 Notification sent via Socket.io');
    } else {
      console.log('🔔 Socket not connected - notification not sent');
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

