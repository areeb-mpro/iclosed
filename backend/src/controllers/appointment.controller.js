const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { success, created, error, notFound, paginated } = require('../utils/responseHandler');
const moment = require('moment');
const { google } = require('googleapis');
const { sendFollowUp } = require('../services/followup.service');

/**
 * Calendar integration service
 */
const calendarService = {
  google: {
    async getCalendarService(user) {
      if (!user.googleCalendarToken) {
        throw new Error('Google Calendar not connected');
      }
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials(user.googleCalendarToken);
      
      return google.calendar({ version: 'v3', auth: oauth2Client });
    },
    
    async createEvent(user, eventData) {
      const calendar = await this.getCalendarService(user);
      
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timezone
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timezone
        },
        attendees: eventData.attendees || [],
        conferenceData: eventData.isVirtual ? {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : null,
        location: eventData.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };
      
      const response = await calendar.events.insert({
        calendarId: user.googleCalendarToken.calendarId || 'primary',
        resource: event,
        conferenceDataVersion: 1
      });
      
      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        hangoutLink: response.data.hangoutLink
      };
    },
    
    async getAvailability(user, startTime, endTime) {
      const calendar = await this.getCalendarService(user);
      
      const response = await calendar.freeBusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          timeZone: user.timezone || 'UTC',
          items: [{ id: 'primary' }]
        }
      });
      
      return response.data.calendars.primary.busy;
    }
  },
  
  outlook: {
    async createEvent(user, eventData) {
      // Outlook integration would go here
      // This is a placeholder for Microsoft Graph API integration
      throw new Error('Outlook integration not yet implemented');
    },
    
    async getAvailability(user, startTime, endTime) {
      // Outlook availability check would go here
      throw new Error('Outlook integration not yet implemented');
    }
  }
};

/**
 * Create a new meeting type
 */
const createMeetingType = async (req, res) => {
  try {
    const {
      name,
      description,
      duration,
      customDuration,
      availability,
      bufferTime,
      assignedToId
    } = req.body;
    
    if (!name) {
      return error(res, 'Meeting type name is required', 400, 'VALIDATION_ERROR');
    }
    
    const organizationId = req.user.organizationId;
    const ownerId = req.user.id;
    
    // Validate duration
    const validDurations = ['MINUTES_15', 'MINUTES_30', 'MINUTES_45', 'MINUTES_60', 'MINUTES_90', 'MINUTES_120', 'CUSTOM'];
    if (duration && !validDurations.includes(duration)) {
      return error(res, 'Invalid duration', 400, 'VALIDATION_ERROR');
    }
    
    // If custom duration, ensure it's provided
    if (duration === 'CUSTOM' && !customDuration) {
      return error(res, 'Custom duration is required when duration is CUSTOM', 400, 'VALIDATION_ERROR');
    }
    
    // Check if assigned user exists
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId, organizationId }
      });
      
      if (!assignedUser) {
        return error(res, 'Assigned user not found or not in your organization', 400, 'VALIDATION_ERROR');
      }
    }
    
    const meetingType = await prisma.meetingType.create({
      data: {
        id: uuidv4(),
        name,
        description,
        duration: duration || 'MINUTES_30',
        customDuration: duration === 'CUSTOM' ? customDuration : null,
        availability: availability || {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          startTime: '09:00',
          endTime: '17:00'
        },
        bufferTime: bufferTime || 0,
        organizationId,
        ownerId,
        assignedToId,
        isActive: true
      }
    });
    
    created(res, meetingType, 'Meeting type created successfully');
  } catch (err) {
    console.error('Create meeting type error:', err);
    error(res, 'Failed to create meeting type', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get all meeting types for organization
 */
const getAllMeetingTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, includeInactive = false } = req.query;
    const organizationId = req.user.organizationId;
    
    const where = { organizationId };
    if (!includeInactive) {
      where.isActive = true;
    }
    
    const total = await prisma.meetingType.count({ where });
    
    const meetingTypes = await prisma.meetingType.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
    
    paginated(res, meetingTypes, { page: parseInt(page), limit: parseInt(limit), total }, 'Meeting types retrieved');
  } catch (err) {
    console.error('Get all meeting types error:', err);
    error(res, 'Failed to get meeting types', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get a single meeting type by ID
 */
const getMeetingTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meetingType = await prisma.meetingType.findUnique({
      where: { id },
      include: {
        owner: true,
        assignedTo: true,
        appointments: {
          take: 5,
          orderBy: { startTime: 'desc' }
        }
      }
    });
    
    if (!meetingType) {
      return notFound(res, 'Meeting type', id);
    }
    
    // Check organization access
    if (meetingType.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this meeting type', 403, 'FORBIDDEN');
    }
    
    success(res, meetingType, 'Meeting type retrieved');
  } catch (err) {
    console.error('Get meeting type by ID error:', err);
    error(res, 'Failed to get meeting type', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update a meeting type
 */
const updateMeetingType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      duration,
      customDuration,
      availability,
      bufferTime,
      assignedToId,
      isActive
    } = req.body;
    
    // Find meeting type first
    const existingMeetingType = await prisma.meetingType.findUnique({
      where: { id }
    });
    
    if (!existingMeetingType) {
      return notFound(res, 'Meeting type', id);
    }
    
    // Check organization access
    if (existingMeetingType.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this meeting type', 403, 'FORBIDDEN');
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (customDuration !== undefined) updateData.customDuration = customDuration;
    if (availability !== undefined) updateData.availability = availability;
    if (bufferTime !== undefined) updateData.bufferTime = bufferTime;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const meetingType = await prisma.meetingType.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
        assignedTo: true
      }
    });
    
    success(res, meetingType, 'Meeting type updated successfully');
  } catch (err) {
    console.error('Update meeting type error:', err);
    error(res, 'Failed to update meeting type', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete a meeting type
 */
const deleteMeetingType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find meeting type first
    const meetingType = await prisma.meetingType.findUnique({
      where: { id },
      include: {
        appointments: {
          select: { id: true }
        }
      }
    });
    
    if (!meetingType) {
      return notFound(res, 'Meeting type', id);
    }
    
    // Check organization access
    if (meetingType.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this meeting type', 403, 'FORBIDDEN');
    }
    
    // Check if meeting type has appointments
    if (meetingType.appointments.length > 0) {
      return error(res, 'Cannot delete meeting type with existing appointments', 400, 'VALIDATION_ERROR');
    }
    
    await prisma.meetingType.delete({
      where: { id }
    });
    
    success(res, null, 'Meeting type deleted successfully');
  } catch (err) {
    console.error('Delete meeting type error:', err);
    error(res, 'Failed to delete meeting type', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Create a new appointment
 */
const createAppointment = async (req, res) => {
  try {
    const {
      meetingTypeId,
      leadId,
      startTime,
      endTime,
      timezone,
      title,
      description,
      isVirtual,
      location,
      calendarType
    } = req.body;
    
    if (!meetingTypeId || !leadId || !startTime || !endTime) {
      return error(res, 'Meeting type, lead, start time, and end time are required', 400, 'VALIDATION_ERROR');
    }
    
    const organizationId = req.user.organizationId;
    
    // Find meeting type
    const meetingType = await prisma.meetingType.findUnique({
      where: { id: meetingTypeId, organizationId }
    });
    
    if (!meetingType) {
      return error(res, 'Meeting type not found or not in your organization', 400, 'VALIDATION_ERROR');
    }
    
    // Find lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, organizationId }
    });
    
    if (!lead) {
      return error(res, 'Lead not found or not in your organization', 400, 'VALIDATION_ERROR');
    }
    
    // Parse dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const timezoneToUse = timezone || lead.timezone || req.user.timezone || 'UTC';
    
    // Validate date range
    if (startDate >= endDate) {
      return error(res, 'Start time must be before end time', 400, 'VALIDATION_ERROR');
    }
    
    // Check for conflicts
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
        OR: [
          { assigneeId: lead.assigneeId },
          { meetingTypeId }
        ]
      }
    });
    
    if (conflictingAppointments.length > 0) {
      return error(res, 'There is a scheduling conflict', 400, 'VALIDATION_ERROR');
    }
    
    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        id: uuidv4(),
        title: title || `${meetingType.name} with ${lead.firstName} ${lead.lastName}`,
        description: description || meetingType.description,
        startTime: startDate,
        endTime: endDate,
        timezone: timezoneToUse,
        meetingTypeId,
        leadId,
        organizationId,
        assigneeId: lead.assigneeId,
        isVirtual: isVirtual !== undefined ? isVirtual : true,
        location: location || meetingType.location,
        status: 'SCHEDULED'
      },
      include: {
        meetingType: true,
        lead: true,
        assignee: true
      }
    });
    
    // Create calendar event
    let calendarEventId, meetingLink, calendarTypeUsed;
    
    if (calendarType === 'google') {
      const user = await prisma.user.findUnique({
        where: { id: lead.assigneeId || req.user.id }
      });
      
      if (user && user.googleCalendarConnected) {
        try {
          const calendarResult = await calendarService.google.createEvent(user, {
            title: appointment.title,
            description: appointment.description,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            timezone: timezoneToUse,
            isVirtual: appointment.isVirtual,
            attendees: [lead.email].filter(Boolean),
            location: appointment.location
          });
          
          calendarEventId = calendarResult.id;
          meetingLink = calendarResult.hangoutLink;
          calendarTypeUsed = 'google';
        } catch (err) {
          console.error('Error creating Google Calendar event:', err);
        }
      }
    } else if (calendarType === 'outlook') {
      // Outlook integration would go here
      console.log('Outlook integration not yet implemented');
    }
    
    // Update appointment with calendar info
    if (calendarEventId || meetingLink) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          calendarEventId,
          meetingLink,
          calendarType: calendarTypeUsed
        }
      });
    }
    
    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'BOOKED',
        bookedAt: new Date(),
        appointmentId: appointment.id
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'BOOKED',
        description: 'Appointment booked',
        leadId,
        metadata: { appointmentId: appointment.id }
      }
    });
    
    // Send confirmation
    sendFollowUp(leadId, 'BOOKING_CONFIRMATION').catch(console.error);
    
    // Schedule reminders
    scheduleAppointmentReminders(appointment.id).catch(console.error);
    
    created(res, appointment, 'Appointment created successfully');
  } catch (err) {
    console.error('Create appointment error:', err);
    error(res, 'Failed to create appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get all appointments with filtering
 */
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'startTime',
      sortOrder = 'asc',
      status,
      meetingTypeId,
      leadId,
      assigneeId,
      startDate,
      endDate
    } = req.query;
    
    const organizationId = req.user.organizationId;
    
    // Build where clause
    const where = { organizationId };
    
    if (status) where.status = status;
    if (meetingTypeId) where.meetingTypeId = meetingTypeId;
    if (leadId) where.leadId = leadId;
    if (assigneeId) where.assigneeId = assigneeId;
    
    // Date range filtering
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }
    
    // Get total count
    const total = await prisma.appointment.count({ where });
    
    // Get appointments
    const appointments = await prisma.appointment.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        meetingType: {
          select: { id: true, name: true, duration: true }
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, status: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        reminders: true
      }
    });
    
    paginated(res, appointments, { page: parseInt(page), limit: parseInt(limit), total }, 'Appointments retrieved');
  } catch (err) {
    console.error('Get all appointments error:', err);
    error(res, 'Failed to get appointments', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get a single appointment by ID
 */
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        meetingType: true,
        lead: {
          include: {
            owner: true,
            assignee: true
          }
        },
        assignee: true,
        reminders: true
      }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    success(res, appointment, 'Appointment retrieved');
  } catch (err) {
    console.error('Get appointment by ID error:', err);
    error(res, 'Failed to get appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update an appointment
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      timezone,
      status,
      meetingTypeId,
      assigneeId,
      location,
      isVirtual,
      meetingLink,
      notes
    } = req.body;
    
    // Find appointment first
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { lead: true }
    });
    
    if (!existingAppointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (existingAppointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (timezone !== undefined) updateData.timezone = timezone;
    if (status !== undefined) updateData.status = status;
    if (meetingTypeId !== undefined) updateData.meetingTypeId = meetingTypeId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (location !== undefined) updateData.location = location;
    if (isVirtual !== undefined) updateData.isVirtual = isVirtual;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (notes !== undefined) updateData.notes = notes;
    
    // Update timestamps for status changes
    if (status === 'CONFIRMED' && existingAppointment.status !== 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }
    if (status === 'CANCELLED' && existingAppointment.status !== 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }
    if (status === 'COMPLETED' && existingAppointment.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        meetingType: true,
        lead: true,
        assignee: true,
        reminders: true
      }
    });
    
    // Update lead status if appointment status changed
    if (status) {
      let leadStatus;
      switch (status) {
        case 'CANCELLED':
          leadStatus = 'CONTACTED';
          break;
        case 'COMPLETED':
          leadStatus = 'BOOKED';
          break;
        case 'NO_SHOW':
          leadStatus = 'NO_SHOW';
          break;
        default:
          leadStatus = existingAppointment.lead.status;
      }
      
      await prisma.lead.update({
        where: { id: appointment.leadId },
        data: { status: leadStatus }
      });
    }
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: status ? status.toUpperCase() : 'UPDATED',
        description: `Appointment updated. Status: ${status || existingAppointment.status}`,
        leadId: appointment.leadId,
        metadata: { appointmentId: appointment.id, changes: Object.keys(updateData) }
      }
    });
    
    // Send follow-up if status changed
    if (status === 'NO_SHOW') {
      sendFollowUp(appointment.leadId, 'NO_SHOW').catch(console.error);
    }
    if (status === 'COMPLETED') {
      sendFollowUp(appointment.leadId, 'POST_APPOINTMENT').catch(console.error);
    }
    
    success(res, appointment, 'Appointment updated successfully');
  } catch (err) {
    console.error('Update appointment error:', err);
    error(res, 'Failed to update appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete an appointment
 */
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find appointment first
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Delete appointment
    await prisma.appointment.delete({
      where: { id }
    });
    
    // Update lead
    await prisma.lead.update({
      where: { appointmentId: id },
      data: {
        appointmentId: null,
        status: 'QUALIFIED'
      }
    });
    
    success(res, null, 'Appointment deleted successfully');
  } catch (err) {
    console.error('Delete appointment error:', err);
    error(res, 'Failed to delete appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get available time slots for booking
 */
const getAvailableTimeSlots = async (req, res) => {
  try {
    const {
      meetingTypeId,
      startDate,
      endDate,
      timezone = 'UTC'
    } = req.query;
    
    const organizationId = req.user.organizationId;
    
    // Find meeting type
    const meetingType = await prisma.meetingType.findUnique({
      where: { id: meetingTypeId, organizationId }
    });
    
    if (!meetingType) {
      return error(res, 'Meeting type not found', 400, 'VALIDATION_ERROR');
    }
    
    // Get availability from meeting type
    const availability = meetingType.availability || {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '09:00',
      endTime: '17:00'
    };
    
    // Get duration in minutes
    let durationMinutes;
    switch (meetingType.duration) {
      case 'MINUTES_15': durationMinutes = 15; break;
      case 'MINUTES_30': durationMinutes = 30; break;
      case 'MINUTES_45': durationMinutes = 45; break;
      case 'MINUTES_60': durationMinutes = 60; break;
      case 'MINUTES_90': durationMinutes = 90; break;
      case 'MINUTES_120': durationMinutes = 120; break;
      case 'CUSTOM': durationMinutes = meetingType.customDuration; break;
      default: durationMinutes = 30;
    }
    
    // Parse date range
    const start = moment(startDate).tz(timezone);
    const end = moment(endDate).tz(timezone);
    
    if (!start.isValid() || !end.isValid()) {
      return error(res, 'Invalid date range', 400, 'VALIDATION_ERROR');
    }
    
    // Get existing appointments for conflict checking
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        meetingTypeId,
        startTime: { gte: start.toDate() },
        endTime: { lte: end.toDate() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      }
    });
    
    // Generate available time slots
    const timeSlots = [];
    const currentDate = moment().tz(timezone);
    
    for (let date = start; date.isSameOrBefore(end); date = date.add(1, 'day')) {
      // Skip weekends if not in availability
      const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, etc.
      if (!availability.days.includes(dayOfWeek + 1)) {
        continue;
      }
      
      // Skip past dates
      if (date.isBefore(currentDate, 'day')) {
        continue;
      }
      
      // Parse start and end times
      const [startHour, startMinute] = availability.startTime.split(':').map(Number);
      const [endHour, endMinute] = availability.endTime.split(':').map(Number);
      
      // Generate time slots for this day
      let slotStart = date.clone().set({
        hour: startHour,
        minute: startMinute,
        second: 0,
        millisecond: 0
      });
      
      const slotEnd = date.clone().set({
        hour: endHour,
        minute: endMinute,
        second: 0,
        millisecond: 0
      });
      
      while (slotStart.isBefore(slotEnd)) {
        const slotEndTime = slotStart.clone().add(durationMinutes, 'minutes');
        
        // Check if slot is within availability
        if (slotEndTime.isAfter(slotEnd)) {
          break;
        }
        
        // Check for conflicts
        const hasConflict = existingAppointments.some(appt => {
          const apptStart = moment(appt.startTime).tz(timezone);
          const apptEnd = moment(appt.endTime).tz(timezone);
          
          return slotStart.isBefore(apptEnd) && slotEndTime.isAfter(apptStart);
        });
        
        if (!hasConflict) {
          timeSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEndTime.toISOString(),
            date: slotStart.format('YYYY-MM-DD'),
            time: slotStart.format('HH:mm'),
            timezone
          });
        }
        
        // Move to next slot (account for buffer time)
        slotStart = slotEndTime.clone().add(meetingType.bufferTime || 0, 'minutes');
      }
    }
    
    success(res, timeSlots, 'Available time slots retrieved');
  } catch (err) {
    console.error('Get available time slots error:', err);
    error(res, 'Failed to get available time slots', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Schedule appointment reminders
 * @param {string} appointmentId - Appointment ID
 */
const scheduleAppointmentReminders = async (appointmentId) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { lead: true }
    });
    
    if (!appointment) {
      console.log(`Appointment ${appointmentId} not found for reminders`);
      return;
    }
    
    // Delete existing reminders
    await prisma.appointmentReminder.deleteMany({
      where: { appointmentId }
    });
    
    // Schedule 24-hour reminder
    const reminder24h = moment(appointment.startTime).subtract(24, 'hours');
    if (reminder24h.isAfter(moment())) {
      await prisma.appointmentReminder.create({
        data: {
          id: uuidv4(),
          type: 'email',
          scheduledAt: reminder24h.toDate(),
          appointmentId
        }
      });
    }
    
    // Schedule 2-hour reminder
    const reminder2h = moment(appointment.startTime).subtract(2, 'hours');
    if (reminder2h.isAfter(moment())) {
      await prisma.appointmentReminder.create({
        data: {
          id: uuidv4(),
          type: 'email',
          scheduledAt: reminder2h.toDate(),
          appointmentId
        }
      });
    }
    
    // Schedule SMS reminder 1 hour before
    const reminder1h = moment(appointment.startTime).subtract(1, 'hour');
    if (reminder1h.isAfter(moment()) && appointment.lead.phone) {
      await prisma.appointmentReminder.create({
        data: {
          id: uuidv4(),
          type: 'sms',
          scheduledAt: reminder1h.toDate(),
          appointmentId
        }
      });
    }
    
    console.log(`Reminders scheduled for appointment ${appointmentId}`);
  } catch (err) {
    console.error('Schedule appointment reminders error:', err);
  }
};

/**
 * Process scheduled reminders (should be run as a scheduled job)
 */
const processScheduledReminders = async () => {
  try {
    const now = new Date();
    
    // Find reminders that should be sent now
    const reminders = await prisma.appointmentReminder.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
        sentAt: null
      },
      include: {
        appointment: {
          include: {
            lead: true,
            meetingType: true
          }
        }
      }
    });
    
    for (const reminder of reminders) {
      try {
        if (reminder.type === 'email') {
          await sendFollowUp(reminder.appointment.leadId, 'APPOINTMENT_REMINDER');
        } else if (reminder.type === 'sms') {
          await sendFollowUp(reminder.appointment.leadId, 'APPOINTMENT_REMINDER');
        }
        
        // Mark reminder as sent
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            sentAt: now
          }
        });
      } catch (err) {
        console.error('Error sending reminder:', err);
        
        // Mark as failed
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            errorMessage: err.message
          }
        });
      }
    }
    
    return { success: true, count: reminders.length };
  } catch (err) {
    console.error('Process scheduled reminders error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get appointment statistics
 */
const getAppointmentStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get counts by status
    const statusCounts = await prisma.appointment.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true }
    });
    
    // Get count by meeting type
    const meetingTypeCounts = await prisma.appointment.groupBy({
      by: ['meetingTypeId'],
      where: { organizationId },
      _count: { _all: true },
      include: {
        meetingType: {
          select: { name: true }
        }
      }
    });
    
    // Get count by assignee
    const assigneeCounts = await prisma.appointment.groupBy({
      by: ['assigneeId'],
      where: { organizationId, assigneeId: { not: null } },
      _count: { _all: true },
      include: {
        assignee: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: { organizationId },
      take: 5,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        startTime: true,
        status: true,
        lead: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    // Format response
    const stats = {
      total: 0,
      byStatus: {},
      byMeetingType: {},
      byAssignee: {},
      recentAppointments
    };
    
    // Calculate totals
    let total = 0;
    statusCounts.forEach(group => {
      stats.byStatus[group.status] = group._count._all;
      total += group._count._all;
    });
    stats.total = total;
    
    meetingTypeCounts.forEach(group => {
      const name = group.meetingType?.name || 'Unknown';
      stats.byMeetingType[name] = group._count._all;
    });
    
    assigneeCounts.forEach(group => {
      const name = group.assignee 
        ? `${group.assignee.firstName || ''} ${group.assignee.lastName || ''}`.trim()
        : 'Unknown';
      stats.byAssignee[name] = group._count._all;
    });
    
    success(res, stats, 'Appointment statistics retrieved');
  } catch (err) {
    console.error('Get appointment stats error:', err);
    error(res, 'Failed to get appointment statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Confirm an appointment
 */
const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date()
      },
      include: {
        lead: true,
        meetingType: true
      }
    });
    
    // Update lead status
    await prisma.lead.update({
      where: { id: updatedAppointment.leadId },
      data: { status: 'BOOKED' }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'CONFIRMED',
        description: 'Appointment confirmed',
        leadId: updatedAppointment.leadId,
        metadata: { appointmentId: updatedAppointment.id }
      }
    });
    
    // Send confirmation
    sendFollowUp(updatedAppointment.leadId, 'BOOKING_CONFIRMATION').catch(console.error);
    
    success(res, updatedAppointment, 'Appointment confirmed successfully');
  } catch (err) {
    console.error('Confirm appointment error:', err);
    error(res, 'Failed to confirm appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Cancel an appointment
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { lead: true }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `${appointment.notes || ''} Cancelled: ${reason}`.trim() : appointment.notes
      },
      include: {
        lead: true,
        meetingType: true
      }
    });
    
    // Update lead status
    await prisma.lead.update({
      where: { id: updatedAppointment.leadId },
      data: { status: 'CONTACTED' }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'CANCELLED',
        description: `Appointment cancelled${reason ? `: ${reason}` : ''}`,
        leadId: updatedAppointment.leadId,
        metadata: { appointmentId: updatedAppointment.id }
      }
    });
    
    success(res, updatedAppointment, 'Appointment cancelled successfully');
  } catch (err) {
    console.error('Cancel appointment error:', err);
    error(res, 'Failed to cancel appointment', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Mark appointment as no-show
 */
const markNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { lead: true }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        completedAt: new Date()
      },
      include: {
        lead: true,
        meetingType: true
      }
    });
    
    // Update lead status
    await prisma.lead.update({
      where: { id: updatedAppointment.leadId },
      data: { status: 'NO_SHOW' }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'NO_SHOW',
        description: 'Appointment marked as no-show',
        leadId: updatedAppointment.leadId,
        metadata: { appointmentId: updatedAppointment.id }
      }
    });
    
    // Send no-show follow-up
    sendFollowUp(updatedAppointment.leadId, 'NO_SHOW').catch(console.error);
    
    success(res, updatedAppointment, 'Appointment marked as no-show');
  } catch (err) {
    console.error('Mark no-show error:', err);
    error(res, 'Failed to mark appointment as no-show', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Complete an appointment
 */
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, outcome } = req.body;
    
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { lead: true }
    });
    
    if (!appointment) {
      return notFound(res, 'Appointment', id);
    }
    
    // Check organization access
    if (appointment.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this appointment', 403, 'FORBIDDEN');
    }
    
    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes ? `${appointment.notes || ''} ${notes}`.trim() : appointment.notes
      },
      include: {
        lead: true,
        meetingType: true
      }
    });
    
    // Update lead status based on outcome
    let leadStatus = 'BOOKED';
    if (outcome === 'won') {
      leadStatus = 'CLOSED_WON';
    } else if (outcome === 'lost') {
      leadStatus = 'CLOSED_LOST';
    }
    
    await prisma.lead.update({
      where: { id: updatedAppointment.leadId },
      data: {
        status: leadStatus,
        closedAt: outcome ? new Date() : undefined
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'COMPLETED',
        description: `Appointment completed${outcome ? ` with outcome: ${outcome}` : ''}`,
        leadId: updatedAppointment.leadId,
        metadata: { appointmentId: updatedAppointment.id, outcome }
      }
    });
    
    // Send post-appointment follow-up
    sendFollowUp(updatedAppointment.leadId, 'POST_APPOINTMENT').catch(console.error);
    
    success(res, updatedAppointment, 'Appointment completed successfully');
  } catch (err) {
    console.error('Complete appointment error:', err);
    error(res, 'Failed to complete appointment', 500, 'INTERNAL_ERROR');
  }
};

module.exports = {
  // Meeting Type controllers
  createMeetingType,
  getAllMeetingTypes,
  getMeetingTypeById,
  updateMeetingType,
  deleteMeetingType,
  
  // Appointment controllers
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getAvailableTimeSlots,
  getAppointmentStats,
  confirmAppointment,
  cancelAppointment,
  markNoShow,
  completeAppointment,
  
  // Reminder functions
  scheduleAppointmentReminders,
  processScheduledReminders
};
