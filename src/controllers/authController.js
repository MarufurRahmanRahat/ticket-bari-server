const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, photoURL, firebaseUID, role } = req.body;

    // Validate required fields
    if (!name || !email || !firebaseUID) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and Firebase UID',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      // User already registered, return user info with token
      const token = generateToken(userExists._id);

      return res.status(200).json({
        success: true,
        message: 'User already exists',
        data: {
          user: {
            _id: userExists._id,
            name: userExists.name,
            email: userExists.email,
            photoURL: userExists.photoURL,
            role: userExists.role,
            isFraud: userExists.isFraud,
          },
          token,
        },
      });
    }

    // Create new user (no password needed for Firebase auth)
    const user = await User.create({
      name,
      email,
      photoURL: photoURL || '',
      firebaseUID,
      role: role || 'user', // Default to 'user' role
      password: firebaseUID, // Use firebaseUID as password (won't be used for login)
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          isFraud: user.isFraud,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, firebaseUID } = req.body;

    // Validate required fields
    if (!email || !firebaseUID) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and Firebase UID',
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - user not found',
      });
    }

    // Verify Firebase UID matches
    if (user.firebaseUID !== firebaseUID) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          isFraud: user.isFraud,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          isFraud: user.isFraud,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, photoURL } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (photoURL) user.photoURL = photoURL;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};