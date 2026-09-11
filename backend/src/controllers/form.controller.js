const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { success, created, error, notFound, paginated } = require('../utils/responseHandler');

/**
 * Create a new booking form
 */
const createBookingForm = async (req, res) => {
  try {
    const { name, description, fields, settings } = req.body;
    
    if (!name) {
      return error(res, 'Form name is required', 400, 'VALIDATION_ERROR');
    }
    
    const organizationId = req.user.organizationId;
    
    // Default fields if none provided
    const defaultFields = [
      { id: uuidv4(), type: 'text', name: 'firstName', label: 'First Name', required: true, placeholder: 'Enter your first name' },
      { id: uuidv4(), type: 'text', name: 'lastName', label: 'Last Name', required: true, placeholder: 'Enter your last name' },
      { id: uuidv4(), type: 'email', name: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
      { id: uuidv4(), type: 'phone', name: 'phone', label: 'Phone Number', required: false, placeholder: 'Enter your phone number' },
      { id: uuidv4(), type: 'text', name: 'company', label: 'Company', required: false, placeholder: 'Enter your company name' },
      { id: uuidv4(), type: 'text', name: 'jobTitle', label: 'Job Title', required: false, placeholder: 'Enter your job title' }
    ];
    
    const form = await prisma.bookingForm.create({
      data: {
        id: uuidv4(),
        name,
        description,
        fields: fields || defaultFields,
        settings: settings || {},
        organizationId,
        isActive: true,
        visitCount: 0,
        submissionCount: 0
      }
    });
    
    created(res, form, 'Booking form created successfully');
  } catch (err) {
    console.error('Create booking form error:', err);
    error(res, 'Failed to create booking form', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get all booking forms for organization
 */
const getAllBookingForms = async (req, res) => {
  try {
    const { page = 1, limit = 10, includeInactive = false } = req.query;
    const organizationId = req.user.organizationId;
    
    const where = { organizationId };
    if (!includeInactive) {
      where.isActive = true;
    }
    
    const total = await prisma.bookingForm.count({ where });
    
    const forms = await prisma.bookingForm.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    paginated(res, forms, { page: parseInt(page), limit: parseInt(limit), total }, 'Booking forms retrieved');
  } catch (err) {
    console.error('Get all booking forms error:', err);
    error(res, 'Failed to get booking forms', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get a single booking form by ID
 */
const getBookingFormById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const form = await prisma.bookingForm.findUnique({
      where: { id }
    });
    
    if (!form) {
      return notFound(res, 'Booking form', id);
    }
    
    // Check organization access
    if (form.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this form', 403, 'FORBIDDEN');
    }
    
    success(res, form, 'Booking form retrieved');
  } catch (err) {
    console.error('Get booking form by ID error:', err);
    error(res, 'Failed to get booking form', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update a booking form
 */
const updateBookingForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, fields, settings, isActive } = req.body;
    
    // Find form first
    const existingForm = await prisma.bookingForm.findUnique({
      where: { id }
    });
    
    if (!existingForm) {
      return notFound(res, 'Booking form', id);
    }
    
    // Check organization access
    if (existingForm.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this form', 403, 'FORBIDDEN');
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (fields !== undefined) updateData.fields = fields;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const form = await prisma.bookingForm.update({
      where: { id },
      data: updateData
    });
    
    success(res, form, 'Booking form updated successfully');
  } catch (err) {
    console.error('Update booking form error:', err);
    error(res, 'Failed to update booking form', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete a booking form
 */
const deleteBookingForm = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find form first
    const form = await prisma.bookingForm.findUnique({
      where: { id }
    });
    
    if (!form) {
      return notFound(res, 'Booking form', id);
    }
    
    // Check organization access
    if (form.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this form', 403, 'FORBIDDEN');
    }
    
    await prisma.bookingForm.delete({
      where: { id }
    });
    
    success(res, null, 'Booking form deleted successfully');
  } catch (err) {
    console.error('Delete booking form error:', err);
    error(res, 'Failed to delete booking form', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get form submission statistics
 */
const getFormStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const form = await prisma.bookingForm.findUnique({
      where: { id },
      include: {
        leads: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!form) {
      return notFound(res, 'Booking form', id);
    }
    
    // Check organization access
    if (form.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this form', 403, 'FORBIDDEN');
    }
    
    // Calculate statistics
    const stats = {
      totalVisits: form.visitCount,
      totalSubmissions: form.submissionCount,
      conversionRate: form.visitCount > 0 
        ? Math.round((form.submissionCount / form.visitCount) * 100) 
        : 0,
      leadsByStatus: {},
      recentLeads: form.leads.slice(0, 5)
    };
    
    // Count leads by status
    form.leads.forEach(lead => {
      stats.leadsByStatus[lead.status] = (stats.leadsByStatus[lead.status] || 0) + 1;
    });
    
    success(res, stats, 'Form statistics retrieved');
  } catch (err) {
    console.error('Get form stats error:', err);
    error(res, 'Failed to get form statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Increment form visit count
 */
const incrementVisitCount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const form = await prisma.bookingForm.findUnique({
      where: { id }
    });
    
    if (!form) {
      return notFound(res, 'Booking form', id);
    }
    
    // Only allow public access for this endpoint
    const updatedForm = await prisma.bookingForm.update({
      where: { id },
      data: { visitCount: { increment: 1 } }
    });
    
    success(res, { visitCount: updatedForm.visitCount }, 'Visit count incremented');
  } catch (err) {
    console.error('Increment visit count error:', err);
    error(res, 'Failed to increment visit count', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Increment form submission count
 */
const incrementSubmissionCount = async (formId) => {
  try {
    const form = await prisma.bookingForm.findUnique({
      where: { id: formId }
    });
    
    if (!form) {
      console.log(`Form ${formId} not found for submission count increment`);
      return;
    }
    
    await prisma.bookingForm.update({
      where: { id: formId },
      data: { submissionCount: { increment: 1 } }
    });
    
    console.log(`Form ${formId} submission count incremented`);
  } catch (err) {
    console.error('Increment submission count error:', err);
  }
};

/**
 * Get form field options (for dynamic form building)
 */
const getFormFieldOptions = (req, res) => {
  const fieldTypes = [
    { value: 'text', label: 'Text Input', description: 'Single line text input' },
    { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
    { value: 'email', label: 'Email', description: 'Email address input with validation' },
    { value: 'phone', label: 'Phone', description: 'Phone number input' },
    { value: 'number', label: 'Number', description: 'Numeric input' },
    { value: 'select', label: 'Dropdown', description: 'Single select dropdown' },
    { value: 'multiselect', label: 'Multi-select', description: 'Multiple selection dropdown' },
    { value: 'checkbox', label: 'Checkbox', description: 'Single checkbox' },
    { value: 'checkbox_group', label: 'Checkbox Group', description: 'Multiple checkboxes' },
    { value: 'radio', label: 'Radio Buttons', description: 'Single selection from options' },
    { value: 'date', label: 'Date Picker', description: 'Date selection' },
    { value: 'datetime', label: 'Date & Time', description: 'Date and time selection' },
    { value: 'hidden', label: 'Hidden Field', description: 'Hidden input field' }
  ];
  
  const commonFields = [
    { name: 'firstName', label: 'First Name', type: 'text', required: true },
    { name: 'lastName', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'phone', required: false },
    { name: 'company', label: 'Company', type: 'text', required: false },
    { name: 'jobTitle', label: 'Job Title', type: 'text', required: false },
    { name: 'companySize', label: 'Company Size', type: 'select', required: false, options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
    { name: 'budget', label: 'Budget', type: 'select', required: false, options: ['< $1K', '$1K - $5K', '$5K - $10K', '$10K - $25K', '$25K - $50K', '$50K+'] },
    { name: 'country', label: 'Country', type: 'select', required: false, options: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other'] },
    { name: 'howDidYouHearAboutUs', label: 'How did you hear about us?', type: 'select', required: false, options: ['Search Engine', 'Social Media', 'Referral', 'Advertisement', 'Other'] }
  ];
  
  success(res, { fieldTypes, commonFields }, 'Form field options retrieved');
};

/**
 * Validate form fields
 */
const validateFormFields = (fields, submittedData) => {
  const errors = [];
  
  for (const field of fields) {
    if (field.required && !submittedData[field.name]) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`
      });
    }
    
    // Type-specific validation
    if (submittedData[field.name]) {
      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedData[field.name])) {
            errors.push({
              field: field.name,
              message: `${field.label} must be a valid email address`
            });
          }
          break;
        case 'phone':
          // Basic phone validation
          const phone = submittedData[field.name].replace(/\D/g, '');
          if (phone.length < 10) {
            errors.push({
              field: field.name,
              message: `${field.label} must be a valid phone number`
            });
          }
          break;
        case 'number':
          if (isNaN(submittedData[field.name])) {
            errors.push({
              field: field.name,
              message: `${field.label} must be a number`
            });
          }
          break;
        case 'select':
          if (field.options && !field.options.includes(submittedData[field.name])) {
            errors.push({
              field: field.name,
              message: `${field.label} must be one of the available options`
            });
          }
          break;
      }
    }
  }
  
  return errors;
};

module.exports = {
  createBookingForm,
  getAllBookingForms,
  getBookingFormById,
  updateBookingForm,
  deleteBookingForm,
  getFormStats,
  incrementVisitCount,
  incrementSubmissionCount,
  getFormFieldOptions,
  validateFormFields
};
