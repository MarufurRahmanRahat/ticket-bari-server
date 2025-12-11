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

     // Check if vendor is marked as fraud
    if (req.user.isFraud) {
      return res.status(403).json({
        success: false,
        message: 'You are marked as fraud and cannot add tickets',
      });
    }

    // Create ticket
    const ticket = await Ticket.create({
      title,
      image,
      fromLocation,
      toLocation,
      transportType,
      price,
      quantity,
      departureDate,
      departureTime,
      perks: perks || [],
      vendor: req.user._id,
      vendorName: req.user.name,
      vendorEmail: req.user.email,
      verificationStatus: 'pending', // Initial status
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully. Waiting for admin approval.',
      data: { ticket },
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all approved tickets with filters, search, sort, pagination
// @route   GET /api/tickets
// @access  Public
const getAllTickets = async (req, res) => {
  try {
    const {
      search,
      transportType,
      sortBy,
      page = 1,
      limit = 9,
    } = req.query;

    // Build query
    let query = { verificationStatus: 'approved' };

    // Search by location (from or to)
    if (search) {
      query.$or = [
        { fromLocation: { $regex: search, $options: 'i' } },
        { toLocation: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by transport type
    if (transportType && transportType !== 'all') {
      query.transportType = transportType;
    }

    // Sort options
    let sortOptions = {};
    if (sortBy === 'price-low') {
      sortOptions.price = 1; // Low to High
    } else if (sortBy === 'price-high') {
      sortOptions.price = -1; // High to Low
    } else {
      sortOptions.createdAt = -1; // Latest first (default)
    }

    // Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

     // Execute query
    const tickets = await Ticket.find(query)
      .sort(sortOptions)
      .limit(limitNumber)
      .skip(skip)
      .populate('vendor', 'name email');

    // Get total count for pagination
    const total = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};