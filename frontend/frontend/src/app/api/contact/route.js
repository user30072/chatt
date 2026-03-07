import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { name, email, businessName, phone, message } = await request.json();

    // Basic form validation
    if (!name || !email || !message) {
      return new NextResponse('Please fill in all required fields', { status: 400 });
    }

    if (!email.includes('@')) {
      return new NextResponse('Please enter a valid email address', { status: 400 });
    }

    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'askanybot@gmail.com',
        pass: process.env.EMAIL_PASSWORD, // use app-specific password
      },
      secure: true,
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'askanybot@gmail.com',
      to: 'askanybot@gmail.com',
      subject: `Contact Form: New message from ${name}`,
      replyTo: email,
      text: `
Name: ${name}
${businessName ? `Business: ${businessName}` : ''}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Message:
${message}
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">New Contact Form Submission</h2>
  <p><strong>From:</strong> ${name} (${email})</p>
  ${businessName ? `<p><strong>Business:</strong> ${businessName}</p>` : ''}
  ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
  <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
    <h3 style="margin-top: 0;">Message:</h3>
    <p style="white-space: pre-line;">${message}</p>
  </div>
  <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">This email was sent from your website's contact form.</p>
</div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Return success response
    return new NextResponse('Message sent successfully', { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return new NextResponse('Error sending message', { status: 500 });
  }
} 