const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Qualification service - evaluates leads against qualification rules
 */

/**
 * Evaluate a single rule against lead data
 * @param {Object} rule - Qualification rule
 * @param {Object} lead - Lead data
 * @returns {boolean} - Whether the rule passes
 */
const evaluateRule = (rule, lead) => {
  try {
    const { field, operator, value } = rule;
    let leadValue;
    
    // Get the value from the lead
    switch (field) {
      case 'companySize':
        leadValue = lead.customFields?.companySize || lead.company;
        break;
      case 'budget':
        leadValue = lead.customFields?.budget;
        break;
      case 'country':
        leadValue = lead.customFields?.country;
        break;
      case 'jobRole':
        leadValue = lead.jobTitle || lead.customFields?.jobRole;
        break;
      default:
        // Check custom fields
        if (field.startsWith('custom.')) {
          const customField = field.replace('custom.', '');
          leadValue = lead.customFields?.[customField];
        } else {
          leadValue = lead[field];
        }
    }
    
    // Normalize values for comparison
    const normalize = (val) => {
      if (typeof val === 'string') return val.toLowerCase().trim();
      return val;
    };
    
    const leadVal = normalize(leadValue);
    const ruleVal = normalize(value);
    
    // Evaluate based on operator
    switch (operator) {
      case '==':
        return leadVal === ruleVal;
      case '!=':
        return leadVal !== ruleVal;
      case '>':
        return Number(leadVal) > Number(ruleVal);
      case '<':
        return Number(leadVal) < Number(ruleVal);
      case '>=':
        return Number(leadVal) >= Number(ruleVal);
      case '<=':
        return Number(leadVal) <= Number(ruleVal);
      case 'in':
        return Array.isArray(ruleVal) ? ruleVal.includes(leadVal) : false;
      case 'notIn':
        return Array.isArray(ruleVal) ? !ruleVal.includes(leadVal) : true;
      case 'contains':
        return String(leadVal).includes(String(ruleVal));
      case 'startsWith':
        return String(leadVal).startsWith(String(ruleVal));
      case 'endsWith':
        return String(leadVal).endsWith(String(ruleVal));
      case 'regex':
        const regex = new RegExp(ruleVal, 'i');
        return regex.test(String(leadVal));
      default:
        return false;
    }
  } catch (err) {
    console.error('Error evaluating rule:', err);
    return false;
  }
};

/**
 * Qualify a lead based on organization's qualification rules
 * @param {string} leadId - Lead ID
 * @param {string} organizationId - Organization ID
 */
const qualifyLead = async (leadId, organizationId) => {
  try {
    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { customFields: true }
    });
    
    if (!lead) {
      console.log(`Lead ${leadId} not found for qualification`);
      return;
    }
    
    // Get qualification rules for the organization
    const rules = await prisma.qualificationRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' }
    });
    
    if (rules.length === 0) {
      console.log(`No qualification rules found for organization ${organizationId}`);
      return;
    }
    
    let score = 0;
    let isDisqualified = false;
    let disqualificationReason = null;
    
    // Evaluate each rule
    for (const rule of rules) {
      const rulePasses = evaluateRule(rule, lead);
      
      if (rulePasses) {
        score += rule.score || 0;
      } else if (rule.isRequired) {
        // Required rule failed - disqualify
        isDisqualified = true;
        disqualificationReason = `Failed required rule: ${rule.name || rule.field}`;
        break;
      }
    }
    
    // Determine status
    let status = lead.status;
    
    if (isDisqualified) {
      status = 'DISQUALIFIED';
    } else if (score >= 50) { // Threshold can be configurable
      status = 'QUALIFIED';
    }
    
    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        qualificationScore: score,
        status: status === 'NEW' ? lead.status : status, // Don't change if already set
        disqualificationReason: disqualificationReason || null
      }
    });
    
    // Record activity
    await prisma.leadActivity.create({
      data: {
        id: uuidv4(),
        type: status === 'QUALIFIED' ? 'QUALIFIED' : 'DISQUALIFIED',
        description: status === 'QUALIFIED' 
          ? `Lead qualified with score ${score}`
          : `Lead disqualified: ${disqualificationReason}`,
        leadId,
        metadata: { score, rulesEvaluated: rules.length }
      }
    });
    
    console.log(`Lead ${leadId} qualified: ${status} (score: ${score})`);
    
    return { success: true, status, score, disqualificationReason };
  } catch (err) {
    console.error('Qualification error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Re-qualify a lead (when rules change or lead data is updated)
 * @param {string} leadId - Lead ID
 */
const requalifyLead = async (leadId) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }
    
    return qualifyLead(leadId, lead.organizationId);
  } catch (err) {
    console.error('Re-qualification error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get qualification rules for an organization
 * @param {string} organizationId - Organization ID
 */
const getQualificationRules = async (organizationId) => {
  return prisma.qualificationRule.findMany({
    where: { organizationId },
    orderBy: { priority: 'desc' }
  });
};

/**
 * Create a qualification rule
 * @param {Object} ruleData - Rule data
 * @param {string} organizationId - Organization ID
 */
const createQualificationRule = async (ruleData, organizationId) => {
  return prisma.qualificationRule.create({
    data: {
      id: uuidv4(),
      ...ruleData,
      organizationId
    }
  });
};

/**
 * Update a qualification rule
 * @param {string} ruleId - Rule ID
 * @param {Object} updateData - Updated rule data
 */
const updateQualificationRule = async (ruleId, updateData) => {
  return prisma.qualificationRule.update({
    where: { id: ruleId },
    data: updateData
  });
};

/**
 * Delete a qualification rule
 * @param {string} ruleId - Rule ID
 */
const deleteQualificationRule = async (ruleId) => {
  return prisma.qualificationRule.delete({
    where: { id: ruleId }
  });
};

/**
 * Test qualification rules against sample data
 * @param {Object} sampleData - Sample lead data
 * @param {string} organizationId - Organization ID
 */
const testQualificationRules = async (sampleData, organizationId) => {
  const rules = await getQualificationRules(organizationId);
  
  const results = rules.map(rule => ({
    rule,
    passes: evaluateRule(rule, sampleData)
  }));
  
  return results;
};

module.exports = {
  qualifyLead,
  requalifyLead,
  getQualificationRules,
  createQualificationRule,
  updateQualificationRule,
  deleteQualificationRule,
  testQualificationRules,
  evaluateRule
};
