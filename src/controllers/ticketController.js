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


// @desc    Get latest tickets (6-8 for homepage)
// @route   GET /api/tickets/latest
// @access  Public
const getLatestTickets = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 6;

        const tickets = await Ticket.find({ verificationStatus: 'approved' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('vendor', 'name email');

        res.status(200).json({
            success: true,
            data: { tickets },
        });
    } catch (error) {
        console.error('Get latest tickets error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Get advertised tickets (max 6 for homepage)
// @route   GET /api/tickets/advertised
// @access  Public
const getAdvertisedTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({
            verificationStatus: 'approved',
            isAdvertised: true,
        })
            .limit(6)
            .populate('vendor', 'name email');

        res.status(200).json({
            success: true,
            data: { tickets },
        });
    } catch (error) {
        console.error('Get advertised tickets error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:id
// @access  Public
const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate(
            'vendor',
            'name email photoURL'
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        res.status(200).json({
            success: true,
            data: { ticket },
        });
    } catch (error) {
        console.error('Get ticket by ID error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Get vendor's own tickets
// @route   GET /api/tickets/my-tickets
// @access  Private/Vendor
const getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ vendor: req.user._id }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            data: { tickets },
        });
    } catch (error) {
        console.error('Get my tickets error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Update ticket (Vendor only - own tickets)
// @route   PUT /api/tickets/:id
// @access  Private/Vendor
const updateTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        // Check if user is the ticket owner
        if (ticket.vendor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this ticket',
            });
        }

        // Check if ticket is rejected
        if (ticket.verificationStatus === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Cannot update rejected tickets',
            });
        }

        // Check if vendor is marked as fraud
        if (req.user.isFraud) {
            return res.status(403).json({
                success: false,
                message: 'You are marked as fraud and cannot update tickets',
            });
        }

        // Update fields
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

        if (title) ticket.title = title;
        if (image) ticket.image = image;
        if (fromLocation) ticket.fromLocation = fromLocation;
        if (toLocation) ticket.toLocation = toLocation;
        if (transportType) ticket.transportType = transportType;
        if (price !== undefined) ticket.price = price;
        if (quantity !== undefined) ticket.quantity = quantity;
        if (departureDate) ticket.departureDate = departureDate;
        if (departureTime) ticket.departureTime = departureTime;
        if (perks) ticket.perks = perks;

        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            data: { ticket },
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Delete ticket (Vendor only - own tickets)
// @route   DELETE /api/tickets/:id
// @access  Private/Vendor
const deleteTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        // Check if user is the ticket owner
        if (ticket.vendor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this ticket',
            });
        }

        // Check if ticket is rejected
        if (ticket.verificationStatus === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete rejected tickets',
            });
        }

        await ticket.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully',
        });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Get all tickets for admin (including pending/rejected)
// @route   GET /api/tickets/admin/all
// @access  Private/Admin
const getAllTicketsForAdmin = async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .sort({ createdAt: -1 })
            .populate('vendor', 'name email');

        res.status(200).json({
            success: true,
            data: { tickets },
        });
    } catch (error) {
        console.error('Get all tickets for admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Approve ticket (Admin only)
// @route   PUT /api/tickets/:id/approve
// @access  Private/Admin
const approveTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        ticket.verificationStatus = 'approved';
        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Ticket approved successfully',
            data: { ticket },
        });
    } catch (error) {
        console.error('Approve ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Reject ticket (Admin only)
// @route   PUT /api/tickets/:id/reject
// @access  Private/Admin
const rejectTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        ticket.verificationStatus = 'rejected';
        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Ticket rejected successfully',
            data: { ticket },
        });
    } catch (error) {
        console.error('Reject ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

// @desc    Toggle advertise ticket (Admin only)
// @route   PUT /api/tickets/:id/advertise
// @access  Private/Admin
const toggleAdvertiseTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

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
                message: 'Only approved tickets can be advertised',
            });
        }

        // If trying to advertise, check if limit reached
        if (!ticket.isAdvertised) {
            const advertisedCount = await Ticket.countDocuments({
                isAdvertised: true,
                verificationStatus: 'approved',
            });

            if (advertisedCount >= 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 6 tickets can be advertised at a time',
                });
            }
        }

        // Toggle advertise status
        ticket.isAdvertised = !ticket.isAdvertised;
        await ticket.save();

        res.status(200).json({
            success: true,
            message: ticket.isAdvertised
                ? 'Ticket advertised successfully'
                : 'Ticket removed from advertisement',
            data: { ticket },
        });
    } catch (error) {
        console.error('Toggle advertise ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error',
        });
    }
};

module.exports = {
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
};