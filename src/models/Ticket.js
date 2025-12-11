const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide ticket title'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please provide ticket image'],
    },
    fromLocation: {
      type: String,
      required: [true, 'Please provide departure location'],
      trim: true,
    },
    toLocation: {
      type: String,
      required: [true, 'Please provide destination location'],
      trim: true,
    },
    transportType: {
      type: String,
      required: [true, 'Please provide transport type'],
      enum: ['Bus', 'Train', 'Launch', 'Plane'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide ticket price'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide ticket quantity'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    departureDate: {
      type: Date,
      required: [true, 'Please provide departure date'],
    },
    departureTime: {
      type: String,
      required: [true, 'Please provide departure time'],
    },
    perks: {
      type: [String],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isAdvertised: {
      type: Boolean,
      default: false,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor is required'],
    },
    vendorName: {
      type: String,
      required: true,
    },
    vendorEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


// Index for better search performance
ticketSchema.index({ fromLocation: 1, toLocation: 1, transportType: 1 });
ticketSchema.index({ verificationStatus: 1, isAdvertised: 1 });
ticketSchema.index({ createdAt: -1 }); // For latest tickets

// Virtual field to check if ticket is expired
ticketSchema.virtual('isExpired').get(function () {
  const departureDateTime = new Date(this.departureDate);
  const [hours, minutes] = this.departureTime.split(':');
  departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return departureDateTime < new Date();
});


// Ensure virtuals are included when converting to JSON
ticketSchema.set('toJSON', { virtuals: true });
ticketSchema.set('toObject', { virtuals: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;