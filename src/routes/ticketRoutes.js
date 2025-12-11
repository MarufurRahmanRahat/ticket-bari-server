const express = require('express');
const {
  createTicket,
  getAllTickets,
  getLatestTickets,
  getAdvertisedTickets,
  getTicketById,
  getMyTickets,
  updateTicket,
  deleteTicket,
  getAllTicketsForAdmin,
  approveTicket,
  rejectTicket,
  toggleAdvertiseTicket,
} = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const { authorize, checkFraudStatus } = require('../middleware/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllTickets); // Get all approved tickets (with filters)
router.get('/latest', getLatestTickets); // Get latest tickets for homepage
router.get('/advertised', getAdvertisedTickets); // Get advertised tickets
router.get('/:id', getTicketById); // Get single ticket

// Vendor routes (protected)
router.post(
  '/',
  protect,
  authorize('vendor'),
  checkFraudStatus,
  createTicket
); // Create ticket
router.get('/vendor/my-tickets', protect, authorize('vendor'), getMyTickets); // Get vendor's tickets
router.put(
  '/:id',
  protect,
  authorize('vendor'),
  checkFraudStatus,
  updateTicket
); // Update ticket
router.delete(
  '/:id',
  protect,
  authorize('vendor'),
  checkFraudStatus,
  deleteTicket
); // Delete ticket

// Admin routes (protected)
router.get('/admin/all', protect, authorize('admin'), getAllTicketsForAdmin); // Get all tickets
router.put('/:id/approve', protect, authorize('admin'), approveTicket); // Approve ticket
router.put('/:id/reject', protect, authorize('admin'), rejectTicket); // Reject ticket
router.put('/:id/advertise', protect, authorize('admin'), toggleAdvertiseTicket); // Toggle advertise

module.exports = router;