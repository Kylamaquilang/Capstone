'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/NotificationContext';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Swal from 'sweetalert2';

export default function NotificationPage() {
  const { user, isAuthenticated } = useAuth();
  const { decrementNotificationCount, updateNotificationCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingOrder, setConfirmingOrder] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const response = await API.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, is_read: 1 }
              : notification
          )
        );
        
        // Decrement notification count
        decrementNotificationCount();
        
        Swal.fire({
          icon: 'success',
          title: 'Marked as Read',
          text: 'Notification marked as read',
          confirmButtonColor: '#000C50',
        });
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark notification as read',
        confirmButtonColor: '#000C50',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await Swal.fire({
        title: 'Mark All as Read',
        text: 'Are you sure you want to mark all notifications as read?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, mark all!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await API.put('/notifications/mark-all-read');
        if (response.data.success) {
          setNotifications(prev => 
            prev.map(notification => ({ ...notification, is_read: 1 }))
          );
          
          // Update notification count to 0
          updateNotificationCount(0);
          
          Swal.fire({
            icon: 'success',
            title: 'All Marked as Read',
            text: 'All notifications marked as read',
            confirmButtonColor: '#000C50',
          });
        }
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark all notifications as read',
        confirmButtonColor: '#000C50',
      });
    }
  };

  const deleteNotification = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Notification',
        text: 'Are you sure you want to delete this notification?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await API.delete(`/notifications/${id}`);
        if (response.data.success) {
          setNotifications(prev => prev.filter(notification => notification.id !== id));

    Swal.fire({
      icon: 'success',
            title: 'Deleted',
            text: 'Notification deleted successfully',
            confirmButtonColor: '#000C50',
          });
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete notification',
      confirmButtonColor: '#000C50',
    });
    }
  };

  const confirmOrderReceived = async (orderId) => {
    try {
      setConfirmingOrder(orderId);
      
      const result = await Swal.fire({
        title: 'Confirm Order Receipt',
        text: 'Have you received your order?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, I received it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await API.post(`/orders/${orderId}/user-confirm`);
        
        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Order Confirmed!',
            text: 'Thank you for confirming receipt! Your order has been completed and an email receipt has been sent to you.',
            confirmButtonColor: '#000C50',
          });
          
          // Refresh notifications
          fetchNotifications();
        }
      }
    } catch (err) {
      console.error('Error confirming order:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to confirm order receipt',
        confirmButtonColor: '#000C50',
      });
    } finally {
      setConfirmingOrder(null);
    }
  };

  if (loading) {
  return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
      <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading notifications...</p>
            </div>
                </div>
              </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-red-600 text-lg mb-4">{error}</p>
                <button
                onClick={fetchNotifications}
                className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
                >
                Try Again
                </button>
              </div>
            </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />

        <main className="flex-grow px-6 py-10 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[#000C50]">Notifications</h1>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Mark All as Read
            </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔔</div>
              <p className="text-gray-600 text-lg mb-4">No notifications yet</p>
              <p className="text-gray-500">You'll see notifications here when you receive them.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    notification.is_read ? 'border-gray-300' : 'border-[#000C50]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notification.title || 'Notification'}
                      </h3>
                      <p className="text-gray-800 mb-2">{notification.message}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!notification.is_read && (
                        <>
                          {notification.message && notification.message.includes('delivered successfully') ? (
                            <button
                              onClick={() => {
                                // Extract order ID from related_id or try to find it in the message
                                const orderId = notification.related_id || 
                                  (notification.message.match(/order #(\d+)/) ? notification.message.match(/order #(\d+)/)[1] : null);
                                if (orderId) confirmOrderReceived(orderId);
                              }}
                              disabled={confirmingOrder}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              {confirmingOrder ? 'Processing...' : 'Order Received'}
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}
        </main>

      <Footer />
    </div>
    </ProtectedRoute>
  );
}
