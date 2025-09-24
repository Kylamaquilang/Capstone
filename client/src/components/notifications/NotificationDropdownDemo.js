'use client';

import React, { useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { generateSampleNotifications } from '@/utils/notificationTemplates';

const NotificationDropdownDemo = () => {
  const [userId] = useState('1');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            User Notification Dropdown Demo
          </h1>
          
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">
              Click the notification bell to see the professional dropdown in action
            </p>
            
            {/* Demo Notification Bell */}
            <div className="inline-block">
              <NotificationBell userType="user" userId={userId} />
            </div>
          </div>

          {/* Features List */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Order Updates
              </h3>
              <ul className="text-blue-800 space-y-2">
                <li>• Order confirmed notifications</li>
                <li>• Ready for pickup alerts</li>
                <li>• Shipping updates</li>
              </ul>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                Payment Updates
              </h3>
              <ul className="text-green-800 space-y-2">
                <li>• Payment pending reminders</li>
                <li>• Payment success confirmations</li>
                <li>• Payment failed alerts</li>
              </ul>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">
                Engagement
              </h3>
              <ul className="text-purple-800 space-y-2">
                <li>• Thank you messages</li>
                <li>• Feedback requests</li>
                <li>• Welcome messages</li>
              </ul>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900 mb-3">
                Features
              </h3>
              <ul className="text-orange-800 space-y-2">
                <li>• Unread notification badges</li>
                <li>• Mark as read/unread</li>
                <li>• Delete notifications</li>
                <li>• Scrollable list</li>
              </ul>
            </div>
          </div>

          {/* Sample Notifications Preview */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sample Notifications Preview
            </h3>
            <div className="space-y-3">
              {generateSampleNotifications().slice(0, 3).map((notification, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.timestamp.toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Instructions */}
          <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              Integration Instructions
            </h3>
            <div className="text-yellow-800 space-y-2">
              <p><strong>1.</strong> Import the NotificationBell component in your navbar</p>
              <p><strong>2.</strong> Replace the existing notification link with the NotificationBell</p>
              <p><strong>3.</strong> Pass the userType and userId props</p>
              <p><strong>4.</strong> The dropdown will automatically handle notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdownDemo;
