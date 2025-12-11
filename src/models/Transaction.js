const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket is required'],
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'BDT',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'card', 'other'],
      default: 'stripe',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    stripePaymentIntentId: {
      type: String,
      required: false,
    },
    // Store ticket title for easy reference
    ticketTitle: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;