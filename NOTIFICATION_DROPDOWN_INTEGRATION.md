# User Notification Dropdown System

## Overview
A comprehensive notification dropdown system for the user side of the school product e-commerce platform. The system provides real-time notifications for order updates, payment status, and engagement messages.

## Components

### 1. NotificationBell Component
**File**: `client/src/components/notifications/NotificationBell.jsx`

The main notification bell icon that integrates with the navbar.

**Features**:
- Animated unread count badge
- Click to open dropdown
- Auto-refresh unread count
- Loading states
- Click outside to close

**Props**:
```javascript
{
  userType: 'user', // Type of user (user/admin)
  userId: '1'       // User ID for fetching notifications
}
```

### 2. UserNotificationDropdown Component
**File**: `client/src/components/notifications/UserNotificationDropdown.jsx`

The main dropdown panel that displays notifications.

**Features**:
- Scrollable notification list
- Unread notification highlighting
- Mark as read/unread functionality
- Delete notifications
- "View All Notifications" link
- Real-time timestamp updates
- Priority-based styling

**Props**:
```javascript
{
  isOpen: boolean,    // Whether dropdown is open
  onClose: function,  // Function to close dropdown
  userId: string     // User ID for notifications
}
```

### 3. Notification Templates
**File**: `client/src/utils/notificationTemplates.js`

Utility functions for generating notification templates and formatting timestamps.

**Templates Available**:
- **Order Updates**: Confirmed, Ready for Pickup, Shipped
- **Payment Updates**: Pending, Success, Failed
- **Engagement**: Thank You, Feedback Requests
- **Product Updates**: Back in Stock
- **System**: Welcome, Maintenance

## Integration

### Step 1: Update Navbar
Replace the existing notification link in your navbar:

```javascript
// Before
<Link href="/notification">
  <Badge count={notificationCount}>
    <BellIcon className="h-6 w-6 text-white" />
  </Badge>
</Link>

// After
<NotificationBell userType="user" userId={userId} />
```

### Step 2: Import Components
```javascript
import NotificationBell from '@/components/notifications/NotificationBell';
```

### Step 3: Pass User Data
```javascript
<NotificationBell userType="user" userId={currentUser.id} />
```

## Notification Types

### Order Updates
- **Order Confirmed**: When an order is confirmed and being prepared
- **Ready for Pickup**: When order is ready for collection
- **Order Shipped**: When order has been shipped

### Payment Updates
- **Payment Pending**: When payment is awaiting completion
- **Payment Success**: When payment is processed successfully
- **Payment Failed**: When payment processing fails

### Engagement
- **Thank You**: Appreciation messages after orders
- **Feedback Request**: Requests for customer feedback

### Product Updates
- **Back in Stock**: When previously out-of-stock items are available

### System Notifications
- **Welcome**: Initial welcome message for new users
- **Maintenance**: System maintenance notifications

## Styling Features

### Visual Indicators
- **Unread Badge**: Red circular badge with count
- **Unread Highlight**: Blue left border and background
- **Priority Colors**: 
  - High: Red text
  - Medium: Yellow text
  - Low: Blue text

### Responsive Design
- **Mobile**: Full-width dropdown
- **Desktop**: Fixed 320px width
- **Scrollable**: Max height with scroll for many notifications

### Animations
- **Badge Pulse**: Unread count badge pulses
- **Hover Effects**: Smooth transitions on hover
- **Loading States**: Spinner animations

## API Integration

### Current Implementation
The system currently uses sample data for demonstration. To integrate with real APIs:

### 1. Load Notifications
```javascript
const loadNotifications = async () => {
  try {
    const response = await fetch(`/api/notifications/${userId}`);
    const data = await response.json();
    setNotifications(data);
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
};
```

### 2. Mark as Read
```javascript
const markAsRead = async (notificationId) => {
  try {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    // Update local state
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};
```

### 3. Delete Notification
```javascript
const deleteNotification = async (notificationId) => {
  try {
    await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    });
    // Update local state
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};
```

## Timestamp Formatting

The system includes intelligent timestamp formatting:

- **Just Now**: Less than 1 minute
- **X minutes ago**: 1-59 minutes
- **X hours ago**: 1-23 hours
- **X days ago**: 1-6 days
- **DD MMM, YYYY**: 7+ days (e.g., "28 Jan, 2024")

## Best Practices

### 1. Performance
- Load notifications only when dropdown opens
- Implement pagination for large notification lists
- Use debouncing for API calls

### 2. User Experience
- Show loading states during API calls
- Provide clear error messages
- Allow bulk actions (mark all as read)

### 3. Accessibility
- Use proper ARIA labels
- Ensure keyboard navigation
- Provide screen reader support

### 4. Security
- Validate user permissions
- Sanitize notification content
- Implement rate limiting

## Demo Component

**File**: `client/src/components/notifications/NotificationDropdownDemo.jsx`

A comprehensive demo component showcasing all notification features and integration examples.

## File Structure

```
client/src/
├── components/
│   └── notifications/
│       ├── NotificationBell.jsx
│       ├── UserNotificationDropdown.jsx
│       └── NotificationDropdownDemo.jsx
├── utils/
│   └── notificationTemplates.js
└── components/
    └── common/
        └── nav-bar.js (updated)
```

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live notifications
- **Push Notifications**: Browser push notification support
- **Notification Categories**: Filter by notification type
- **Bulk Actions**: Select multiple notifications for actions
- **Notification Sounds**: Audio alerts for important notifications
- **Rich Content**: Support for images and links in notifications

### API Endpoints Needed
- `GET /api/notifications/:userId` - Fetch user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:id/unread` - Mark as unread
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/:userId/unread-count` - Get unread count

## Troubleshooting

### Common Issues
1. **Dropdown not opening**: Check if `isOpen` state is properly managed
2. **Notifications not loading**: Verify API endpoints and user authentication
3. **Styling issues**: Ensure Tailwind CSS classes are properly imported
4. **Performance issues**: Implement pagination and debouncing

### Debug Mode
Enable debug logging by setting:
```javascript
const DEBUG = true; // In notification components
```

This will log all API calls and state changes to the console.

## Support

For issues or questions about the notification system:
1. Check the demo component for examples
2. Review the API integration section
3. Verify all required props are passed
4. Check browser console for errors
