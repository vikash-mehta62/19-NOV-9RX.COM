/**
 * Group Invitation Email Template
 * Sent when a group admin invites a pharmacy to join their group
 */

const groupInvitationTemplate = (data) => {
  const {
    pharmacyName,
    contactPerson,
    groupName,
    inviterName,
    inviteLink,
    expiresAt,
    personalMessage,
  } = data;

  const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${groupName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); border-radius: 12px 12px 0 0;">
              <img src="https://9rx.com/logo.png" alt="9RX Logo" style="height: 50px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600;">You're Invited!</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0;">Join ${groupName} on 9RX</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hello${contactPerson ? ` ${contactPerson}` : ''},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong>${inviterName}</strong> has invited <strong>${pharmacyName}</strong> to join their pharmacy group on 9RX.
              </p>

              ${personalMessage ? `
              <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px; font-weight: 600;">Personal Message:</p>
                <p style="color: #374151; font-size: 15px; margin: 0; font-style: italic;">"${personalMessage}"</p>
              </div>
              ` : ''}

              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 15px;">Benefits of Joining:</h3>
                <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Access to group-negotiated pricing</li>
                  <li>Streamlined ordering process</li>
                  <li>Consolidated invoicing and reporting</li>
                  <li>Dedicated group support</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                  Accept Invitation
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0;">
                This invitation expires on <strong>${formattedExpiry}</strong>
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px;">
                Questions? Contact us at <a href="mailto:support@9rx.com" style="color: #2563eb;">support@9rx.com</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} 9RX. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

module.exports = groupInvitationTemplate;
