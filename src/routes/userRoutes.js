const express = require('express');
const {
  getAllUsers,
  getUserById,
  makeUserAdmin,
  makeUserVendor,
  markVendorAsFraud,
  unmarkVendorAsFraud,
  deleteUser,
  getUserStats,
  searchUsers,
  getUsersByRole,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes are admin-only
router.use(protect, authorize('admin'));

// User management routes
router.get('/', getAllUsers); // Get all users
router.get('/stats', getUserStats); // Get user statistics
router.get('/search', searchUsers); // Search users
router.get('/role/:role', getUsersByRole); // Get users by role
router.get('/:id', getUserById); // Get user by ID

// User role management
router.put('/:id/make-admin', makeUserAdmin); // Make user admin
router.put('/:id/make-vendor', makeUserVendor); // Make user vendor

// Fraud management
router.put('/:id/mark-fraud', markVendorAsFraud); // Mark vendor as fraud
router.put('/:id/unmark-fraud', unmarkVendorAsFraud); // Unmark vendor as fraud

// Delete user
router.delete('/:id', deleteUser); // Delete user

module.exports = router;