const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const PDFDocument = require("pdfkit");
const { requireAdmin } = require("../middleware/auth");
const mailSender = require("../utils/mailSender");
const PHARMACY_PROFILE_LOGO_URL = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png";

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

router.use(requireAdmin);

/**
 * Send credit terms to user and trigger email notification
 * POST /api/terms-management/send-credit-terms
 */
router.post("/send-credit-terms", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const {
      userId,
      creditLimit,
      netTerms,
      interestRate,
      termsVersion,
      customMessage,
      expiresInDays,
    } = req.body || {};

    if (
      !userId ||
      creditLimit === undefined ||
      netTerms === undefined ||
      interestRate === undefined ||
      !termsVersion ||
      expiresInDays === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const adminId = req.auth?.user?.id || null;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!profile.email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));

    const nowIso = new Date().toISOString();
    const { error: expireExistingError } = await supabaseAdmin
      .from("sent_credit_terms")
      .update({
        status: "expired",
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .in("status", ["pending", "viewed"]);

    if (expireExistingError) {
      return res.status(500).json({
        success: false,
        message: "Failed to close existing pending credit terms",
      });
    }

    const { data: insertedTerms, error: insertError } = await supabaseAdmin
      .from("sent_credit_terms")
      .insert({
        user_id: userId,
        sent_by: adminId,
        credit_limit: Number(creditLimit),
        net_terms: Number(netTerms),
        interest_rate: Number(interestRate),
        terms_version: termsVersion,
        custom_message: customMessage || null,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "A pending credit terms request already exists for this user. Refresh and try again.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create credit terms record",
      });
    }

    // Redirect to target page after login, or skip login and navigate directly if already authenticated
    const frontendUrl = process.env.FRONTEND_URL || "https://9rx.com";
    const reviewUrl = `${frontendUrl}/login?redirect=${encodeURIComponent('/pharmacy/credit')}`;

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Customer";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #111827; background: #ffffff;">
        <div style="background: #eaf4ff; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
          <img
            src="${PHARMACY_PROFILE_LOGO_URL}"
            alt="9RX Logo"
            style="max-width: 180px; width: 100%; height: auto; display: inline-block;"
          />
        </div>

        <div style="padding: 32px 28px 24px;">
          <h2 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2; color: #111827;">Credit Terms Sent for Your Signature</h2>
          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6;">Hello ${fullName},</p>
          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6;">Your credit terms are ready for review and signature.</p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px; font-size: 15px;"><strong>Credit Limit:</strong> $${Number(creditLimit).toLocaleString()}</p>
            <p style="margin: 0 0 10px; font-size: 15px;"><strong>Net Terms:</strong> Net ${Number(netTerms)}</p>
            <p style="margin: 0 0 10px; font-size: 15px;"><strong>Late Fee:</strong> ${Number(interestRate).toFixed(2)}% per month</p>
            <p style="margin: 0; font-size: 15px;"><strong>Expires On:</strong> ${expiresAt.toLocaleDateString("en-US")}</p>
          </div>

          ${customMessage ? `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6;"><strong>Message from admin:</strong><br/>${String(customMessage).replace(/\n/g, "<br/>")}</p>` : ""}

          <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6;">Please sign these terms from your dashboard after login.</p>

          <p style="margin: 26px 0 22px; text-align: center;">
            <a href="${reviewUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700;">
              Review and Sign Terms
            </a>
          </p>

          <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">If you did not expect this email, please contact support.</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 0 0 16px 16px; padding: 28px 24px; text-align: center; color: #6b7280;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700;">9RX - Your Trusted B2B Pharmacy Partner</p>
          <p style="margin: 0 0 18px; font-size: 14px;">
            Need help? Contact us at
            <a href="mailto:info@9rx.com" style="color: #2563eb; text-decoration: none;">info@9rx.com</a>
          </p>
          <p style="margin: 0; font-size: 13px; color: #9ca3af;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const mailResult = await mailSender(
      profile.email,
      "Action Required: Review and Sign Your Credit Terms",
      emailHtml
    );

    if (!mailResult?.success) {
      return res.status(500).json({
        success: false,
        message: mailResult?.error || "Failed to send credit terms email",
      });
    }

    return res.json({
      success: true,
      message: "Credit terms sent and email delivered",
      sentTermsId: insertedTerms.id,
    });
  } catch (error) {
    console.error("Send credit terms error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

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
        terms_and_conditions,
        privacy_policy,
        ach_authorization,
        terms_signature,
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
      error: "Internal server error"
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
        terms_and_conditions, 
        privacy_policy,
        ach_authorization,
        terms_signature,
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
        error: "Internal server error"
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
      error: "Internal server error"
    });
  }
});
router.get("/generate-pdf/:profileId", async (req, res) => {
  console.log('=== PDF Generation Started ===');
  console.log('Profile ID:', req.params.profileId);
  
  try {
    let pharmacyProfileLogo = null;
    try {
      const logoResponse = await fetch(PHARMACY_PROFILE_LOGO_URL);
      if (logoResponse.ok) {
        pharmacyProfileLogo = Buffer.from(await logoResponse.arrayBuffer());
      } else {
        console.warn("Pharmacy profile logo fetch failed:", logoResponse.status);
      }
    } catch (logoError) {
      console.warn("Pharmacy profile logo fetch error:", logoError.message);
    }

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
      size: 'LETTER'
    });
    // Manually add exactly one page
    doc.addPage({ size: 'LETTER', margin: 0 });
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
    
    // Page dimensions (Letter in points: 612 x 792)
    const pageWidth = 612;
    const pageHeight = 792;
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
    if (pharmacyProfileLogo) {
      doc.image(pharmacyProfileLogo, margin, 16, {
        fit: [125, 42],
      });
    } else {
      doc.fontSize(24).fillColor(darkText).font('Helvetica-Bold');
      t('9RX', margin, 20);
      
      doc.fontSize(8).fillColor(mediumText).font('Helvetica');
      t('Your Trusted Pharmacy Partner', margin, 44);
    }
    
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
    const privacyAccepted = userData.privacy_policy?.accepted || userData.privacy_policy_accepted || false;
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    t('Privacy Policy', ti + colW, tsy);
    doc.fontSize(9).fillColor(privacyAccepted ? successGreen : dangerRed).font('Helvetica-Bold');
    t(privacyAccepted ? 'ACCEPTED' : 'NOT ACCEPTED', ti + colW, tsy + 12);
    const privacyDate = userData.privacy_policy?.acceptedAt || userData.privacy_policy_accepted_at;
    if (privacyDate) {
      doc.fontSize(6).fillColor(mediumText).font('Helvetica');
      t(`on ${new Date(privacyDate).toLocaleDateString('en-US')}`, ti + colW, tsy + 24);
    }
    
    // ACH Authorization
    const achAccepted = userData.ach_authorization?.accepted || userData.ach_authorization_accepted || false;
    doc.fontSize(7).fillColor(mediumText).font('Helvetica');
    t('ACH Authorization', ti + colW * 2, tsy);
    doc.fontSize(9).fillColor(achAccepted ? successGreen : dangerRed).font('Helvetica-Bold');
    t(achAccepted ? 'AUTHORIZED' : 'NOT AUTHORIZED', ti + colW * 2, tsy + 12);
    const achDate = userData.ach_authorization?.acceptedAt || userData.ach_authorization_accepted_at;
    if (achDate) {
      doc.fontSize(6).fillColor(mediumText).font('Helvetica');
      t(`on ${new Date(achDate).toLocaleDateString('en-US')}`, ti + colW * 2, tsy + 24);
    }
    // Show signature if available
    const achSignature = userData.ach_authorization?.signature || userData.ach_authorization_signature;
    if (achSignature) {
      doc.fontSize(6).fillColor(primaryBlue).font('Helvetica-Oblique');
      t(`Signed: ${achSignature}`, ti + colW * 2, tsy + 32);
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
    tCenter('9RX LLC | 936 Broad River Ln, Charlotte, NC 28211 | +1 (800) 940-9619 | info@9rx.com', footerY + 6);
    
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
        error: "Internal server error",
      });
    } else {
      console.error("Headers already sent, cannot send error response");
    }
  }
});

module.exports = router;
