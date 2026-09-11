/**
 * Response handler utilities for consistent API responses
 */

/**
 * Success response with data
 * @param {Object} res - Express response object
 * @param {Object} data - Data to return
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created data
 * @param {string} message - Success message
 */
const created = (res, data, message = 'Created successfully') => {
  res.status(201).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 */
const paginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 */
const error = (res, error, statusCode = 400, code = 'ERROR', details = null) => {
  res.status(statusCode).json({
    success: false,
    error,
    code,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 * @param {string} id - Resource ID
 */
const notFound = (res, resource = 'Resource', id = null) => {
  const message = id 
    ? `${resource} with ID '${id}' not found` 
    : `${resource} not found`;
  
  res.status(404).json({
    success: false,
    error: message,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
const validationError = (res, errors) => {
  res.status(400).json({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorized = (res, message = 'Authentication required') => {
  res.status(401).json({
    success: false,
    error: message,
    code: 'UNAUTHORIZED',
    timestamp: new Date().toISOString()
  });
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbidden = (res, message = 'Insufficient permissions') => {
  res.status(403).json({
    success: false,
    error: message,
    code: 'FORBIDDEN',
    timestamp: new Date().toISOString()
  });
};

/**
 * Conflict response (for duplicate resources)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const conflict = (res, message = 'Resource already exists') => {
  res.status(409).json({
    success: false,
    error: message,
    code: 'CONFLICT',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  success,
  created,
  paginated,
  error,
  notFound,
  validationError,
  unauthorized,
  forbidden,
  conflict
};
