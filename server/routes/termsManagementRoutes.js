const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const PDFDocument = require("pdfkit");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseAdmin = () => {
  try {
    // Try service role key first, fallback to anon key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      supabaseUrl: supabaseUrl
    });
    
    if (!serviceKey && !anonKey) {
      throw new Error("No Supabase keys configured");
    }
    
    const keyToUse = serviceKey || anonKey;
    console.log(`Using Supabase key type: ${serviceKey ? 'service_role' : 'anon'}`);
    
    return createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
};

/**
 * Get user terms acceptance details for admin viewing
 * GET /api/terms-management/user-terms/:profileId
 */
router.get("/user-terms/:profileId", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { profileId } = req.params;

    // Get user profile with terms information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id, first_name, last_name, email, company_name,
        terms_and_conditions, terms_signature,
        privacy_policy_accepted, privacy_policy_accepted_at, privacy_policy_signature,
        ach_authorization_accepted, ach_authorization_accepted_at, ach_authorization_signature,
        ach_authorization_version, ach_authorization_ip_address,
        created_at, updated_at
      `)
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      data: {
        profile: profile,
        history: []
      }
    });

  } catch (error) {
    console.error("Get user terms error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

/**
 * Get all users with their terms acceptance status for admin dashboard
 * GET /api/terms-management/users-terms-status
 */
router.get("/users-terms-status", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id, first_name, last_name, email, company_name, type, status,
        terms_and_conditions, terms_signature,
        privacy_policy_accepted, privacy_policy_accepted_at, privacy_policy_signature,
        ach_authorization_accepted, ach_authorization_accepted_at, ach_authorization_signature,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching users terms status:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users terms status",
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: profiles || []
    });

  } catch (error) {
    console.error("Users terms status fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});
router.get("/generate-pdf/:profileId", async (req, res) => {
  console.log('=== PDF Generation Started ===');
  console.log('Profile ID:', req.params.profileId);
  
  try {
    console.log('Step 1: Creating Supabase client...');
    const supabaseAdmin = getSupabaseAdmin();
    console.log('Step 1: ✅ Supabase client created');
    
    const { profileId } = req.params;
    console.log(`Step 2: Fetching profile for ID: ${profileId}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    console.log('Step 2: Profile fetch result:', { 
      hasProfile: !!profile, 
      error: profileError?.message 
    });

    let userData;
    if (profileError || !profile) {
      console.log('Step 3: Using sample data (profile not found)');
      // Create sample data for testing when user not found
      userData = {
        id: profileId,
        first_name: "Sample",
        last_name: "User",
        email: "sample@example.com",
        company_name: "Sample Pharmacy",
        type: "pharmacy",
        status: "active",
        phone: "(555) 123-4567",
        mobile_phone: "(555) 987-6543",
        terms_and_conditions: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          version: "1.0",
          ipAddress: "127.0.0.1"
        },
        privacy_policy_accepted: true,
        privacy_policy_accepted_at: new Date().toISOString(),
        ach_authorization_accepted: false,
        tax_id: "12-3456789",
        pharmacy_license: "PH123456",
        credit_limit: 5000,
        payment_terms: "Net 30",
        created_at: new Date().toISOString(),
        billing_address: {
          street1: "123 Main St",
          city: "Sample City",
          state: "CA",
          zip_code: "12345",
          phone: "(555) 123-4567"
        }
      };
    } else {
      console.log('Step 3: Using real profile data');
      userData = profile;
    }

    console.log('Step 4: Creating PDF document...');
    // Create PDF - single page, no auto-pagination
    const doc = new PDFDocument({ 
      autoFirstPage: false,
      size: 'A4'
    });
    // Manually add exactly one page
    doc.addPage({ size: 'A4', margin: 0 });
    console.log('Step 4: ✅ PDF document created');
    
    console.log('Step 5: Setting response headers...');
    const filename = `pharmacy-profile-${userData.first_name}-${userData.last_name}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log('Step 5: ✅ Headers set');
    
    console.log('Step 6: Piping PDF to response...');
    doc.pipe(res);
    console.log('Step 6: ✅ PDF piped to response');

    console.log('Step 7: Adding content to PDF...');
    
    // Page dimensions (A4 in points: 595.28 x 841.89)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    
    // Colors matching other PDFs (Blue-500 theme)
    const primaryBlue = '#3B82F6';
    const darkText = '#1F2937';
    const mediumText = '#6B7280';
    const lightBg = '#F3F4F6';
    const successGreen = '#22C55E';
    const dangerRed = '#EF4444';
    
    // All text uses explicit x,y and lineBreak:false to prevent auto-pagination
    const t = (str, x, y, opts) => {
      doc.text(String(str), x, y, Object.assign({ lineBreak: false }, opts || {}));
    };
    
    // Helper: center-aligned text (compute x manually, no width/align)
    const tCenter = (str, y) => {
      const w = doc.widthOfString(String(str));
      t(str, (pageWidth - w) / 2, y);
    };
    
    // Helper: right-aligned text (compute x manually)
    const tRight = (str, y) => {
      const w = doc.widthOfString(String(str));
      t(str, pageWidth - margin - w, y);
    };
    
    // === TOP BLUE BAND ===
    doc.rect(0, 0, pageWidth, 9).fill(primaryBlue);
    
    // === COMPANY LOGO (left side) ===
    doc.fontSize(24).fillColor(darkText).font('Helvetica-Bold');
    t('9RX', margin, 20);
    
    doc.fontSize(8).fillColor(mediumText).font('Helvetica');
    t('Your Trusted Pharmacy Partner', margin, 44);
    
    // === DOCUMENT TITLE (right side - two lines, no overlap) ===
    doc.fontSize(20).fillColor(primaryBlue).font('Helvetica-Bold');
    tRight('PHARMACY', 17);
    tRight('PROFILE', 38);
    
    // Report reference & date (below title, right aligned)
    doc.fontSize(8).fillColor(mediumText).font('Helvetica');
    tRight(`Ref: RPT-${userData.id.substring(0, 8).toUpperCase()}`, 58);
    tRight(`Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 70);
    
    // === SEPARATOR LINE ===
    doc.strokeColor('#E5E7EB').lineWidth(0.5)
       .moveTo(margin, 84).lineTo(pageWidth - margin, 84).stroke();
    
    // Sample data note
    let currentY = 92;
    if (!profile) {
      doc.fontSize(8).fillColor(dangerRed).font('Helvetica-Bold');
      tCenter('NOTE: This is a sample report - user not found in database', currentY);
      currentY = 106;
    }
    
    // Helper: draw a rounded rect box
    const drawBox = (x, y, w, h) => {
      doc.save();
      doc.roundedRect(x, y, w, h, 4).fill(lightBg);
      doc.restore();
    };
    
    // Helper: section header inside a box
    const drawHeader = (str, x, y) => {
      doc.fontSize(8).fillColor(primaryBlue).font('Helvetica-Bold');
      t(str, x + 10, y + 8);
    };
    
    // Helper: label-value pair
    const drawField = (label, value, x, y) => {
      doc.fontSize(7).fillColor(mediumText).font('Helvetica');
      t(label, x, y);
      doc.fontSize(8).fillColor(darkText).font('Helvetica-Bold');
      t(value || 'N/A', x, y + 11);
    };
    
    // === ROW 1: USER INFORMATION & ACCOUNT DETAILS ===
    const gap = 10;
    const boxW = (contentWidth - gap) / 2;
    const row1H = 88;
    
    // Left box - User Information
    drawBox(margin, currentY, boxW, row1H);
    drawHeader('USER INFORMATION', margin, currentY);
    const li = margin + 10;
    drawField('Name', `${userData.first_name || ''} ${userData.last_name || ''}`, li, currentY + 22);
    drawField('Email', userData.email || 'N/A', li, currentY + 44);
    drawField('Company', userData.company_name || 'N/A', li, currentY + 66);
    
    // Right box - Account Details
    const rx = margin + boxW + gap;
    drawBox(rx, currentY, boxW, row1H);
    drawHeader('ACCOUNT DETAILS', rx, currentY);
    const ri = rx + 10;
    drawField('Status', (userData.status || 'N/A').toUpperCase(), ri, currentY + 22);
    drawField('Type', (userData.type || 'N/A').charAt(0).toUpperCase() + (userData.type || 'N/A').slice(1), ri, currentY + 44);
    drawField('Phone', userData.phone || userData.mobile_phone || 'N/A', ri, currentY + 66);
    
    currentY += row1H + 10;
    
    // === ROW 2: TERMS & CONDITIONS STATUS ===
    const termsH = 88;
    drawBox(margin, currentY, contentWidth, termsH);
    drawHeader('TERMS & CONDITIONS STATUS', margin, currentY);
    
    const ti = margin + 10;
    const tsy = currentY + 24;
    const colW = (contentWidth - 20) / 3;
    
    // Terms of Service
    const termsAccepted = userData.terms_and_conditions?.accepted || false;
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    t('Terms of Service', ti, tsy);
    doc.fontSize(9).fillColor(termsAccepted ? successGreen : dangerRed).font('Helvetica-Bold');
    t(termsAccepted ? 'ACCEPTED' : 'NOT ACCEPTED', ti, tsy + 12);
    if (userData.terms_and_conditions?.acceptedAt) {
      doc.fontSize(6).fillColor(mediumText).font('Helvetica');
      t(`on ${new Date(userData.terms_and_conditions.acceptedAt).toLocaleDateString('en-US')}`, ti, tsy + 24);
    }
    
    // Privacy Policy
    const privacyAccepted = userData.privacy_policy_accepted;
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    t('Privacy Policy', ti + colW, tsy);
    doc.fontSize(9).fillColor(privacyAccepted ? successGreen : dangerRed).font('Helvetica-Bold');
    t(privacyAccepted ? 'ACCEPTED' : 'NOT ACCEPTED', ti + colW, tsy + 12);
    if (userData.privacy_policy_accepted_at) {
      doc.fontSize(6).fillColor(mediumText).font('Helvetica');
      t(`on ${new Date(userData.privacy_policy_accepted_at).toLocaleDateString('en-US')}`, ti + colW, tsy + 24);
    }
    
    // ACH Authorization
    const achAccepted = userData.ach_authorization_accepted;
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    t('ACH Authorization', ti + colW * 2, tsy);
    doc.fontSize(9).fillColor(achAccepted ? successGreen : dangerRed).font('Helvetica-Bold');
    t(achAccepted ? 'AUTHORIZED' : 'NOT AUTHORIZED', ti + colW * 2, tsy + 12);
    if (userData.ach_authorization_accepted_at) {
      doc.fontSize(6).fillColor(mediumText).font('Helvetica');
      t(`on ${new Date(userData.ach_authorization_accepted_at).toLocaleDateString('en-US')}`, ti + colW * 2, tsy + 24);
    }
    // Show signature if available
    if (userData.ach_authorization_signature) {
      doc.fontSize(6).fillColor(primaryBlue).font('Helvetica-Oblique');
      t(`Signed: ${userData.ach_authorization_signature}`, ti + colW * 2, tsy + 32);
    }
    
    // Divider line
    doc.strokeColor('#E5E7EB').lineWidth(0.3)
       .moveTo(ti, tsy + 36).lineTo(margin + contentWidth - 10, tsy + 36).stroke();
    
    // Compliance summary
    const totalTerms = 3;
    const acceptedCount = [termsAccepted, privacyAccepted, achAccepted].filter(Boolean).length;
    doc.fontSize(8).fillColor(mediumText).font('Helvetica');
    t('Compliance Status:', ti, tsy + 44);
    doc.fontSize(9).fillColor(acceptedCount === totalTerms ? successGreen : dangerRed).font('Helvetica-Bold');
    t(`${acceptedCount} of ${totalTerms} accepted`, ti + 90, tsy + 44);
    
    currentY += termsH + 10;
    
    // === ROW 3: BILLING ADDRESS & ADDITIONAL INFO ===
    const row3H = 100;
    
    // Left box - Billing Address
    drawBox(margin, currentY, boxW, row3H);
    drawHeader('BILLING ADDRESS', margin, currentY);
    const bi = margin + 10;
    let by = currentY + 24;
    
    if (userData.billing_address && typeof userData.billing_address === 'object') {
      const billing = userData.billing_address;
      doc.fontSize(8).fillColor(darkText).font('Helvetica');
      if (billing.street1) { t(billing.street1, bi, by); by += 13; }
      if (billing.street2) { t(billing.street2, bi, by); by += 13; }
      if (billing.city || billing.state || billing.zip_code) {
        t(`${billing.city || ''}, ${billing.state || ''} ${billing.zip_code || ''}`, bi, by);
        by += 13;
      }
      if (billing.phone) {
        doc.fontSize(7).fillColor(mediumText).font('Helvetica');
        t('Phone:', bi, by);
        doc.fontSize(8).fillColor(darkText).font('Helvetica');
        t(billing.phone, bi + 35, by);
      }
    } else {
      doc.fontSize(8).fillColor(mediumText).font('Helvetica-Oblique');
      t('No billing address on file', bi, by);
    }
    
    // Right box - Additional Information
    drawBox(rx, currentY, boxW, row3H);
    drawHeader('ADDITIONAL INFORMATION', rx, currentY);
    const ai = rx + 10;
    const aiR = ai + (boxW / 2) - 10;
    
    drawField('Tax ID', userData.tax_id || 'N/A', ai, currentY + 22);
    drawField('Pharmacy License', userData.pharmacy_license || 'N/A', ai, currentY + 44);
    drawField('Payment Terms', userData.payment_terms || 'N/A', ai, currentY + 66);
    drawField('Credit Limit', userData.credit_limit ? `$${Number(userData.credit_limit).toLocaleString()}` : 'N/A', aiR, currentY + 22);
    drawField('Display Name', userData.display_name || 'N/A', aiR, currentY + 44);
    if (userData.created_at) {
      drawField('Account Created', new Date(userData.created_at).toLocaleDateString('en-US'), aiR, currentY + 66);
    }
    
    // === FOOTER ===
    const footerY = pageHeight - 72;
    
    // Blue divider
    doc.strokeColor(primaryBlue).lineWidth(0.5)
       .moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
    
    // Company info (centered)
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    tCenter('9RX LLC | 936 Broad River Ln, Charlotte, NC 28211 | +1 (800) 969-6295 | info@9rx.com', footerY + 6);
    
    // Timestamp
    doc.fontSize(6).fillColor(mediumText).font('Helvetica');
    tCenter(`Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')} | Report ID: ${userData.id.substring(0, 8)}`, footerY + 17);
    
    // Thank you
    doc.fontSize(8).fillColor(primaryBlue).font('Helvetica-Oblique');
    tCenter('Thank you for your business!', footerY + 30);
    
    // Page number
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    tCenter('Page 1 of 1', footerY + 42);
    
    // Bottom blue band
    doc.rect(0, pageHeight - 6, pageWidth, 6).fill(primaryBlue);
    
    console.log('Step 7: ✅ Content added to PDF');

    console.log('Step 8: Finalizing PDF...');
    // Finalize PDF
    doc.end();
    console.log('Step 8: ✅ PDF finalized and sent');

    console.log(`=== PDF Generation Completed Successfully for ${userData.first_name} ${userData.last_name} ===`);

  } catch (error) {
    console.error("=== PDF Generation Error ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    
    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate PDF",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.error("Headers already sent, cannot send error response");
    }
  }
});

module.exports = router;