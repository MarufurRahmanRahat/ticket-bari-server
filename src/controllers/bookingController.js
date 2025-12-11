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
