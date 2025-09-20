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
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Notifications</h1>
                <p className="text-sm text-gray-600">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5v-5zM4.5 19.5h15a2 2 0 002-2v-15a2 2 0 00-2-2h-15a2 2 0 00-2 2v15a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-600">You're all caught up! New notifications will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow ${
                    !notification.is_read ? 'border-l-4 border-l-[#000C50]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {notification.title || 'Notification'}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-1.5 h-1.5 bg-[#000C50] rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-2 leading-relaxed">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <>
                              {notification.message && notification.message.includes('delivered successfully') ? (
                                <button
                                  onClick={() => {
                                    const orderId = notification.related_id || 
                                      (notification.message.match(/order #(\d+)/) ? notification.message.match(/order #(\d+)/)[1] : null);
                                    if (orderId) confirmOrderReceived(orderId);
                                  }}
                                  disabled={confirmingOrder}
                                  className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                                >
                                  {confirmingOrder ? 'Processing...' : 'Confirm'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                >
                                  Mark read
                                </button>
                              )}
                            </>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
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
