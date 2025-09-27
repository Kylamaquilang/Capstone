'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Socket.io is temporarily disabled due to server configuration issues
    // This prevents the "Invalid namespace" errors from appearing in the console
    console.log('🔌 Socket.io temporarily disabled - real-time features unavailable');
    setIsConnected(false);
    setSocket(null);
    
    // TODO: Re-enable Socket.io once server configuration is fixed
    return () => {
      // Cleanup
    };
  }, []);

  const joinUserRoom = (userId) => {
    console.log(`👤 Socket.io disabled - cannot join user room for user ${userId}`);
  };

  const joinAdminRoom = () => {
    console.log('👨‍💼 Socket.io disabled - cannot join admin room');
  };

  const emitCartUpdate = (data) => {
    console.log('🛒 Socket.io disabled - cart update not sent');
  };

  const emitOrderUpdate = (data) => {
    console.log('📦 Socket.io disabled - order update not sent');
  };

  const emitNotification = (data) => {
    console.log('🔔 Socket.io disabled - notification not sent');
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

