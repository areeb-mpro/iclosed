const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { success, created, error, conflict } = require('../utils/responseHandler');
const validator = require('validator');

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role
 */
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return error(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }
    
    if (!validator.isEmail(email)) {
      return error(res, 'Invalid email format', 400, 'VALIDATION_ERROR');
    }
    
    if (password.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return conflict(res, 'User with this email already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create organization (for first user)
    let organizationId;
    
    if (organizationName) {
      const organization = await prisma.organization.create({
        data: {
          id: uuidv4(),
          name: organizationName,
          slug: organizationName.toLowerCase().replace(/\s+/g, '-')
        }
      });
      organizationId = organization.id;
    } else {
      // Default organization
      const defaultOrg = await prisma.organization.upsert({
        where: { slug: 'default' },
        update: {},
        create: {
          id: uuidv4(),
          name: 'Default Organization',
          slug: 'default'
        }
      });
      organizationId = defaultOrg.id;
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'ADMIN', // First user is admin
        organizationId,
        timezone: req.body.timezone || 'UTC'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true
      }
    });
    
    // Generate token
    const token = generateToken(user.id, user.email, user.role);
    
    created(res, { user, token }, 'Registration successful');
  } catch (err) {
    console.error('Registration error:', err);
    error(res, 'Failed to register user', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return error(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!user) {
      return error(res, 'Invalid credentials', 401, 'UNAUTHORIZED');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return error(res, 'Invalid credentials', 401, 'UNAUTHORIZED');
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return error(res, 'Account is not active', 403, 'FORBIDDEN');
    }
    
    // Generate token
    const token = generateToken(user.id, user.email, user.role);
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    // Prepare user response (without sensitive data)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      timezone: user.timezone,
      organization: user.organization
    };
    
    success(res, { user: userResponse, token }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    error(res, 'Failed to login', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Logout user (clear token)
 */
const logout = (req, res) => {
  // In JWT, logout is typically handled client-side by removing the token
  // For server-side sessions, we would invalidate the token here
  success(res, null, 'Logout successful');
};

/**
 * Refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return error(res, 'Token is required', 400, 'VALIDATION_ERROR');
    }
    
    // Verify old token (don't reject if expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return error(res, 'User not found', 404, 'NOT_FOUND');
    }
    
    // Generate new token
    const newToken = generateToken(user.id, user.email, user.role);
    
    success(res, { token: newToken }, 'Token refreshed');
  } catch (err) {
    console.error('Refresh token error:', err);
    error(res, 'Failed to refresh token', 401, 'UNAUTHORIZED');
  }
};

/**
 * Forgot password - request reset link
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return error(res, 'Email is required', 400, 'VALIDATION_ERROR');
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // Don't reveal that user doesn't exist
      return success(res, null, 'If this email exists, a reset link has been sent');
    }
    
    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // In a real app, send email with reset link
    // For now, return the token (client should handle email sending)
    
    console.log(`Password reset token for ${email}:`, resetToken);
    
    success(res, { 
      message: 'If this email exists, a reset link has been sent',
      resetToken // In production, don't return this - send via email
    }, 'Password reset requested');
  } catch (err) {
    console.error('Forgot password error:', err);
    error(res, 'Failed to process password reset', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Reset password using token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return error(res, 'Token and new password are required', 400, 'VALIDATION_ERROR');
    }
    
    if (newPassword.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        return error(res, 'Invalid token type', 401, 'UNAUTHORIZED');
      }
    } catch (err) {
      return error(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return error(res, 'User not found', 404, 'NOT_FOUND');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    
    success(res, null, 'Password reset successful');
  } catch (err) {
    console.error('Reset password error:', err);
    error(res, 'Failed to reset password', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return error(res, 'Current and new password are required', 400, 'VALIDATION_ERROR');
    }
    
    if (newPassword.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, req.user.passwordHash);
    
    if (!isPasswordValid) {
      return error(res, 'Current password is incorrect', 401, 'UNAUTHORIZED');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });
    
    success(res, null, 'Password changed successfully');
  } catch (err) {
    console.error('Change password error:', err);
    error(res, 'Failed to change password', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true }
        },
        ownedLeads: {
          select: { id: true },
          take: 5
        },
        assignedLeads: {
          select: { id: true },
          take: 5
        },
        appointments: {
          select: { id: true, startTime: true, status: true },
          take: 5,
          orderBy: { startTime: 'desc' }
        }
      }
    });
    
    if (!user) {
      return error(res, 'User not found', 404, 'NOT_FOUND');
    }
    
    // Remove sensitive data
    const { passwordHash, ...userResponse } = user;
    
    success(res, userResponse, 'Profile retrieved');
  } catch (err) {
    console.error('Get profile error:', err);
    error(res, 'Failed to get profile', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, timezone, avatar } = req.body;
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        avatar: true,
        role: true
      }
    });
    
    success(res, user, 'Profile updated successfully');
  } catch (err) {
    console.error('Update profile error:', err);
    error(res, 'Failed to update profile', 500, 'INTERNAL_ERROR');
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile
};
