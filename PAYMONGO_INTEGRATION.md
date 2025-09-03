# PayMongo GCash Integration Guide

This guide explains how to set up and use the PayMongo GCash payment integration in your CPC Store application.

## 🚀 Features

- **Secure GCash Payments**: Process payments through PayMongo's secure gateway
- **Multiple Payment Options**: Support for both GCash and cash payments
- **Payment Status Tracking**: Real-time payment status updates
- **Webhook Integration**: Automatic order status updates
- **Payment History**: Complete payment transaction records
- **Error Handling**: Comprehensive error handling and user feedback

## 📋 Prerequisites

1. **PayMongo Account**: Sign up at [PayMongo](https://paymongo.com)
2. **API Keys**: Get your test and live API keys from PayMongo dashboard
3. **Webhook URL**: Configure webhook endpoint for payment notifications

## 🔧 Setup Instructions

### 1. Environment Configuration

Add the following variables to your `.env` file:

```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_your_paymongo_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_paymongo_public_key_here

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_here
```

### 2. Database Migration

Run the payment fields migration:

```bash
cd api
node src/scripts/add_payment_fields.js
```

This will add the following to your database:
- Payment fields to `orders` table
- `payment_transactions` table
- Payment-related indexes

### 3. Install Dependencies

```bash
cd api
npm install axios
```

## 🏗️ Architecture

### Backend Components

1. **Payment Controller** (`api/src/controllers/payment.controller.js`)
   - `createGCashPayment()`: Creates PayMongo payment intent
   - `handlePayMongoWebhook()`: Processes payment notifications
   - `getPaymentStatus()`: Retrieves payment status
   - `cancelPayment()`: Cancels pending payments

2. **Payment Routes** (`api/src/routes/payment.routes.js`)
   - `POST /api/payments/gcash/create`: Create GCash payment
   - `GET /api/payments/status/:orderId`: Get payment status
   - `POST /api/payments/cancel/:orderId`: Cancel payment
   - `POST /api/payments/webhook/paymongo`: Webhook endpoint

3. **Database Tables**
   - `orders`: Enhanced with payment fields
   - `payment_transactions`: Payment transaction records

### Frontend Components

1. **Checkout Page** (`client/src/app/checkout/page.js`)
   - Payment method selection
   - GCash payment processing
   - Order creation and payment flow

2. **Payment Success Page** (`client/src/app/payment/success/page.js`)
   - Payment confirmation
   - Order details display
   - Next steps information

3. **Payment Cancel Page** (`client/src/app/payment/cancel/page.js`)
   - Payment failure handling
   - Retry payment options
   - Order cancellation

## 💳 Payment Flow

### GCash Payment Process

1. **User selects GCash** in checkout page
2. **Order is created** with pending payment status
3. **PayMongo payment intent** is created
4. **GCash payment method** is attached
5. **User is redirected** to PayMongo payment page
6. **Payment is processed** through GCash
7. **Webhook notification** updates order status
8. **User is redirected** to success/cancel page

### Cash Payment Process

1. **User selects "Pay upon pickup"**
2. **Order is created** with cash payment method
3. **Order status** is set to pending
4. **User receives confirmation** to pay at counter

## 🔗 API Endpoints

### Payment Endpoints

```javascript
// Create GCash payment
POST /api/payments/gcash/create
{
  "orderId": "123",
  "amount": 450.00,
  "description": "Order #123 - CPC Store"
}

// Get payment status
GET /api/payments/status/:orderId

// Cancel payment
POST /api/payments/cancel/:orderId

// PayMongo webhook
POST /api/payments/webhook/paymongo
```

### Response Examples

**Successful Payment Creation:**
```json
{
  "success": true,
  "payment_intent_id": "pi_xxx",
  "client_key": "pk_test_xxx",
  "payment_url": "https://paymongo.link/xxx",
  "payment_data": { ... }
}
```

**Payment Status:**
```json
{
  "order_id": "123",
  "payment_status": "paid",
  "paymongo_status": "succeeded",
  "payment_data": { ... }
}
```

## 🛡️ Security Features

1. **Authentication**: All payment endpoints require JWT authentication
2. **Order Ownership**: Users can only access their own orders
3. **Payment Validation**: Server-side payment validation
4. **Webhook Verification**: PayMongo signature verification (to be implemented)
5. **Error Handling**: Comprehensive error handling and logging

## 📊 Database Schema

### Orders Table Enhancements

```sql
ALTER TABLE orders ADD COLUMN payment_intent_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN payment_status ENUM("pending", "paid", "failed", "cancelled", "refunded") DEFAULT "pending";
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT "cash";
ALTER TABLE orders ADD COLUMN payment_date DATETIME NULL;
ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255) NULL;
```

### Payment Transactions Table

```sql
CREATE TABLE payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending',
  gateway_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

## 🧪 Testing

### Test Environment

1. **Use PayMongo test keys** for development
2. **Test GCash payments** using PayMongo's test environment
3. **Verify webhook handling** with test events
4. **Test error scenarios** (insufficient funds, cancelled payments)

### Test Cards

PayMongo provides test cards for different scenarios:
- **Successful payment**: Use any valid test card
- **Failed payment**: Use specific test card numbers
- **Pending payment**: Use cards that require additional authentication

## 🚨 Error Handling

### Common Error Scenarios

1. **Insufficient Funds**: User doesn't have enough GCash balance
2. **Payment Cancelled**: User cancels payment on PayMongo page
3. **Network Issues**: Connection problems during payment
4. **Invalid Order**: Order not found or already paid
5. **Webhook Failures**: Payment notifications not received

### Error Responses

```json
{
  "error": "Payment processing failed",
  "details": "Insufficient funds in GCash account"
}
```

## 🔄 Webhook Configuration

### PayMongo Webhook Setup

1. **Log into PayMongo Dashboard**
2. **Go to Webhooks section**
3. **Add webhook endpoint**: `https://yourdomain.com/api/payments/webhook/paymongo`
4. **Select events**: `payment_intent.succeeded`, `payment_intent.failed`
5. **Save webhook configuration**

### Webhook Events Handled

- `payment_intent.succeeded`: Updates order to paid status
- `payment_intent.failed`: Updates order to failed status
- `payment_intent.cancelled`: Updates order to cancelled status

## 📱 User Experience

### Checkout Flow

1. **Cart Review**: User reviews items and total
2. **Payment Selection**: Choose between GCash or cash
3. **GCash Processing**: Redirect to PayMongo for payment
4. **Payment Confirmation**: Success or failure page
5. **Order Tracking**: View order status in profile

### Payment Status Indicators

- 🟡 **Pending**: Payment being processed
- 🟢 **Paid**: Payment successful
- 🔴 **Failed**: Payment failed
- ⚫ **Cancelled**: Payment cancelled

## 🔧 Configuration Options

### Environment Variables

```env
# PayMongo Configuration
PAYMONGO_SECRET_KEY=sk_test_xxx
PAYMONGO_PUBLIC_KEY=pk_test_xxx

# Client Configuration
CLIENT_URL=http://localhost:3000

# Webhook Configuration
WEBHOOK_SECRET=your_secret_here
```

### Payment Settings

- **Currency**: PHP (Philippine Peso)
- **Capture Method**: Automatic
- **Statement Descriptor**: CPC Store
- **Return URLs**: Success and cancel pages

## 📈 Monitoring & Analytics

### Payment Metrics

Track the following metrics:
- **Payment Success Rate**: Successful vs failed payments
- **Average Payment Time**: Time from creation to completion
- **Payment Method Distribution**: GCash vs cash payments
- **Error Rates**: Common payment failures

### Logging

All payment activities are logged:
- Payment creation attempts
- Webhook events received
- Payment status changes
- Error occurrences

## 🚀 Deployment

### Production Checklist

1. **Switch to live PayMongo keys**
2. **Configure production webhook URL**
3. **Set up SSL certificate** for webhook endpoint
4. **Configure error monitoring** (Sentry, etc.)
5. **Set up payment analytics** tracking
6. **Test complete payment flow** in production

### Security Checklist

1. **Verify webhook signatures**
2. **Implement rate limiting** on payment endpoints
3. **Add payment amount validation**
4. **Set up fraud detection** (if needed)
5. **Monitor for suspicious activities**

## 🆘 Support & Troubleshooting

### Common Issues

1. **Payment not processing**: Check PayMongo API keys
2. **Webhook not receiving**: Verify webhook URL and SSL
3. **Order status not updating**: Check webhook processing
4. **Payment URL not working**: Verify PayMongo configuration

### Debug Steps

1. **Check server logs** for payment errors
2. **Verify PayMongo dashboard** for payment status
3. **Test webhook endpoint** manually
4. **Check database** for payment records

## 📚 Additional Resources

- [PayMongo Documentation](https://developers.paymongo.com/)
- [PayMongo API Reference](https://developers.paymongo.com/reference)
- [GCash Integration Guide](https://developers.paymongo.com/docs/gcash)
- [Webhook Documentation](https://developers.paymongo.com/docs/webhooks)

---

This integration provides a complete GCash payment solution for your CPC Store application. Follow the setup instructions carefully and test thoroughly before going live.
