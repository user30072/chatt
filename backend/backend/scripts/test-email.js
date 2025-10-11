#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * This script verifies the email configuration settings and sends a test email.
 * Use it to troubleshoot email delivery issues.
 * 
 * Usage: node test-email.js [recipient-email]
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// The email to send the test message to (defaults to the configured admin email)
const TEST_RECIPIENT = process.argv[2] || process.env.ADMIN_EMAIL || 'askanybot@gmail.com';

// Check environment variables
console.log('Email Configuration Check:');
console.log('==========================');

// Check EMAIL_USER
if (!process.env.EMAIL_USER) {
  console.error('❌ EMAIL_USER environment variable is not set.');
  console.error('   Set this to your Gmail address, e.g., askanybot@gmail.com');
} else {
  console.log(`✅ EMAIL_USER is set to: ${process.env.EMAIL_USER}`);
}

// Check EMAIL_PASSWORD
if (!process.env.EMAIL_PASSWORD) {
  console.error('❌ EMAIL_PASSWORD environment variable is not set.');
  console.error('   Generate an app password at: https://myaccount.google.com/apppasswords');
} else {
  console.log(`✅ EMAIL_PASSWORD is set to: ${process.env.EMAIL_PASSWORD.substring(0, 3)}${'*'.repeat(12)}`);
}

// Check ADMIN_EMAIL
if (!process.env.ADMIN_EMAIL) {
  console.warn('⚠️ ADMIN_EMAIL environment variable is not set.');
  console.warn('   This is used for admin notification emails.');
} else {
  console.log(`✅ ADMIN_EMAIL is set to: ${process.env.ADMIN_EMAIL}`);
}

// Check FRONTEND_URL
if (!process.env.FRONTEND_URL) {
  console.warn('⚠️ FRONTEND_URL environment variable is not set.');
  console.warn('   This is used for links in emails.');
} else {
  console.log(`✅ FRONTEND_URL is set to: ${process.env.FRONTEND_URL}`);
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'askanybot@gmail.com',
      pass: process.env.EMAIL_PASSWORD, // App-specific password
    },
    secure: true,
    debug: true, // Enable debug output
  });
};

// Send a test email
const sendTestEmail = async () => {
  try {
    console.log('\nSending test email...');
    
    const transporter = createTransporter();
    
    // Verify SMTP configuration
    transporter.verify(function (error, success) {
      if (error) {
        console.error('❌ SMTP configuration error:', error);
      } else {
        console.log('✅ SMTP server is ready to send messages');
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'askanybot@gmail.com',
      to: TEST_RECIPIENT,
      subject: 'Email Configuration Test',
      text: 'This is a test email to verify your email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3b82f6; margin-top: 0;">Email Configuration Test</h2>
          <p>This is a test email to verify your email configuration for AI Chatbot Platform.</p>
          
          <h3 style="margin-bottom: 5px;">Configuration Details:</h3>
          <ul>
            <li><strong>EMAIL_USER:</strong> ${process.env.EMAIL_USER || 'Not set'}</li>
            <li><strong>ADMIN_EMAIL:</strong> ${process.env.ADMIN_EMAIL || 'Not set'}</li>
            <li><strong>FRONTEND_URL:</strong> ${process.env.FRONTEND_URL || 'Not set'}</li>
            <li><strong>Test Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <p>If you received this email, your email configuration is working correctly.</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Test email sent successfully to ${TEST_RECIPIENT}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📤 Response: ${info.response}`);
    
    return info;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication Error: Check your EMAIL_USER and EMAIL_PASSWORD');
      console.error('Make sure you\'re using an app-specific password for Gmail');
      console.error('Generate one at: https://myaccount.google.com/apppasswords');
    }
    return null;
  }
};

// Execute test
sendTestEmail().then(() => process.exit(0)).catch(() => process.exit(1)); 