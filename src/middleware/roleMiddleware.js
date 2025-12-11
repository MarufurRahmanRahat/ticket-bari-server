// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

// Check if vendor is not marked as fraud
const checkFraudStatus = (req, res, next) => {
  if (req.user.role === 'vendor' && req.user.isFraud) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been marked as fraud. You cannot perform this action.',
    });
  }
  next();
};

module.exports = { authorize, checkFraudStatus };