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


// @desc    Confirm payment and update booking
// @route   POST /api/payments/confirm-payment
// @access  Private/User
const confirmPayment = async (req, res) => {
  try {
    const { bookingId, paymentIntentId } = req.body;

    if (!bookingId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide booking ID and payment intent ID',
      });
    }

    // Get booking
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
        message: 'Not authorized',
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
      });
    }

    // Check if already processed
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed',
      });
    }

    // Update booking status
    booking.status = 'paid';
    booking.paymentStatus = 'paid';
    booking.paidAt = new Date();
    await booking.save();

    // Reduce ticket quantity
    const ticket = await Ticket.findById(booking.ticket._id);
    if (ticket) {
      ticket.quantity -= booking.bookingQuantity;
      await ticket.save();
    }

    // Create transaction record
    const transaction = await Transaction.create({
      user: req.user._id,
      booking: booking._id,
      ticket: booking.ticket._id,
      transactionId: paymentIntent.id,
      amount: booking.totalPrice,
      currency: 'BDT',
      paymentMethod: 'stripe',
      paymentStatus: 'completed',
      stripePaymentIntentId: paymentIntent.id,
      ticketTitle: booking.ticketSnapshot.title,
    });

    res.status(200).json({
      success: true,
      message: 'Payment successful! Your booking is confirmed.',
      data: {
        booking,
        transaction,
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get user's transaction history
// @route   GET /api/payments/transactions
// @access  Private/User
const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('ticket', 'title image fromLocation toLocation')
      .populate('booking', 'bookingQuantity');

    res.status(200).json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/payments/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name email')
      .populate('ticket', 'title image fromLocation toLocation')
      .populate('booking');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check authorization
    const isOwner = transaction.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction',
      });
    }

    res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};


// @desc    Get all transactions (Admin)
// @route   GET /api/payments/admin/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('ticket', 'title')
      .populate('booking');

    res.status(200).json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get Stripe publishable key
// @route   GET /api/payments/config
// @access  Public
const getStripeConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
    });
  } catch (error) {
    console.error('Get Stripe config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getTransactionHistory,
  getTransactionById,
  getAllTransactions,
  getStripeConfig,
};