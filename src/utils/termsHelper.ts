/**
 * Terms, Privacy & ACH Helper Functions (Frontend)
 * Utility functions for building JSONB objects for terms acceptance
 * 
 * Single source of truth for JSONB structure
 */

export interface TermsData {
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  method: string;
  signature: string | null;
  signatureMethod: string | null;
}

export interface AchData extends TermsData {
  bankVerified?: boolean;
  nachaCompliance?: boolean;
}

/**
 * Build Terms of Service JSONB object
 * @param accepted - Whether terms were accepted
 * @param signature - Digital signature (typed name)
 * @param method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns JSONB object for terms_and_conditions column
 */
export function buildTermsObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): TermsData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null
  };
}

/**
 * Build Privacy Policy JSONB object
 * @param accepted - Whether privacy policy was accepted
 * @param signature - Digital signature (typed name)
 * @param method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns JSONB object for privacy_policy column
 */
export function buildPrivacyObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): TermsData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null
  };
}

/**
 * Build ACH Authorization JSONB object
 * @param accepted - Whether ACH authorization was accepted
 * @param signature - Digital signature (typed name)
 * @param method - Acceptance method (web_form, email_link, admin_override, launch_password_reset)
 * @returns JSONB object for ach_authorization column
 */
export function buildAchObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): AchData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature: signature || null,
    signatureMethod: signature ? 'typed_name' : null,
    bankVerified: false,
    nachaCompliance: accepted
  };
}
