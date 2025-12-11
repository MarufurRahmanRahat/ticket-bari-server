const Ticket = require('../models/Ticket');
const User = require('../models/User');

// @desc    Create new ticket (Vendor only)
// @route   POST /api/tickets
// @access  Private/Vendor
const createTicket = async (req, res) => {
  try {
    const {
      title,
      image,
      fromLocation,
      toLocation,
      transportType,
      price,
      quantity,
      departureDate,
      departureTime,
      perks,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !image ||
      !fromLocation ||
      !toLocation ||
      !transportType ||
      !price ||
      !quantity ||
      !departureDate ||
      !departureTime
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }
