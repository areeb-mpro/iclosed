const { z } = require('zod');

/**
 * Validation middleware using Zod
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {string} location - Where to get data from ('body', 'query', 'params')
 */
const validate = (schema, location = 'body') => {
  return (req, res, next) => {
    try {
      let data;
      
      switch (location) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
        default:
          data = req.body;
      }
      
      // Parse and validate data
      const result = schema.parse(data);
      
      // Attach validated data to request
      req.validatedData = result;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }
      
      console.error('Validation error:', error);
      res.status(500).json({
        error: 'Internal server error during validation',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Common schemas
 */

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Date range schema
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Filter schema for leads
const leadFilterSchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  ownerId: z.string().optional(),
  assigneeId: z.string().optional(),
  organizationId: z.string().optional(),
  ...dateRangeSchema.shape
});

// Filter schema for appointments
const appointmentFilterSchema = z.object({
  status: z.string().optional(),
  meetingTypeId: z.string().optional(),
  leadId: z.string().optional(),
  assigneeId: z.string().optional(),
  organizationId: z.string().optional(),
  ...dateRangeSchema.shape
});

module.exports = {
  validate,
  schemas: {
    pagination: paginationSchema,
    dateRange: dateRangeSchema,
    leadFilter: leadFilterSchema,
    appointmentFilter: appointmentFilterSchema
  }
};
