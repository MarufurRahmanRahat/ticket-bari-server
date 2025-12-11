const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  getVendorBookingRequests,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getVendorRevenue,
  getAllBookings,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// User routes
router.post('/', protect, authorize('user'), createBooking); // Create booking
router.get('/my-bookings', protect, authorize('user'), getMyBookings); // Get user's bookings
router.delete('/:id', protect, authorize('user'), cancelBooking); // Cancel booking

// Vendor routes
router.get(
  '/vendor/requests',
  protect,
  authorize('vendor'),
  getVendorBookingRequests
); // Get booking requests
router.put('/:id/accept', protect, authorize('vendor'), acceptBooking); // Accept booking
router.put('/:id/reject', protect, authorize('vendor'), rejectBooking); // Reject booking
router.get('/vendor/revenue', protect, authorize('vendor'), getVendorRevenue); // Get revenue

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllBookings); // Get all bookings

// Common routes (accessible by user, vendor, admin based on ownership)
router.get('/:id', protect, getBookingById); // Get single booking

module.exports = router;