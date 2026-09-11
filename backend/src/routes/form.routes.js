const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { z } = require('zod');

// Validation schemas
const createFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    name: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    defaultValue: z.any().optional()
  })).optional(),
  settings: z.record(z.any()).optional()
});

const updateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  fields: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    name: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    defaultValue: z.any().optional()
  })).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional()
});

// Public routes
router.get('/field-options', formController.getFormFieldOptions);
router.post('/:id/visit', formController.incrementVisitCount);

// Protected routes
router.use(authenticate);

router.get('/', formController.getAllBookingForms);
router.get('/:id', formController.getBookingFormById);
router.get('/:id/stats', formController.getFormStats);
router.post('/', validate(createFormSchema), formController.createBookingForm);
router.put('/:id', validate(updateFormSchema), formController.updateBookingForm);
router.delete('/:id', formController.deleteBookingForm);

module.exports = router;
