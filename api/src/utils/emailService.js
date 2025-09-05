import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration - Create transporter dynamically
export const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    },
    // Additional Gmail-specific settings
    secure: true,
    port: 465,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Legacy transporter for backward compatibility
export const transporter = getTransporter();

// Verify email configuration
export const verifyEmailConfig = () => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    throw new Error('EMAIL_USER not configured in environment variables');
  }
  if (!process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'your-app-password') {
    throw new Error('EMAIL_PASSWORD not configured in environment variables');
  }
  return true;
};

// Generate a random 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a secure reset token
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send password reset email with verification code
export const sendPasswordResetEmail = async (email, verificationCode, userName) => {
  try {
    // Verify email configuration before sending
    verifyEmailConfig();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'CPC Essen - Password Reset Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #000C50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">CPC Essen</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px;">Password Reset Verification</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have requested to reset your password for your CPC Essen account. 
              To proceed with the password reset, please use the verification code below:
            </p>
            
            <div style="background-color: #000C50; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <h3 style="margin: 0; font-size: 32px; letter-spacing: 5px; font-family: monospace;">${verificationCode}</h3>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #666; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
              <li>This code will expire in 10 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this reset, please ignore this email</li>
            </ul>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need assistance, please contact the system administrator.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('Password reset email sent successfully to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    // Provide more specific error messages
    if (error.message.includes('EMAIL_USER not configured') || error.message.includes('EMAIL_PASSWORD not configured')) {
      throw new Error('Email service not configured. Please contact administrator.');
    } else if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check email credentials.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Unable to connect to email service. Please try again later.');
    } else {
      throw new Error('Failed to send password reset email. Please try again later.');
    }
  }
};

// Send welcome email for new users
export const sendWelcomeEmail = async (email, userName, studentId, defaultPassword) => {
  try {
    // Verify email configuration before sending
    verifyEmailConfig();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to CPC Essen - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #000C50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">CPC Essen</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px;">Welcome to Our Platform</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${userName}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your account has been successfully created. Here are your login details:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000C50;">
              <p style="margin: 5px 0;"><strong>Student ID:</strong> ${studentId}</p>
              <p style="margin: 5px 0;"><strong>Default Password:</strong> ${defaultPassword}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/login" 
                 style="background-color: #000C50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                If you have any questions, please contact the system administrator.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('Welcome email sent successfully to:', email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    
    // Provide more specific error messages
    if (error.message.includes('EMAIL_USER not configured') || error.message.includes('EMAIL_PASSWORD not configured')) {
      throw new Error('Email service not configured. Please contact administrator.');
    } else if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check email credentials.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Unable to connect to email service. Please try again later.');
    } else {
      throw new Error('Failed to send welcome email. Please try again later.');
    }
  }
};
