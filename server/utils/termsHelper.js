/**
 * Terms, Privacy & ACH Helper Functions
 * Utility functions for building JSONB objects for terms acceptance
 * 
 * Single source of truth for JSONB structure
 */

/**
 * Build Terms of Service JSONB object
 * @param {boolean} accepted - Whether terms were accepted
 * @param {string|null} signature - Digital signature (typed name)
 * @param {string|null} ipAddress - User's IP address
 * @param {string|null} userAgent - User's browser user agent
 * @param {string} method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns {object} JSONB object for terms_and_conditions column
 */
function buildTermsObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    method: method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null
  };
}

/**
 * Build Privacy Policy JSONB object
 * @param {boolean} accepted - Whether privacy policy was accepted
 * @param {string|null} signature - Digital signature (typed name)
 * @param {string|null} ipAddress - User's IP address
 * @param {string|null} userAgent - User's browser user agent
 * @param {string} method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns {object} JSONB object for privacy_policy column
 */
function buildPrivacyObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    method: method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null
  };
}

/**
 * Build ACH Authorization JSONB object
 * @param {boolean} accepted - Whether ACH authorization was accepted
 * @param {string|null} signature - Digital signature (typed name)
 * @param {string|null} ipAddress - User's IP address
 * @param {string|null} userAgent - User's browser user agent
 * @param {string} method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns {object} JSONB object for ach_authorization column
 */
function buildAchObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    method: method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null,
    bankVerified: false,
    nachaCompliance: accepted
  };
}

module.exports = {
  buildTermsObject,
  buildPrivacyObject,
  buildAchObject
};
