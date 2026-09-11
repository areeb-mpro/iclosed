const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Lead routing service - assigns leads to salespeople based on rules
 */

/**
 * Route a lead to the appropriate salesperson
 * @param {string} leadId - Lead ID
 * @param {string} organizationId - Organization ID
 */
const routeLead = async (leadId, organizationId) => {
  try {
    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      console.log(`Lead ${leadId} not found for routing`);
      return { success: false, error: 'Lead not found' };
    }
    
    // If lead already has an assignee, don't re-route
    if (lead.assigneeId) {
      console.log(`Lead ${leadId} already assigned to ${lead.assigneeId}`);
      return { success: true, message: 'Lead already assigned' };
    }
    
    // Get routing rules for the organization (sorted by priority)
    const rules = await prisma.routingRule.findMany({
      where: { 
        organizationId,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });
    
    if (rules.length === 0) {
      console.log(`No routing rules found for organization ${organizationId}`);
      return { success: true, message: 'No routing rules configured' };
    }
    
    let assignedUserId = null;
    
    // Try rule-based routing first
    for (const rule of rules) {
      if (rule.type === 'RULE_BASED') {
        assignedUserId = await applyRuleBasedRouting(rule, lead);
        if (assignedUserId) {
          break;
        }
      }
    }
    
    // If no rule-based assignment, try round-robin
    if (!assignedUserId) {
      const roundRobinRule = rules.find(r => r.type === 'ROUND_ROBIN');
      if (roundRobinRule) {
        assignedUserId = await applyRoundRobinRouting(roundRobinRule, organizationId);
      }
    }
    
    // If still no assignment, try manual or default
    if (!assignedUserId) {
      const manualRule = rules.find(r => r.type === 'MANUAL');
      if (manualRule && manualRule.targetUserId) {
        assignedUserId = manualRule.targetUserId;
      }
    }
    
    // If we have an assignment, update the lead
    if (assignedUserId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { assigneeId: assignedUserId }
      });
      
      // Record activity
      await prisma.leadActivity.create({
        data: {
          id: uuidv4(),
          type: 'ASSIGNED',
          description: `Lead assigned to user ${assignedUserId}`,
          leadId,
          metadata: { assigneeId: assignedUserId }
        }
      });
      
      // Update round-robin index if applicable
      const roundRobinRule = rules.find(r => r.type === 'ROUND_ROBIN' && r.teamIds.includes(assignedUserId));
      if (roundRobinRule) {
        const teamIds = roundRobinRule.teamIds;
        const currentIndex = roundRobinRule.currentIndex;
        const newIndex = (currentIndex + 1) % teamIds.length;
        
        await prisma.routingRule.update({
          where: { id: roundRobinRule.id },
          data: { currentIndex: newIndex }
        });
      }
      
      console.log(`Lead ${leadId} routed to ${assignedUserId}`);
      return { success: true, assigneeId: assignedUserId };
    }
    
    console.log(`Lead ${leadId} could not be routed - no suitable assignee`);
    return { success: true, message: 'No suitable assignee found' };
  } catch (err) {
    console.error('Routing error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Apply rule-based routing
 * @param {Object} rule - Routing rule
 * @param {Object} lead - Lead data
 * @returns {string|null} - User ID or null
 */
const applyRuleBasedRouting = async (rule, lead) => {
  try {
    const { conditions, targetUserId } = rule;
    
    if (!conditions || !targetUserId) {
      return null;
    }
    
    // Check if lead matches conditions
    let matches = true;
    
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      let leadValue;
      
      // Get value from lead
      switch (field) {
        case 'status':
          leadValue = lead.status;
          break;
        case 'source':
          leadValue = lead.source;
          break;
        case 'company':
          leadValue = lead.company;
          break;
        case 'jobTitle':
          leadValue = lead.jobTitle;
          break;
        default:
          if (field.startsWith('custom.')) {
            const customField = field.replace('custom.', '');
            leadValue = lead.customFields?.[customField];
          } else {
            leadValue = lead[field];
          }
      }
      
      // Evaluate condition
      const conditionPasses = evaluateCondition(leadValue, operator, value);
      
      if (!conditionPasses) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return targetUserId;
    }
    
    return null;
  } catch (err) {
    console.error('Rule-based routing error:', err);
    return null;
  }
};

/**
 * Apply round-robin routing
 * @param {Object} rule - Round-robin rule
 * @param {string} organizationId - Organization ID
 * @returns {string|null} - User ID or null
 */
const applyRoundRobinRouting = async (rule, organizationId) => {
  try {
    const { teamIds, currentIndex } = rule;
    
    if (!teamIds || teamIds.length === 0) {
      return null;
    }
    
    // Get next user in rotation
    const nextIndex = currentIndex % teamIds.length;
    const nextUserId = teamIds[nextIndex];
    
    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: nextUserId,
        organizationId,
        status: 'ACTIVE'
      }
    });
    
    if (user) {
      return nextUserId;
    }
    
    // If user is not available, try next in rotation
    for (let i = 1; i < teamIds.length; i++) {
      const tryIndex = (currentIndex + i) % teamIds.length;
      const tryUserId = teamIds[tryIndex];
      
      const tryUser = await prisma.user.findUnique({
        where: { 
          id: tryUserId,
          organizationId,
          status: 'ACTIVE'
        }
      });
      
      if (tryUser) {
        return tryUserId;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Round-robin routing error:', err);
    return null;
  }
};

/**
 * Evaluate a single condition
 * @param {*} leadValue - Value from lead
 * @param {string} operator - Comparison operator
 * @param {*} value - Value to compare against
 * @returns {boolean} - Whether condition passes
 */
const evaluateCondition = (leadValue, operator, value) => {
  try {
    const normalize = (val) => {
      if (typeof val === 'string') return val.toLowerCase().trim();
      return val;
    };
    
    const leadVal = normalize(leadValue);
    const conditionVal = normalize(value);
    
    switch (operator) {
      case '==':
        return leadVal === conditionVal;
      case '!=':
        return leadVal !== conditionVal;
      case '>':
        return Number(leadVal) > Number(conditionVal);
      case '<':
        return Number(leadVal) < Number(conditionVal);
      case '>=':
        return Number(leadVal) >= Number(conditionVal);
      case '<=':
        return Number(leadVal) <= Number(conditionVal);
      case 'in':
        return Array.isArray(conditionVal) ? conditionVal.includes(leadVal) : false;
      case 'notIn':
        return Array.isArray(conditionVal) ? !conditionVal.includes(leadVal) : true;
      case 'contains':
        return String(leadVal).includes(String(conditionVal));
      case 'startsWith':
        return String(leadVal).startsWith(String(conditionVal));
      case 'endsWith':
        return String(leadVal).endsWith(String(conditionVal));
      default:
        return false;
    }
  } catch (err) {
    console.error('Condition evaluation error:', err);
    return false;
  }
};

/**
 * Get routing rules for an organization
 * @param {string} organizationId - Organization ID
 */
const getRoutingRules = async (organizationId) => {
  return prisma.routingRule.findMany({
    where: { organizationId },
    orderBy: { priority: 'desc' },
    include: {
      team: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });
};

/**
 * Create a routing rule
 * @param {Object} ruleData - Rule data
 * @param {string} organizationId - Organization ID
 */
const createRoutingRule = async (ruleData, organizationId) => {
  return prisma.routingRule.create({
    data: {
      id: uuidv4(),
      ...ruleData,
      organizationId,
      currentIndex: 0
    }
  });
};

/**
 * Update a routing rule
 * @param {string} ruleId - Rule ID
 * @param {Object} updateData - Updated rule data
 */
const updateRoutingRule = async (ruleId, updateData) => {
  return prisma.routingRule.update({
    where: { id: ruleId },
    data: updateData
  });
};

/**
 * Delete a routing rule
 * @param {string} ruleId - Rule ID
 */
const deleteRoutingRule = async (ruleId) => {
  return prisma.routingRule.delete({
    where: { id: ruleId }
  });
};

/**
 * Get available salespeople for routing
 * @param {string} organizationId - Organization ID
 */
const getAvailableSalespeople = async (organizationId) => {
  return prisma.user.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      role: { in: ['SALES', 'ADMIN'] }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    },
    orderBy: { lastName: 'asc' }
  });
};

/**
 * Re-route a lead (when rules change or assignee becomes unavailable)
 * @param {string} leadId - Lead ID
 */
const rerouteLead = async (leadId) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }
    
    // Clear current assignment
    await prisma.lead.update({
      where: { id: leadId },
      data: { assigneeId: null }
    });
    
    // Re-route
    return routeLead(leadId, lead.organizationId);
  } catch (err) {
    console.error('Re-routing error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get routing statistics
 * @param {string} organizationId - Organization ID
 */
const getRoutingStats = async (organizationId) => {
  const rules = await getRoutingRules(organizationId);
  
  const stats = {
    totalRules: rules.length,
    byType: {
      ROUND_ROBIN: 0,
      RULE_BASED: 0,
      MANUAL: 0
    },
    totalTeamMembers: 0,
    assignments: {}
  };
  
  rules.forEach(rule => {
    stats.byType[rule.type]++;
    if (rule.type === 'ROUND_ROBIN') {
      stats.totalTeamMembers += rule.teamIds?.length || 0;
    }
  });
  
  // Get assignment counts
  const assignments = await prisma.lead.groupBy({
    by: ['assigneeId'],
    where: {
      organizationId,
      assigneeId: { not: null }
    },
    _count: { _all: true }
  });
  
  for (const assignment of assignments) {
    const user = await prisma.user.findUnique({
      where: { id: assignment.assigneeId },
      select: { firstName: true, lastName: true }
    });
    
    const name = user 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
      : 'Unknown';
    
    stats.assignments[name] = assignment._count._all;
  }
  
  return stats;
};

module.exports = {
  routeLead,
  applyRuleBasedRouting,
  applyRoundRobinRouting,
  evaluateCondition,
  getRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  getAvailableSalespeople,
  rerouteLead,
  getRoutingStats
};
