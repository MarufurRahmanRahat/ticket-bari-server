const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    bookingQuantity: {
      type: Number,
      required: [true, 'Booking quantity is required'],
      min: [1, 'Booking quantity must be at least 1'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'paid'],
      default: 'pending',
    },
    // Store ticket details at booking time (in case ticket gets deleted)
    ticketSnapshot: {
      title: String,
      fromLocation: String,
      toLocation: String,
      departureDate: Date,
      departureTime: String,
      transportType: String,
      unitPrice: Number,
    },
    // Payment information
    paymentIntentId: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ ticket: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual to check if booking is still valid for payment
bookingSchema.virtual('canPay').get(function () {
  if (this.status !== 'accepted' || this.paymentStatus === 'paid') {
    return false;
  }
  
  // Check if departure date has passed
  const departureDateTime = new Date(this.ticketSnapshot.departureDate);
  const [hours, minutes] = this.ticketSnapshot.departureTime.split(':');
  departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return departureDateTime > new Date();
});

// Ensure virtuals are included when converting to JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;