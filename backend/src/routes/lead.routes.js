const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { z } = require('zod');

// Validation schemas
const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  formId: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional()
});

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  status: z.string().optional(),
  disqualificationReason: z.string().optional(),
  ownerId: z.string().optional(),
  assigneeId: z.string().optional()
});

const addNoteSchema = z.object({
  content: z.string().min(1)
});

// Public route (for form submissions)
router.post('/public', validate(createLeadSchema), leadController.createLead);

// Protected routes
router.use(authenticate);

// GET routes
router.get('/', leadController.getAllLeads);
router.get('/stats', leadController.getLeadStats);
router.get('/qualified', leadController.getQualifiedLeads);
router.get('/disqualified', leadController.getDisqualifiedLeads);
router.get('/status/:status', leadController.getLeadsByStatus);
router.get('/export', leadController.exportLeads);
router.get('/:id', leadController.getLeadById);

// POST routes
router.post('/', validate(createLeadSchema), leadController.createLead);

// PUT/PATCH routes
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);

// DELETE routes
router.delete('/:id', leadController.deleteLead);

// Note routes
router.post('/:id/notes', validate(addNoteSchema), leadController.addLeadNote);

module.exports = router;
