const User = require('../models/User');
const Ticket = require('../models/Ticket');

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Make user admin (Admin only)
// @route   PUT /api/users/:id/make-admin
// @access  Private/Admin
const makeUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent making yourself non-admin
    if (req.user._id.toString() === user._id.toString() && user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own admin role',
      });
    }

    // Update role to admin
    user.role = 'admin';
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} is now an admin`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Make user admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Make user vendor (Admin only)
// @route   PUT /api/users/:id/make-vendor
// @access  Private/Admin
const makeUserVendor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Cannot change admin to vendor
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change admin user to vendor',
      });
    }

    // Update role to vendor
    user.role = 'vendor';
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} is now a vendor`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Make user vendor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Mark vendor as fraud (Admin only)
// @route   PUT /api/users/:id/mark-fraud
// @access  Private/Admin
const markVendorAsFraud = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is a vendor
    if (user.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'Only vendors can be marked as fraud',
      });
    }

    // Mark as fraud
    user.isFraud = true;
    await user.save();

    // Hide all tickets from this vendor
    await Ticket.updateMany(
      { vendor: user._id },
      { verificationStatus: 'rejected', isAdvertised: false }
    );

    res.status(200).json({
      success: true,
      message: `${user.name} has been marked as fraud. All tickets hidden.`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isFraud: user.isFraud,
        },
      },
    });
  } catch (error) {
    console.error('Mark vendor as fraud error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Unmark vendor as fraud (Admin only)
// @route   PUT /api/users/:id/unmark-fraud
// @access  Private/Admin
const unmarkVendorAsFraud = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is a vendor
    if (user.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor',
      });
    }

    // Unmark fraud
    user.isFraud = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} is no longer marked as fraud`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isFraud: user.isFraud,
        },
      },
    });
  } catch (error) {
    console.error('Unmark vendor as fraud error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting yourself
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get user statistics (Admin)
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const fraudVendors = await User.countDocuments({
      role: 'vendor',
      isFraud: true,
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalAdmins,
        fraudVendors,
        total: totalUsers + totalVendors + totalAdmins,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Search users by name or email (Admin)
// @route   GET /api/users/search
// @access  Private/Admin
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query',
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(10);

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get users by role (Admin)
// @route   GET /api/users/role/:role
// @access  Private/Admin
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, vendor, or admin',
      });
    }

    const users = await User.find({ role }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  makeUserAdmin,
  makeUserVendor,
  markVendorAsFraud,
  unmarkVendorAsFraud,
  deleteUser,
  getUserStats,
  searchUsers,
  getUsersByRole,
};