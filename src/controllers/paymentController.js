const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');

// @desc    Create payment intent for booking
// @route   POST /api/payments/create-payment-intent
// @access  Private/User
const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide booking ID',
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId).populate('ticket');

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
        message: 'Not authorized to pay for this booking',
      });
    }

    // Check if booking is in accepted status
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot pay for booking with status: ${booking.status}`,
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already paid',
      });
    }

    // Check if ticket has expired
    const departureDateTime = new Date(booking.ticketSnapshot.departureDate);
    const [hours, minutes] = booking.ticketSnapshot.departureTime.split(':');
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (departureDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay for expired ticket',
      });
    }

    // Check if ticket still has enough quantity
    const ticket = await Ticket.findById(booking.ticket);
    if (!ticket || ticket.quantity < booking.bookingQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Ticket no longer available',
      });
    }

    // Create Stripe payment intent
    // Amount should be in cents (multiply by 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // Convert to cents
      currency: 'bdt', // Bangladeshi Taka
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user._id.toString(),
        ticketId: booking.ticket._id.toString(),
      },
      description: `Payment for ${booking.ticketSnapshot.title}`,
    });

    // Store payment intent ID in booking
    booking.paymentIntentId = paymentIntent.id;
    await booking.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: booking.totalPrice,
      },
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};