const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { z } = require('zod');

// Validation schemas
const createMeetingTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.enum(['MINUTES_15', 'MINUTES_30', 'MINUTES_45', 'MINUTES_60', 'MINUTES_90', 'MINUTES_120', 'CUSTOM']).optional(),
  customDuration: z.number().int().positive().optional(),
  availability: z.record(z.any()).optional(),
  bufferTime: z.number().int().nonnegative().optional(),
  assignedToId: z.string().optional()
});

const updateMeetingTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  duration: z.enum(['MINUTES_15', 'MINUTES_30', 'MINUTES_45', 'MINUTES_60', 'MINUTES_90', 'MINUTES_120', 'CUSTOM']).optional(),
  customDuration: z.number().int().positive().optional(),
  availability: z.record(z.any()).optional(),
  bufferTime: z.number().int().nonnegative().optional(),
  assignedToId: z.string().optional(),
  isActive: z.boolean().optional()
});

const createAppointmentSchema = z.object({
  meetingTypeId: z.string(),
  leadId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  isVirtual: z.boolean().optional(),
  location: z.string().optional(),
  calendarType: z.enum(['google', 'outlook', 'none']).optional()
});

const updateAppointmentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  status: z.string().optional(),
  meetingTypeId: z.string().optional(),
  assigneeId: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional()
});

const completeAppointmentSchema = z.object({
  notes: z.string().optional(),
  outcome: z.enum(['won', 'lost', 'follow_up']).optional()
});

const cancelAppointmentSchema = z.object({
  reason: z.string().optional()
});

// Public routes (for booking)
router.get('/meeting-types/:id/availability', appointmentController.getAvailableTimeSlots);

// Protected routes
router.use(authenticate);

// Meeting Type routes
router.post('/meeting-types', validate(createMeetingTypeSchema), appointmentController.createMeetingType);
router.get('/meeting-types', appointmentController.getAllMeetingTypes);
router.get('/meeting-types/:id', appointmentController.getMeetingTypeById);
router.put('/meeting-types/:id', validate(updateMeetingTypeSchema), appointmentController.updateMeetingType);
router.delete('/meeting-types/:id', appointmentController.deleteMeetingType);

// Appointment routes
router.post('/', validate(createAppointmentSchema), appointmentController.createAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/stats', appointmentController.getAppointmentStats);
router.get('/:id', appointmentController.getAppointmentById);
router.put('/:id', validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

// Appointment actions
router.post('/:id/confirm', appointmentController.confirmAppointment);
router.post('/:id/cancel', validate(cancelAppointmentSchema), appointmentController.cancelAppointment);
router.post('/:id/no-show', appointmentController.markNoShow);
router.post('/:id/complete', validate(completeAppointmentSchema), appointmentController.completeAppointment);

module.exports = router;
