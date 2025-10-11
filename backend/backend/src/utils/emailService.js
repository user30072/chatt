const nodemailer = require('nodemailer');
const { prisma } = require('../db');

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are available
  if (!process.env.EMAIL_PASSWORD) {
    console.log('Email password not provided. Email sending will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'askanybot@gmail.com',
      pass: process.env.EMAIL_PASSWORD, // App-specific password
    },
    secure: true,
  });
};

/**
 * Send a notification to the admin about a new user signup
 * @param {Object} user - User data (email, firstName, lastName)
 * @returns {Promise} - Email send result
 */
const sendNewUserNotification = async (user) => {
  try {
    const transporter = createTransporter();
    
    // If no transporter (missing credentials), log and return early
    if (!transporter) {
      console.log('Skipping admin notification email - no email credentials');
      return null;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'askanybot@gmail.com',
      to: process.env.ADMIN_EMAIL || 'askanybot@gmail.com',
      subject: 'New User Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3b82f6; margin-top: 0;">New User Registration</h2>
          <p>A new user has registered on your platform.</p>
          
          <h3 style="margin-bottom: 5px;">User Details:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Username:</strong> ${user.username}</li>
            <li><strong>Registration Date:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
            <p style="margin-top: 0;">You can manage users from your admin dashboard.</p>
          </div>
        </div>
      `
    };
    
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send new user notification email:', error);
    // Don't throw the error to prevent affecting the signup process
    return null;
  }
};

/**
 * Send a welcome email to a new user
 * @param {Object} user - User data (email, firstName, lastName, id)
 * @returns {Promise} - Email send result
 */
const sendWelcomeEmail = async (user) => {
  try {
    console.log(`Attempting to send welcome email to ${user.email}`);
    
    const transporter = createTransporter();
    
    // If no transporter (missing credentials), log and update the user record anyway
    if (!transporter) {
      console.log(`Skipping welcome email to ${user.email} - no email credentials`);
      
      // Since we're skipping the email, still update the user record
      if (user.id) {
        try {
          console.log(`Updating user record for ${user.email} (ID: ${user.id}) to mark welcome email as sent`);
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              welcome_email_sent: true,
              welcome_email_sent_at: new Date()
            }
          });
          
          console.log(`User record updated successfully for ${user.email}`);
        } catch (dbError) {
          console.error(`Database error when updating welcome_email_sent status for user ${user.id}:`, dbError);
        }
      }
      
      return null;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'askanybot@gmail.com',
      to: user.email,
      subject: 'Welcome to AI Chatbot Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #3b82f6; margin-top: 0;">Welcome to AI Chatbot Platform!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Thank you for signing up for AI Chatbot Platform. We're excited to have you on board!</p>
          
          <h3 style="margin-bottom: 5px;">Your Account Details:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Username:</strong> ${user.username}</li>
          </ul>
          
          <div style="margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://your-app-url.com'}/login" 
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Log In to Your Account
            </a>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
            <h4 style="margin-top: 0;">Getting Started:</h4>
            <ol style="padding-left: 20px;">
              <li>Set up your first chatbot</li>
              <li>Customize your chatbot's responses</li>
              <li>Integrate with your website</li>
            </ol>
            <p>If you need any help, simply reply to this email or contact our support team.</p>
          </div>
          
          <p style="margin-top: 25px;">Best,<br>The AI Chatbot Team</p>
        </div>
      `
    };
    
    console.log(`Sending email to ${user.email} with subject: ${mailOptions.subject}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${user.email}, messageId: ${result.messageId}`);
    
    // If email was sent successfully, update the user record
    if (result && user.id) {
      try {
        console.log(`Updating user record for ${user.email} (ID: ${user.id}) to mark welcome email as sent`);
        
        // Check if prisma is properly imported and initialized
        if (!prisma) {
          console.error('Prisma client is not initialized in emailService.js');
          throw new Error('Prisma client not available');
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            welcome_email_sent: true,
            welcome_email_sent_at: new Date()
          }
        });
        
        console.log(`User record updated successfully for ${user.email}`);
      } catch (dbError) {
        console.error(`Database error when updating welcome_email_sent status for user ${user.id}:`, dbError);
        console.error(`Stack trace: ${dbError.stack}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to send welcome email to ${user?.email || 'unknown user'}:`, error);
    console.error(`Error stack trace: ${error.stack}`);
    // Check for authentication errors specifically
    if (error.responseCode === 535) {
      console.error('SMTP Authentication error: Check your EMAIL_USER and EMAIL_PASSWORD environment variables');
    }
    // Don't throw the error to prevent affecting the signup process
    return null;
  }
};

module.exports = {
  sendNewUserNotification,
  sendWelcomeEmail
}; 