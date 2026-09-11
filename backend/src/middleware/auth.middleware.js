const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header, cookies, or query
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: 'Account is not active',
        code: 'FORBIDDEN'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.organizationId = user.organizationId;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'UNAUTHORIZED'
      });
    }
    
    res.status(401).json({ 
      error: 'Authentication failed',
      code: 'UNAUTHORIZED'
    });
  }
};

/**
 * Authorization middleware - checks if user has required role
 * @param {string|string[]} roles - Required role(s)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Normalize roles to array
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has any of the required roles
    const hasRole = requiredRoles.some(role => req.user.role === role);
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user is organization admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
  }
  
  next();
};

/**
 * Middleware to check if user owns the resource
 * @param {string} modelName - Prisma model name
 * @param {string} idParam - Request parameter name for ID
 */
const isOwner = (modelName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID is required',
          code: 'BAD_REQUEST'
        });
      }
      
      // Get the model from Prisma
      const model = prisma[modelName];
      
      if (!model) {
        return res.status(500).json({ 
          error: 'Invalid model name',
          code: 'INTERNAL_ERROR'
        });
      }
      
      // Find the resource
      const resource = await model.findUnique({
        where: { id: resourceId }
      });
      
      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found',
          code: 'NOT_FOUND'
        });
      }
      
      // Check ownership
      const ownerField = modelName === 'user' ? 'id' : 'ownerId';
      
      if (resource[ownerField] !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ 
          error: 'You do not own this resource',
          code: 'FORBIDDEN'
        });
      }
      
      // Attach resource to request
      req.resource = resource;
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ 
        error: 'Failed to check ownership',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check organization membership
 */
const checkOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return next();
    }
    
    // Check if user belongs to this organization
    const user = await prisma.user.findUnique({
      where: { 
        id: req.user.id,
        organizationId
      }
    });
    
    if (!user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'You do not have access to this organization',
        code: 'FORBIDDEN'
      });
    }
    
    req.organizationId = organizationId;
    next();
  } catch (error) {
    console.error('Organization check error:', error);
    res.status(500).json({ 
      error: 'Failed to check organization access',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isOwner,
  checkOrganization
};
