const express = require('express');
const {
  createPaymentIntent,
  confirmPayment,
  getTransactionHistory,
  getTransactionById,
  getAllTransactions,
  getStripeConfig,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public route
router.get('/config', getStripeConfig); // Get Stripe publishable key

// User routes
router.post(
  '/create-payment-intent',
  protect,
  authorize('user'),
  createPaymentIntent
); // Create payment intent
router.post('/confirm-payment', protect, authorize('user'), confirmPayment); // Confirm payment
router.get(
  '/transactions',
  protect,
  authorize('user'),
  getTransactionHistory
); // Get transaction history

// Common routes
router.get('/transactions/:id', protect, getTransactionById); // Get single transaction

// Admin routes
router.get(
  '/admin/transactions',
  protect,
  authorize('admin'),
  getAllTransactions
); // Get all transactions

module.exports = router;