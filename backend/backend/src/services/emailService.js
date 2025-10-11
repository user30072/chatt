// src/services/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config/environment');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Only create transporter if SMTP settings are configured
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
    }
  }
  
  // Send an email
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        logger.warn('Email service not configured, skipping email send');
        return false;
      }
      
      const { to, subject, text, html, from = config.EMAIL_FROM } = options;
      
      const emailOptions = {
        from,
        to,
        subject,
        text,
        html,
      };
      
      const info = await this.transporter.sendMail(emailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  // Send welcome email
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to AI Chatbot Platform',
      text: `Hello ${user.first_name},\n\nWelcome to AI Chatbot Platform! We're excited to have you on board.\n\nYou can now create your first chatbot by visiting the dashboard.\n\nBest regards,\nThe AI Chatbot Team`,
      html: `
        <h2>Welcome to AI Chatbot Platform!</h2>
        <p>Hello ${user.first_name},</p>
        <p>We're excited to have you on board. You can now create your first chatbot by visiting the dashboard.</p>
        <p><a href="${config.FRONTEND_URL}/dashboard" style="background-color: #0084ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
        <p>Best regards,<br>The AI Chatbot Team</p>
      `,
    });
  }
  
  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Hello ${user.first_name},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe AI Chatbot Team`,
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.first_name},</p>
        <p>You requested a password reset. Please use the following link to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #0084ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The AI Chatbot Team</p>
      `,
    });
  }
  
  // Send notification email
  async sendNotificationEmail(user, notification) {
    return this.sendEmail({
      to: user.email,
      subject: notification.subject,
      text: notification.text,
      html: notification.html,
    });
  }
}

module.exports = new EmailService();