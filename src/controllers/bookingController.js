const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

// @desc    Create new booking (User)
// @route   POST /api/bookings
// @access  Private/User
const createBooking = async (req, res) => {
  try {
    const { ticketId, bookingQuantity } = req.body;

    // Validate required fields
    if (!ticketId || !bookingQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide ticket ID and booking quantity',
      });
    }

    // Validate quantity
    if (bookingQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Booking quantity must be at least 1',
      });
    }

    // Get ticket details
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Check if ticket is approved
    if (ticket.verificationStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This ticket is not available for booking',
      });
    }

    // Check if ticket has expired
    const departureDateTime = new Date(ticket.departureDate);
    const [hours, minutes] = ticket.departureTime.split(':');
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (departureDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This ticket has already departed',
      });
    }

    // Check if enough quantity available
    if (bookingQuantity > ticket.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${ticket.quantity} tickets available`,
      });
    }

    // Calculate total price
    const totalPrice = ticket.price * bookingQuantity;

    // Create booking with ticket snapshot
    const booking = await Booking.create({
      ticket: ticketId,
      user: req.user._id,
      bookingQuantity,
      totalPrice,
      status: 'pending', // Initial status
      ticketSnapshot: {
        title: ticket.title,
        fromLocation: ticket.fromLocation,
        toLocation: ticket.toLocation,
        departureDate: ticket.departureDate,
        departureTime: ticket.departureTime,
        transportType: ticket.transportType,
        unitPrice: ticket.price,
      },
    });

    // Populate user and ticket details
    await booking.populate('user', 'name email');
    await booking.populate('ticket', 'title image fromLocation toLocation');

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully. Waiting for vendor approval.',
      data: { booking },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};


// @desc    Get user's own bookings
// @route   GET /api/bookings/my-bookings
// @access  Private/User
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('ticket', 'title image fromLocation toLocation transportType')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email photoURL')
      .populate('ticket', 'title image fromLocation toLocation transportType vendor');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization (user can see their own, vendor can see their ticket bookings)
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isVendor =
      req.user.role === 'vendor' &&
      booking.ticket.vendor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get bookings for vendor's tickets (Requested Bookings)
// @route   GET /api/bookings/vendor/requests
// @access  Private/Vendor
const getVendorBookingRequests = async (req, res) => {
  try {
    // Get all tickets by this vendor
    const vendorTickets = await Ticket.find({ vendor: req.user._id });
    const ticketIds = vendorTickets.map((ticket) => ticket._id);

    // Get all bookings for these tickets
    const bookings = await Booking.find({ ticket: { $in: ticketIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'name email photoURL')
      .populate('ticket', 'title image fromLocation toLocation transportType');

    res.status(200).json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    console.error('Get vendor booking requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};


// @desc    Accept booking (Vendor)
// @route   PUT /api/bookings/:id/accept
// @access  Private/Vendor
const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('ticket');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if vendor owns this ticket
    if (booking.ticket.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this booking',
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking with status: ${booking.status}`,
      });
    }

    // Check if ticket has expired
    const departureDateTime = new Date(booking.ticketSnapshot.departureDate);
    const [hours, minutes] = booking.ticketSnapshot.departureTime.split(':');
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (departureDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept booking for expired ticket',
      });
    }

    // Update booking status
    booking.status = 'accepted';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: { booking },
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Reject booking (Vendor)
// @route   PUT /api/bookings/:id/reject
// @access  Private/Vendor
const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('ticket');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if vendor owns this ticket
    if (booking.ticket.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this booking',
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject booking with status: ${booking.status}`,
      });
    }

    // Update booking status
    booking.status = 'rejected';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking rejected',
      data: { booking },
    });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Cancel booking (User - only before vendor accepts)
// @route   DELETE /api/bookings/:id
// @access  Private/User
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Can only cancel if status is pending
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending bookings',
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get vendor revenue overview
// @route   GET /api/bookings/vendor/revenue
// @access  Private/Vendor
const getVendorRevenue = async (req, res) => {
  try {
    // Get all tickets by this vendor
    const vendorTickets = await Ticket.find({ vendor: req.user._id });
    const ticketIds = vendorTickets.map((ticket) => ticket._id);

    // Get all paid bookings for these tickets
    const paidBookings = await Booking.find({
      ticket: { $in: ticketIds },
      status: 'paid',
    });

    // Calculate total revenue
    const totalRevenue = paidBookings.reduce(
      (sum, booking) => sum + booking.totalPrice,
      0
    );

    // Calculate total tickets sold
    const totalTicketsSold = paidBookings.reduce(
      (sum, booking) => sum + booking.bookingQuantity,
      0
    );

    // Total tickets added
    const totalTicketsAdded = vendorTickets.length;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalTicketsSold,
        totalTicketsAdded,
        currency: 'BDT',
      },
    });
  } catch (error) {
    console.error('Get vendor revenue error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings/admin/all
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('ticket', 'title fromLocation toLocation transportType vendor');

    res.status(200).json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getVendorBookingRequests,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getVendorRevenue,
  getAllBookings,
};