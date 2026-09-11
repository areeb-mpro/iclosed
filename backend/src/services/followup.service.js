const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const moment = require('moment');

/**
 * Automated follow-up service for leads and appointments
 */

// Configure email transporter (using SendGrid or SMTP)
const emailTransporter = process.env.SENDGRID_API_KEY 
  ? require('@sendgrid/mail')
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

// Configure Twilio for SMS
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Follow-up types and their templates
 */
const FOLLOW_UP_TYPES = {
  INCOMPLETE_BOOKING: {
    email: {
      subject: 'Complete Your Booking',
      template: 'incomplete_booking_email'
    },
    sms: {
      template: 'incomplete_booking_sms'
    },
    timing: {
      first: { hours: 1 },
      second: { days: 1 },
      third: { days: 3 }
    }
  },
  BOOKING_CONFIRMATION: {
    email: {
      subject: 'Your Appointment is Confirmed',
      template: 'booking_confirmation_email'
    },
    sms: {
      template: 'booking_confirmation_sms'
    },
    timing: { immediate: true }
  },
  APPOINTMENT_REMINDER: {
    email: {
      subject: 'Reminder: Your Appointment',
      template: 'appointment_reminder_email'
    },
    sms: {
      template: 'appointment_reminder_sms'
    },
    timing: {
      first: { hours: 24 },
      second: { hours: 2 }
    }
  },
  POST_APPOINTMENT: {
    email: {
      subject: 'Thank You for Your Appointment',
      template: 'post_appointment_email'
    },
    timing: { immediate: true }
  },
  NO_SHOW: {
    email: {
      subject: 'We Missed You!',
      template: 'no_show_email'
    },
    timing: { hours: 1 }
  },
  FOLLOW_UP_1: {
    email: {
      subject: 'Following Up',
      template: 'follow_up_1_email'
    },
    timing: { days: 1 }
  },
  FOLLOW_UP_2: {
    email: {
      subject: 'Still Interested?',
      template: 'follow_up_2_email'
    },
    timing: { days: 3 }
  },
  FOLLOW_UP_3: {
    email: {
      subject: 'Last Chance',
      template: 'follow_up_3_email'
    },
    timing: { days: 7 }
  }
};

/**
 * Send a follow-up to a lead
 * @param {string} leadId - Lead ID
 * @param {string} followUpType - Type of follow-up
 * @param {Object} options - Additional options
 */
const sendFollowUp = async (leadId, followUpType, options = {}) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignee: true,
        appointment: true,
        organization: true
      }
    });
    
    if (!lead) {
      console.log(`Lead ${leadId} not found for follow-up`);
      return { success: false, error: 'Lead not found' };
    }
    
    // Check if follow-up is needed
    if (!shouldSendFollowUp(lead, followUpType)) {
      return { success: true, message: 'Follow-up not needed' };
    }
    
    // Get follow-up configuration
    const config = FOLLOW_UP_TYPES[followUpType];
    if (!config) {
      console.log(`Unknown follow-up type: ${followUpType}`);
      return { success: false, error: 'Unknown follow-up type' };
    }
    
    // Determine channels to use
    const channels = [];
    if (lead.email) channels.push('email');
    if (lead.phone) channels.push('sms');
    
    if (channels.length === 0) {
      return { success: true, message: 'No contact information available' };
    }
    
    // Send via each channel
    const results = {};
    
    for (const channel of channels) {
      if (config[channel]) {
        const result = await sendFollowUpViaChannel(
          lead,
          channel,
          config[channel],
          followUpType,
          options
        );
        results[channel] = result;
      }
    }
    
    // Record the follow-up
    await recordFollowUp(leadId, followUpType, channels, results);
    
    console.log(`Follow-up ${followUpType} sent to lead ${leadId} via ${channels.join(', ')}`);
    
    return { success: true, results };
  } catch (err) {
    console.error('Follow-up error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Check if follow-up should be sent
 * @param {Object} lead - Lead data
 * @param {string} followUpType - Type of follow-up
 * @returns {boolean}
 */
const shouldSendFollowUp = (lead, followUpType) => {
  switch (followUpType) {
    case 'INCOMPLETE_BOOKING':
      // Only send if lead is NEW and doesn't have an appointment
      return lead.status === 'NEW' && !lead.appointmentId;
    
    case 'BOOKING_CONFIRMATION':
      // Send when appointment is first created
      return lead.appointmentId && lead.appointment?.status === 'SCHEDULED';
    
    case 'APPOINTMENT_REMINDER':
      // Send reminders for confirmed appointments
      return lead.appointmentId && 
             lead.appointment?.status === 'CONFIRMED' &&
             moment(lead.appointment.startTime).isAfter(moment());
    
    case 'POST_APPOINTMENT':
      // Send after appointment is completed
      return lead.appointmentId && lead.appointment?.status === 'COMPLETED';
    
    case 'NO_SHOW':
      // Send when appointment is marked as no-show
      return lead.appointmentId && lead.appointment?.status === 'NO_SHOW';
    
    case 'FOLLOW_UP_1':
    case 'FOLLOW_UP_2':
    case 'FOLLOW_UP_3':
      // Send follow-ups to qualified leads without appointments
      return lead.status === 'QUALIFIED' && !lead.appointmentId;
    
    default:
      return true;
  }
};

/**
 * Send follow-up via specific channel
 * @param {Object} lead - Lead data
 * @param {string} channel - Channel (email or sms)
 * @param {Object} config - Channel configuration
 * @param {string} followUpType - Type of follow-up
 * @param {Object} options - Additional options
 * @returns {Object} - Result
 */
const sendFollowUpViaChannel = async (lead, channel, config, followUpType, options) => {
  try {
    let result;
    
    if (channel === 'email') {
      result = await sendEmailFollowUp(lead, config, followUpType, options);
    } else if (channel === 'sms') {
      result = await sendSmsFollowUp(lead, config, followUpType, options);
    }
    
    return result;
  } catch (err) {
    console.error(`Error sending ${channel} follow-up:`, err);
    return { success: false, error: err.message };
  }
};

/**
 * Send email follow-up
 * @param {Object} lead - Lead data
 * @param {Object} config - Email configuration
 * @param {string} followUpType - Type of follow-up
 * @param {Object} options - Additional options
 * @returns {Object} - Result
 */
const sendEmailFollowUp = async (lead, config, followUpType, options) => {
  const { subject, template } = config;
  
  // Get template content
  const emailContent = await getEmailTemplate(template, lead, followUpType);
  
  // Prepare email
  const email = {
    to: lead.email,
    from: process.env.EMAIL_FROM || 'noreply@leadmanagement.com',
    subject: subject,
    html: emailContent.html,
    text: emailContent.text
  };
  
  // Send email
  if (process.env.SENDGRID_API_KEY) {
    // Use SendGrid
    await require('@sendgrid/mail').send(email);
  } else {
    // Use nodemailer
    await emailTransporter.sendMail(email);
  }
  
  // Record message
  await prisma.message.create({
    data: {
      id: uuidv4(),
      type: 'EMAIL',
      direction: 'OUTBOUND',
      subject,
      body: emailContent.html,
      to: [lead.email],
      status: 'SENT',
      leadId: lead.id,
      organizationId: lead.organizationId,
      templateId: template
    }
  });
  
  return { success: true, emailId: email.messageId };
};

/**
 * Send SMS follow-up
 * @param {Object} lead - Lead data
 * @param {Object} config - SMS configuration
 * @param {string} followUpType - Type of follow-up
 * @param {Object} options - Additional options
 * @returns {Object} - Result
 */
const sendSmsFollowUp = async (lead, config, followUpType, options) => {
  const { template } = config;
  
  // Get template content
  const smsContent = await getSmsTemplate(template, lead, followUpType);
  
  // Send SMS via Twilio
  const message = await twilioClient.messages.create({
    body: smsContent,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: lead.phone
  });
  
  // Record message
  await prisma.message.create({
    data: {
      id: uuidv4(),
      type: 'SMS',
      direction: 'OUTBOUND',
      body: smsContent,
      to: [lead.phone],
      from: process.env.TWILIO_PHONE_NUMBER,
      status: 'SENT',
      leadId: lead.id,
      organizationId: lead.organizationId,
      templateId: template
    }
  });
  
  return { success: true, smsId: message.sid };
};

/**
 * Get email template content
 * @param {string} templateName - Template name
 * @param {Object} lead - Lead data
 * @param {string} followUpType - Type of follow-up
 * @returns {Object} - Template content (html and text)
 */
const getEmailTemplate = async (templateName, lead, followUpType) => {
  // Try to get from database first
  const template = await prisma.emailTemplate.findFirst({
    where: {
      organizationId: lead.organizationId,
      name: templateName
    }
  });
  
  if (template) {
    return {
      html: replaceTemplateVariables(template.body, lead),
      text: replaceTemplateVariables(template.plainText || template.body, lead)
    };
  }
  
  // Use default template
  return getDefaultEmailTemplate(templateName, lead);
};

/**
 * Get SMS template content
 * @param {string} templateName - Template name
 * @param {Object} lead - Lead data
 * @param {string} followUpType - Type of follow-up
 * @returns {string} - Template content
 */
const getSmsTemplate = async (templateName, lead, followUpType) => {
  // Try to get from database first
  const template = await prisma.emailTemplate.findFirst({
    where: {
      organizationId: lead.organizationId,
      name: templateName
    }
  });
  
  if (template) {
    return replaceTemplateVariables(template.body, lead);
  }
  
  // Use default template
  return getDefaultSmsTemplate(templateName, lead);
};

/**
 * Replace template variables with lead data
 * @param {string} template - Template string
 * @param {Object} lead - Lead data
 * @returns {string} - Template with variables replaced
 */
const replaceTemplateVariables = (template, lead) => {
  const replacements = {
    '{{firstName}}': lead.firstName || '',
    '{{lastName}}': lead.lastName || '',
    '{{fullName}}': `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    '{{email}}': lead.email || '',
    '{{phone}}': lead.phone || '',
    '{{company}}': lead.company || '',
    '{{jobTitle}}': lead.jobTitle || '',
    '{{status}}': lead.status,
    '{{appointmentTime}}': lead.appointment?.startTime || '',
    '{{appointmentDate}}': lead.appointment?.startTime 
      ? moment(lead.appointment.startTime).format('MMMM D, YYYY') 
      : '',
    '{{appointmentTimeSlot}}': lead.appointment?.startTime 
      ? moment(lead.appointment.startTime).format('h:mm A') 
      : '',
    '{{assigneeName}}': lead.assignee 
      ? `${lead.assignee.firstName || ''} ${lead.assignee.lastName || ''}`.trim()
      : '',
    '{{assigneeEmail}}': lead.assignee?.email || '',
    '{{organizationName}}': lead.organization?.name || ''
  };
  
  let result = template;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable, 'g'), value);
  }
  
  return result;
};

/**
 * Get default email templates
 */
const getDefaultEmailTemplate = (templateName, lead) => {
  const templates = {
    incomplete_booking_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Complete Your Booking</h2>
          <p>Hi {{firstName}},</p>
          <p>We noticed you started a booking but didn't complete it. We'd love to help you schedule your appointment!</p>
          <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Booking</a></p>
          <p>If you have any questions, feel free to reply to this email.</p>
          <p>Best regards,<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

We noticed you started a booking but didn't complete it. We'd love to help you schedule your appointment!

Complete your booking here: #

If you have any questions, feel free to reply to this email.

Best regards,
{{organizationName}}`
    },
    booking_confirmation_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Appointment is Confirmed</h2>
          <p>Hi {{firstName}},</p>
          <p>Your appointment has been successfully scheduled:</p>
          <p><strong>Date:</strong> {{appointmentDate}}</p>
          <p><strong>Time:</strong> {{appointmentTimeSlot}}</p>
          <p>You will receive a reminder 24 hours before your appointment.</p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

Your appointment has been successfully scheduled:

Date: {{appointmentDate}}
Time: {{appointmentTimeSlot}}

You will receive a reminder 24 hours before your appointment.

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    appointment_reminder_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reminder: Your Appointment</h2>
          <p>Hi {{firstName}},</p>
          <p>This is a reminder about your upcoming appointment:</p>
          <p><strong>Date:</strong> {{appointmentDate}}</p>
          <p><strong>Time:</strong> {{appointmentTimeSlot}}</p>
          <p>We look forward to speaking with you!</p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

This is a reminder about your upcoming appointment:

Date: {{appointmentDate}}
Time: {{appointmentTimeSlot}}

We look forward to speaking with you!

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    post_appointment_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank You for Your Appointment</h2>
          <p>Hi {{firstName}},</p>
          <p>Thank you for taking the time to speak with us today. We hope you found our conversation valuable.</p>
          <p>If you have any follow-up questions or need additional information, please don't hesitate to reach out.</p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

Thank you for taking the time to speak with us today. We hope you found our conversation valuable.

If you have any follow-up questions or need additional information, please don't hesitate to reach out.

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    no_show_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>We Missed You!</h2>
          <p>Hi {{firstName}},</p>
          <p>We noticed you missed your scheduled appointment. We understand that things come up, and we'd love to reschedule.</p>
          <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reschedule Appointment</a></p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

We noticed you missed your scheduled appointment. We understand that things come up, and we'd love to reschedule.

Reschedule here: #

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    follow_up_1_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Following Up</h2>
          <p>Hi {{firstName}},</p>
          <p>We wanted to follow up regarding your interest in our services. Do you have any questions we can answer?</p>
          <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Schedule a Call</a></p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

We wanted to follow up regarding your interest in our services. Do you have any questions we can answer?

Schedule a call here: #

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    follow_up_2_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Still Interested?</h2>
          <p>Hi {{firstName}},</p>
          <p>We haven't heard back from you yet. Are you still interested in learning more about our services?</p>
          <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Yes, I'm Interested</a></p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

We haven't heard back from you yet. Are you still interested in learning more about our services?

Let us know here: #

Best regards,
{{assigneeName}}
{{organizationName}}`
    },
    follow_up_3_email: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Last Chance</h2>
          <p>Hi {{firstName}},</p>
          <p>This is our final follow-up. If you're still interested, please let us know soon as we have limited availability.</p>
          <p><a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Schedule Now</a></p>
          <p>Best regards,<br>{{assigneeName}}<br>{{organizationName}}</p>
        </div>
      `,
      text: `Hi {{firstName}},

This is our final follow-up. If you're still interested, please let us know soon as we have limited availability.

Schedule now: #

Best regards,
{{assigneeName}}
{{organizationName}}`
    }
  };
  
  return templates[templateName] || templates.follow_up_1_email;
};

/**
 * Get default SMS templates
 */
const getDefaultSmsTemplate = (templateName, lead) => {
  const templates = {
    incomplete_booking_sms: `Hi {{firstName}}! You started a booking but didn't complete it. Finish now: #`,
    booking_confirmation_sms: `Hi {{firstName}}! Your appointment is confirmed for {{appointmentDate}} at {{appointmentTimeSlot}}. See you then!`,
    appointment_reminder_sms: `Hi {{firstName}}! Reminder: Your appointment is tomorrow at {{appointmentTimeSlot}}. Don't forget!`,
    post_appointment_sms: `Hi {{firstName}}! Thanks for your appointment today. Let us know if you have any questions.`,
    no_show_sms: `Hi {{firstName}}! We missed you at your appointment. Let's reschedule: #`,
    follow_up_1_sms: `Hi {{firstName}}! Following up on your interest. Questions? Reply YES.`,
    follow_up_2_sms: `Hi {{firstName}}! Still interested? Reply YES to schedule a call.`,
    follow_up_3_sms: `Hi {{firstName}}! Last chance to schedule. Reply YES now.`
  };
  
  return replaceTemplateVariables(templates[templateName] || templates.follow_up_1_sms, lead);
};

/**
 * Record follow-up activity
 * @param {string} leadId - Lead ID
 * @param {string} followUpType - Type of follow-up
 * @param {Array} channels - Channels used
 * @param {Object} results - Results from each channel
 */
const recordFollowUp = async (leadId, followUpType, channels, results) => {
  await prisma.leadActivity.create({
    data: {
      id: uuidv4(),
      type: 'FOLLOW_UP_SENT',
      description: `Follow-up sent: ${followUpType}`,
      leadId,
      metadata: {
        followUpType,
        channels,
        results
      }
    }
  });
};

/**
 * Schedule follow-ups for a lead
 * @param {string} leadId - Lead ID
 */
const scheduleFollowUps = async (leadId) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { appointment: true }
    });
    
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }
    
    // Schedule immediate follow-ups
    const immediateFollowUps = Object.entries(FOLLOW_UP_TYPES)
      .filter(([type, config]) => config.timing.immediate)
      .map(([type]) => type);
    
    for (const type of immediateFollowUps) {
      await sendFollowUp(leadId, type);
    }
    
    // Schedule timed follow-ups
    const timedFollowUps = Object.entries(FOLLOW_UP_TYPES)
      .filter(([type, config]) => config.timing && !config.timing.immediate);
    
    for (const [type, config] of timedFollowUps) {
      for (const [timingName, timing] of Object.entries(config.timing)) {
        if (timingName === 'immediate') continue;
        
        // Calculate send time
        const sendTime = moment().add(timing);
        
        // Create scheduled follow-up
        await prisma.message.create({
          data: {
            id: uuidv4(),
            type: 'EMAIL',
            direction: 'OUTBOUND',
            subject: config.email.subject,
            body: `Scheduled follow-up: ${type}`,
            to: [lead.email],
            status: 'PENDING',
            leadId: lead.id,
            organizationId: lead.organizationId,
            metadata: {
              followUpType: type,
              scheduledFor: sendTime.toISOString()
            }
          }
        });
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Schedule follow-ups error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Check and send scheduled follow-ups
 * This should be run as a scheduled job (e.g., every hour)
 */
const checkScheduledFollowUps = async () => {
  try {
    const now = new Date();
    
    // Find pending messages that should be sent now
    const pendingMessages = await prisma.message.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
        metadata: { path: ['followUpType'], array_contains: [Object.keys(FOLLOW_UP_TYPES)] }
      },
      include: { lead: true }
    });
    
    for (const message of pendingMessages) {
      try {
        const followUpType = message.metadata?.followUpType;
        if (followUpType) {
          await sendFollowUp(message.leadId, followUpType);
          
          // Update message status
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'SENT', sentAt: now }
          });
        }
      } catch (err) {
        console.error('Error sending scheduled follow-up:', err);
        
        // Mark as failed
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'FAILED', errorMessage: err.message }
        });
      }
    }
    
    return { success: true, count: pendingMessages.length };
  } catch (err) {
    console.error('Check scheduled follow-ups error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get follow-up history for a lead
 * @param {string} leadId - Lead ID
 */
const getFollowUpHistory = async (leadId) => {
  return prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { lead: true }
  });
};

/**
 * Get follow-up statistics
 * @param {string} organizationId - Organization ID
 */
const getFollowUpStats = async (organizationId) => {
  const stats = {
    totalSent: 0,
    byType: {},
    byChannel: {},
    responseRate: 0
  };
  
  // Get message counts
  const messages = await prisma.message.findMany({
    where: { organizationId },
    select: { type: true, metadata: true }
  });
  
  stats.totalSent = messages.length;
  
  // Count by type
  for (const message of messages) {
    const type = message.metadata?.followUpType;
    if (type) {
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
  }
  
  // Count by channel
  const emailCount = await prisma.message.count({
    where: { organizationId, type: 'EMAIL' }
  });
  const smsCount = await prisma.message.count({
    where: { organizationId, type: 'SMS' }
  });
  
  stats.byChannel.EMAIL = emailCount;
  stats.byChannel.SMS = smsCount;
  
  return stats;
};

module.exports = {
  sendFollowUp,
  shouldSendFollowUp,
  scheduleFollowUps,
  checkScheduledFollowUps,
  getFollowUpHistory,
  getFollowUpStats,
  sendEmailFollowUp,
  sendSmsFollowUp,
  getEmailTemplate,
  getSmsTemplate,
  replaceTemplateVariables
};
