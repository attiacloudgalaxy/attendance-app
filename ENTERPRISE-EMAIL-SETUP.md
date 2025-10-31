# 📧 Enterprise Email Integration Guide

## 🏢 **Common Enterprise Email Providers**

### **Microsoft Exchange/Outlook 365**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-username@yourcompany.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

### **Google Workspace (G Suite)**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-username@yourcompany.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

### **Custom SMTP Server**
```env
EMAIL_HOST=mail.yourcompany.com
EMAIL_PORT=587
EMAIL_USER=your-username@yourcompany.com
EMAIL_PASS=your-password
EMAIL_FROM=attendance-system@yourcompany.com
```

---

## 🔧 **Setup Instructions**

### **Step 1: Get Your SMTP Settings**
Contact your IT department for:
- **SMTP Server Address** (EMAIL_HOST)
- **Port Number** (usually 587 or 465)
- **Authentication Method**
- **Security Requirements** (TLS/SSL)

### **Step 2: Create App Password (if required)**

**For Microsoft 365:**
1. Go to https://account.microsoft.com/security
2. Enable MFA if not already enabled
3. Create an App Password for "Mail"
4. Use this password instead of your regular password

**For Google Workspace:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Generate password
4. Use this 16-character password

### **Step 3: Update Configuration**
Edit `/backend/.env` with your enterprise settings:

```env
# Replace these with your actual enterprise email settings
EMAIL_HOST=smtp.yourcompany.com
EMAIL_PORT=587
EMAIL_USER=attendance-system@yourcompany.com
EMAIL_PASS=your-secure-password
EMAIL_FROM=Attendance System <noreply@yourcompany.com>
```

### **Step 4: Test Configuration**
Run this test to verify email settings:

```bash
cd backend
node -e "
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration failed:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});
"
```

---

## 🛡️ **Security Best Practices**

### **1. Use Dedicated Service Account**
- Create `attendance-system@yourcompany.com`
- Don't use personal email accounts
- Limit permissions to send-only

### **2. Secure Credentials**
- Use App Passwords, not regular passwords
- Store credentials in `.env` file only
- Never commit credentials to version control

### **3. Email Templates**
Customize email templates in `/backend/utils/email.js`:

```javascript
const mailOptions = {
    from: `${process.env.COMPANY_NAME} Attendance System <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🔐 Your Attendance System Login Code',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>🏢 ${process.env.COMPANY_NAME}</h2>
            <p>Hello ${firstName},</p>
            <p>Your login verification code is:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                ${token}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please contact IT support.</p>
        </div>
    `
};
```

---

## 📋 **Common Enterprise SMTP Settings**

| Provider | SMTP Server | Port | Security |
|----------|-------------|------|----------|
| **Microsoft 365** | smtp-mail.outlook.com | 587 | STARTTLS |
| **Google Workspace** | smtp.gmail.com | 587 | STARTTLS |
| **Amazon SES** | email-smtp.region.amazonaws.com | 587 | STARTTLS |
| **SendGrid** | smtp.sendgrid.net | 587 | STARTTLS |
| **Mailgun** | smtp.mailgun.org | 587 | STARTTLS |

---

## 🚀 **Quick Setup Script**

Save this as `setup-enterprise-email.sh`:

```bash
#!/bin/bash
echo "🏢 Enterprise Email Setup"
echo "========================"

read -p "Enter your SMTP server (e.g., smtp.yourcompany.com): " smtp_host
read -p "Enter SMTP port (usually 587): " smtp_port
read -p "Enter your email username: " email_user
read -s -p "Enter your email password/app-password: " email_pass
echo
read -p "Enter FROM email address: " email_from

# Update .env file
sed -i '' "s/EMAIL_HOST=.*/EMAIL_HOST=$smtp_host/" .env
sed -i '' "s/EMAIL_PORT=.*/EMAIL_PORT=$smtp_port/" .env
sed -i '' "s/EMAIL_USER=.*/EMAIL_USER=$email_user/" .env
sed -i '' "s/EMAIL_PASS=.*/EMAIL_PASS=$email_pass/" .env
sed -i '' "s/EMAIL_FROM=.*/EMAIL_FROM=$email_from/" .env

echo "✅ Email configuration updated!"
echo "🔄 Please restart your server to apply changes."
```

---

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **"Authentication failed"**
   - Check username/password
   - Enable "Less secure apps" if required
   - Use App Password instead of regular password

2. **"Connection refused"**
   - Verify SMTP server address
   - Check port number (587 vs 465)
   - Ensure firewall allows SMTP traffic

3. **"TLS/SSL errors"**
   - Try different ports (587, 465, 25)
   - Adjust `secure` setting in transporter config

### **Test Commands:**
```bash
# Test SMTP connection
telnet your-smtp-server.com 587

# Check DNS resolution
nslookup your-smtp-server.com

# Test with curl
curl smtp://your-smtp-server.com:587 --user "username:password"
```

---

## 📞 **Get Help From IT**

Ask your IT department for:
1. **SMTP server settings** for your email system
2. **Service account creation** for the attendance system  
3. **Firewall rules** if email sending fails
4. **Security policies** for automated email sending
5. **Email templates** that comply with company branding

---

Ready to configure your enterprise email? Let me know your email provider and I'll help you set it up! 🚀