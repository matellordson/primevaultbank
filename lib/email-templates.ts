/**
 * lib/email-templates.ts
 *
 * Pure helper — generates ready-to-send email content for the admin's manual
 * mailing system. No external providers, no side effects.
 */

export interface EmailContent {
  subject: string
  bodyHtml: string
  bodyText: string
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME EMAIL — triggered on new account creation
// ─────────────────────────────────────────────────────────────────────────────
export function welcomeEmail(params: {
  userName: string
  userEmail: string
  checkingAccountNumber: string
  savingsAccountNumber: string
}): EmailContent {
  const { userName, checkingAccountNumber, savingsAccountNumber } = params

  const subject = `Welcome to PrimeVault — Your Account is Ready`

  const bodyText = `Hello ${userName},

Welcome to PrimeVault! Your banking account has been successfully created and is now ready for use.

Here are your account details:

  Checking Account:  ${checkingAccountNumber}
  Savings Account:   ${savingsAccountNumber}

IMPORTANT — Next Steps:
To activate full access and remove account restrictions, please complete your KYC (identity) verification by logging in and following the on-screen steps.

  Login: https://primevaultbank.com/login

If you have any questions, please don't hesitate to contact our support team.

Warm regards,
PrimeVault Banking Operations`

  const year = new Date().getFullYear()
  const bodyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to PrimeVault</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">PrimeVault</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Institutional Banking</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#0f172a;font-size:20px;margin:0 0 16px;">Welcome, ${userName}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Your PrimeVault banking account has been successfully created. We are delighted to have you on board.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Your Account Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0;width:50%;">Checking Account</td>
                  <td style="font-size:13px;font-weight:bold;color:#0f172a;font-family:monospace;padding:6px 0;">${checkingAccountNumber}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:6px 0;">Savings Account</td>
                  <td style="font-size:13px;font-weight:bold;color:#0f172a;font-family:monospace;padding:6px 0;">${savingsAccountNumber}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:14px;color:#713f12;font-weight:600;">Action Required - Complete KYC Verification</p>
              <p style="margin:8px 0 0;font-size:13px;color:#713f12;line-height:1.6;">
                Your accounts are currently restricted. Please log in and complete your identity verification to unlock full access to transfers, deposits, and withdrawals.
              </p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:#0f172a;border-radius:6px;padding:14px 32px;">
              <a href="https://primevaultbank.com/login" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Log In and Verify Identity</a>
            </td></tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
            If you have any questions or did not create this account, please contact our support team immediately.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${year} PrimeVault Banking. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, bodyHtml, bodyText }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION COMPLETED EMAIL — triggered when admin approves a transaction
// ─────────────────────────────────────────────────────────────────────────────
export function transactionCompletedEmail(params: {
  userName: string
  referenceId: string
  amount: number
  currency: string
  transactionType: string
  description?: string | null
  recipientName?: string | null
  recipientBank?: string | null
  newBalance?: number | null
  processedAt: Date
}): EmailContent {
  const {
    userName,
    referenceId,
    amount,
    currency,
    transactionType,
    description,
    recipientName,
    recipientBank,
    newBalance,
    processedAt,
  } = params

  const typeLabel: Record<string, string> = {
    INTERNAL_TRANSFER: "Internal Transfer",
    EXTERNAL_WIRE: "External Wire Transfer",
    DEPOSIT_REQUEST: "Deposit",
    MANUAL_DEPOSIT: "Administrative Deposit",
    ADMIN_ADJUSTMENT: "Account Adjustment",
  }

  const amountSign: Record<string, string> = {
    INTERNAL_TRANSFER: "-",
    EXTERNAL_WIRE: "-",
    DEPOSIT_REQUEST: "+",
    MANUAL_DEPOSIT: "+",
    ADMIN_ADJUSTMENT: "",
  }

  const amountColor: Record<string, string> = {
    INTERNAL_TRANSFER: "#dc2626",
    EXTERNAL_WIRE: "#dc2626",
    DEPOSIT_REQUEST: "#16a34a",
    MANUAL_DEPOSIT: "#16a34a",
    ADMIN_ADJUSTMENT: "#0f172a",
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)

  const label = typeLabel[transactionType] ?? transactionType
  const sign = amountSign[transactionType] ?? ""
  const color = amountColor[transactionType] ?? "#0f172a"
  const dateStr = processedAt.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })

  const subject = `Transaction Confirmed - ${label} of ${fmt(amount)} (Ref: ${referenceId})`

  const recipientLine =
    recipientName || recipientBank
      ? `\n  Recipient:         ${recipientName ?? ""}${recipientBank ? ` - ${recipientBank}` : ""}`
      : ""

  const balanceLine =
    newBalance != null ? `\n  Updated Balance:   ${fmt(newBalance)}` : ""

  const bodyText = `Hello ${userName},

Your ${label.toLowerCase()} has been successfully processed.

Transaction Summary:
  Reference ID:      ${referenceId}
  Type:              ${label}
  Amount:            ${sign}${fmt(amount)}${recipientLine}
  Processed On:      ${dateStr}${balanceLine}
${description ? `  Note:              ${description}` : ""}
This transaction is now complete and reflected in your account.

If you did not authorize this transaction or have any concerns, please contact our support team immediately.

Regards,
PrimeVault Banking Operations`

  const year = new Date().getFullYear()
  const recipientRowHtml =
    recipientName || recipientBank
      ? `<tr>
        <td style="font-size:13px;color:#64748b;padding:5px 0;width:45%;">Recipient</td>
        <td style="font-size:13px;color:#0f172a;padding:5px 0;">${recipientName ?? ""}${recipientBank ? `<br/><span style="color:#64748b;font-size:12px;">${recipientBank}</span>` : ""}</td>
      </tr>`
      : ""

  const balanceRowHtml =
    newBalance != null
      ? `<tr>
        <td style="font-size:13px;color:#64748b;padding:5px 0;">Updated Balance</td>
        <td style="font-size:13px;font-weight:bold;color:#0f172a;font-family:monospace;padding:5px 0;">${fmt(newBalance)}</td>
      </tr>`
      : ""

  const descRowHtml = description
    ? `<tr>
        <td style="font-size:13px;color:#64748b;padding:5px 0;">Note</td>
        <td style="font-size:13px;color:#0f172a;padding:5px 0;">${description}</td>
      </tr>`
    : ""

  const bodyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Transaction Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">PrimeVault</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Transaction Confirmation</p>
        </td></tr>
        <tr><td style="background:#dcfce7;border-bottom:1px solid #bbf7d0;padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#15803d;">Transaction Successfully Processed</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Hello <strong>${userName}</strong>, your ${label.toLowerCase()} has been confirmed and processed by PrimeVault Banking Operations.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Transaction Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:5px 0;width:45%;">Reference ID</td>
                  <td style="font-size:13px;font-weight:bold;color:#0f172a;font-family:monospace;padding:5px 0;">${referenceId}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:5px 0;">Type</td>
                  <td style="font-size:13px;color:#0f172a;padding:5px 0;">${label}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:5px 0;">Amount</td>
                  <td style="font-size:18px;font-weight:bold;color:${color};padding:5px 0;">${sign}${fmt(amount)}</td>
                </tr>
                ${recipientRowHtml}
                ${balanceRowHtml}
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:5px 0;">Processed On</td>
                  <td style="font-size:13px;color:#0f172a;padding:5px 0;">${dateStr}</td>
                </tr>
                ${descRowHtml}
              </table>
            </td></tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
            If you did not authorize this transaction or have any concerns, please contact our support team immediately.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${year} PrimeVault Banking. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, bodyHtml, bodyText }
}
