const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { success, created, error, notFound, paginated } = require('../utils/responseHandler');
const { qualifyLead } = require('../services/qualification.service');
const { routeLead } = require('../services/routing.service');
const { sendFollowUp } = require('../services/followup.service');

/**
 * Create a new lead
 */
const createLead = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      customFields,
      formId,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      ipAddress,
      userAgent,
      referrer
    } = req.body;
    
    // Validate required fields
    if (!firstName && !email && !phone) {
      return error(res, 'At least first name, email, or phone is required', 400, 'VALIDATION_ERROR');
    }
    
    // Get organization ID
    const organizationId = req.user.organizationId;
    
    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        id: uuidv4(),
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        customFields,
        formId,
        source: source || 'BOOKING_FORM',
        organizationId,
        ipAddress,
        userAgent,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign
      },
      include: {
        organization: true,
        owner: true,
        assignee: true
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'CREATED',
        description: 'Lead created',
        leadId: lead.id,
        createdById: req.user.id
      }
    });
    
    // Qualify the lead (async - don't wait for response)
    qualifyLead(lead.id, organizationId).catch(console.error);
    
    // Route the lead (async)
    routeLead(lead.id, organizationId).catch(console.error);
    
    // Send follow-up if needed (async)
    if (lead.status === 'NEW') {
      sendFollowUp(lead.id, 'incomplete_booking').catch(console.error);
    }
    
    created(res, lead, 'Lead created successfully');
  } catch (err) {
    console.error('Create lead error:', err);
    error(res, 'Failed to create lead', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get all leads with pagination and filtering
 */
const getAllLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      source,
      ownerId,
      assigneeId,
      startDate,
      endDate,
      search
    } = req.query;
    
    const organizationId = req.user.organizationId;
    
    // Build where clause
    const where = { organizationId };
    
    if (status) where.status = status;
    if (source) where.source = source;
    if (ownerId) where.ownerId = ownerId;
    if (assigneeId) where.assigneeId = assigneeId;
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Search filtering
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get total count
    const total = await prisma.lead.count({ where });
    
    // Get leads
    const leads = await prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        appointment: {
          select: { id: true, startTime: true, status: true }
        },
        notes: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    paginated(res, leads, { page: parseInt(page), limit: parseInt(limit), total }, 'Leads retrieved');
  } catch (err) {
    console.error('Get all leads error:', err);
    error(res, 'Failed to get leads', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get a single lead by ID
 */
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        appointment: {
          include: {
            meetingType: true,
            reminders: true
          }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        organization: true
      }
    });
    
    if (!lead) {
      return notFound(res, 'Lead', id);
    }
    
    // Check organization access
    if (lead.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this lead', 403, 'FORBIDDEN');
    }
    
    success(res, lead, 'Lead retrieved');
  } catch (err) {
    console.error('Get lead by ID error:', err);
    error(res, 'Failed to get lead', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update a lead
 */
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      customFields,
      status,
      disqualificationReason,
      ownerId,
      assigneeId
    } = req.body;
    
    // Find lead first
    const existingLead = await prisma.lead.findUnique({
      where: { id }
    });
    
    if (!existingLead) {
      return notFound(res, 'Lead', id);
    }
    
    // Check organization access
    if (existingLead.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this lead', 403, 'FORBIDDEN');
    }
    
    // Build update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (customFields !== undefined) updateData.customFields = customFields;
    if (status !== undefined) updateData.status = status;
    if (disqualificationReason !== undefined) updateData.disqualificationReason = disqualificationReason;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    
    // Update timestamps for status changes
    if (status === 'QUALIFIED' && existingLead.status !== 'QUALIFIED') {
      updateData.qualifiedAt = new Date();
    }
    if (status === 'BOOKED' && existingLead.status !== 'BOOKED') {
      updateData.bookedAt = new Date();
    }
    if ((status === 'CLOSED_WON' || status === 'CLOSED_LOST') && !existingLead.closedAt) {
      updateData.closedAt = new Date();
    }
    
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
        assignee: true,
        appointment: true,
        organization: true
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'CONTACTED',
        description: `Lead updated. Status changed to ${status || existingLead.status}`,
        leadId: lead.id,
        createdById: req.user.id,
        metadata: { changes: Object.keys(updateData) }
      }
    });
    
    success(res, lead, 'Lead updated successfully');
  } catch (err) {
    console.error('Update lead error:', err);
    error(res, 'Failed to update lead', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Delete a lead
 */
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find lead first
    const lead = await prisma.lead.findUnique({
      where: { id }
    });
    
    if (!lead) {
      return notFound(res, 'Lead', id);
    }
    
    // Check organization access
    if (lead.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this lead', 403, 'FORBIDDEN');
    }
    
    // Delete lead (cascade will delete related notes, activities, etc.)
    await prisma.lead.delete({
      where: { id }
    });
    
    success(res, null, 'Lead deleted successfully');
  } catch (err) {
    console.error('Delete lead error:', err);
    error(res, 'Failed to delete lead', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get leads by status
 */
const getLeadsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const organizationId = req.user.organizationId;
    
    // Validate status
    const validStatuses = ['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONTACTED', 'BOOKED', 'NO_SHOW', 'CLOSED_WON', 'CLOSED_LOST'];
    if (!validStatuses.includes(status)) {
      return error(res, 'Invalid status', 400, 'VALIDATION_ERROR');
    }
    
    // Get count
    const total = await prisma.lead.count({
      where: { organizationId, status }
    });
    
    // Get leads
    const leads = await prisma.lead.findMany({
      where: { organizationId, status },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        appointment: {
          select: { id: true, startTime: true, status: true }
        }
      }
    });
    
    paginated(res, leads, { page: parseInt(page), limit: parseInt(limit), total }, `Leads with status '${status}' retrieved`);
  } catch (err) {
    console.error('Get leads by status error:', err);
    error(res, 'Failed to get leads by status', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get qualified leads
 */
const getQualifiedLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const organizationId = req.user.organizationId;
    
    const total = await prisma.lead.count({
      where: { organizationId, status: 'QUALIFIED' }
    });
    
    const leads = await prisma.lead.findMany({
      where: { organizationId, status: 'QUALIFIED' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { qualifiedAt: 'desc' },
      include: {
        owner: true,
        assignee: true,
        appointment: true
      }
    });
    
    paginated(res, leads, { page: parseInt(page), limit: parseInt(limit), total }, 'Qualified leads retrieved');
  } catch (err) {
    console.error('Get qualified leads error:', err);
    error(res, 'Failed to get qualified leads', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get disqualified leads
 */
const getDisqualifiedLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const organizationId = req.user.organizationId;
    
    const total = await prisma.lead.count({
      where: { organizationId, status: 'DISQUALIFIED' }
    });
    
    const leads = await prisma.lead.findMany({
      where: { organizationId, status: 'DISQUALIFIED' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        assignee: true
      }
    });
    
    paginated(res, leads, { page: parseInt(page), limit: parseInt(limit), total }, 'Disqualified leads retrieved');
  } catch (err) {
    console.error('Get disqualified leads error:', err);
    error(res, 'Failed to get disqualified leads', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Add a note to a lead
 */
const addLeadNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return error(res, 'Note content is required', 400, 'VALIDATION_ERROR');
    }
    
    // Find lead
    const lead = await prisma.lead.findUnique({
      where: { id }
    });
    
    if (!lead) {
      return notFound(res, 'Lead', id);
    }
    
    // Check organization access
    if (lead.organizationId !== req.user.organizationId && req.user.role !== 'ADMIN') {
      return error(res, 'You do not have access to this lead', 403, 'FORBIDDEN');
    }
    
    // Create note
    const note = await prisma.leadNote.create({
      data: {
        id: uuidv4(),
        content,
        leadId: id,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: 'NOTE_ADDED',
        description: 'Note added to lead',
        leadId: id,
        createdById: req.user.id,
        metadata: { noteId: note.id }
      }
    });
    
    created(res, note, 'Note added successfully');
  } catch (err) {
    console.error('Add lead note error:', err);
    error(res, 'Failed to add note', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get lead statistics
 */
const getLeadStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get counts by status
    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true }
    });
    
    // Get count by source
    const sourceCounts = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId },
      _count: { _all: true }
    });
    
    // Get count by owner
    const ownerCounts = await prisma.lead.groupBy({
      by: ['ownerId'],
      where: { organizationId, ownerId: { not: null } },
      _count: { _all: true },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    
    // Get recent leads
    const recentLeads = await prisma.lead.findMany({
      where: { organizationId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true
      }
    });
    
    // Format response
    const stats = {
      total: 0,
      byStatus: {},
      bySource: {},
      byOwner: {},
      recentLeads
    };
    
    // Calculate totals
    let total = 0;
    statusCounts.forEach(group => {
      stats.byStatus[group.status] = group._count._all;
      total += group._count._all;
    });
    stats.total = total;
    
    sourceCounts.forEach(group => {
      stats.bySource[group.source] = group._count._all;
    });
    
    ownerCounts.forEach(group => {
      const ownerName = group.owner 
        ? `${group.owner.firstName || ''} ${group.owner.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';
      stats.byOwner[ownerName] = group._count._all;
    });
    
    success(res, stats, 'Lead statistics retrieved');
  } catch (err) {
    console.error('Get lead stats error:', err);
    error(res, 'Failed to get lead statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Export leads (CSV or JSON)
 */
const exportLeads = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const organizationId = req.user.organizationId;
    
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { firstName: true, lastName: true, email: true }
        },
        appointment: {
          select: { startTime: true, status: true }
        }
      }
    });
    
    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Status', 'Source', 'Owner', 'Assignee', 'Created At', 'Qualified At',
        'Appointment Time', 'Appointment Status'
      ];
      
      const csvRows = leads.map(lead => [
        lead.id,
        lead.firstName || '',
        lead.lastName || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.jobTitle || '',
        lead.status,
        lead.source,
        lead.owner ? `${lead.owner.firstName || ''} ${lead.owner.lastName || ''}`.trim() : '',
        lead.assignee ? `${lead.assignee.firstName || ''} ${lead.assignee.lastName || ''}`.trim() : '',
        lead.createdAt,
        lead.qualifiedAt || '',
        lead.appointment?.startTime || '',
        lead.appointment?.status || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      
      const csv = [csvHeaders.join(','), ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
      res.send(csv);
    } else {
      // Return JSON
      success(res, leads, 'Leads exported');
    }
  } catch (err) {
    console.error('Export leads error:', err);
    error(res, 'Failed to export leads', 500, 'INTERNAL_ERROR');
  }
};

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadsByStatus,
  getQualifiedLeads,
  getDisqualifiedLeads,
  addLeadNote,
  getLeadStats,
  exportLeads
};
