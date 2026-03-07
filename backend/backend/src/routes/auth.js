const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateAuth } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();
const { prisma } = require('../db');
const { sendNewUserNotification, sendWelcomeEmail } = require('../utils/emailService');
const { createCustomer } = require('../lib/stripe');
const { OAuth2Client } = require('google-auth-library');

/**
 * @route POST /api/auth/login
 * @desc Authenticate a user and return a token
 * @access Public
 */
router.post('/login', validateAuth, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
      isPlatformAdmin: user.is_platform_admin
    };
    
    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log(`Created new token for ${user.email}, expires in 1 hour`);
    
    // Remove sensitive data
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.is_admin,
      isPlatformAdmin: user.is_platform_admin,
      avatarUrl: user.avatar_url
    };
    
    res.json({
      token: `Bearer ${token}`,
      user: userResponse
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', validateAuth, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      return res.status(400).json({ message: 'This username is already taken' });
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ message: 'Username format invalid. Use only letters, numbers, underscore and hyphen (3-20 chars)' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          username,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          is_admin: true // First user is admin
        }
      });
      console.log('User created successfully:', user.id);
      
      // Create subscription for user
      const subscription = await tx.userSubscription.create({
        data: {
          user_id: user.id,
          status: 'trialing',
          trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
        }
      });
      console.log('Subscription created successfully:', subscription.id);
      
      // Try to create Stripe customer (non-blocking)
      try {
        // Only create if Stripe is configured
        if (process.env.STRIPE_SECRET_KEY) {
          const customer = await createCustomer({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username
          });
          
          // Update subscription with Stripe customer ID
          if (customer) {
            await tx.userSubscription.update({
              where: { user_id: user.id },
              data: { stripe_customer_id: customer.id }
            });
            console.log('Stripe customer created and linked to subscription');
          }
        }
      } catch (stripeError) {
        // Log error but don't fail signup
        console.error('Error creating Stripe customer:', stripeError);
      }
      
      return user;
    });
    console.log('Transaction completed successfully');
    
    // Create JWT payload
    const payload = {
      userId: result.id,
      email: result.email,
      username: result.username,
      isAdmin: result.is_admin,
      isPlatformAdmin: result.is_platform_admin
    };
    
    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log(`Created new token for ${result.email}, expires in 1 hour`);
    
    // Remove sensitive data
    const userResponse = {
      id: result.id,
      email: result.email,
      username: result.username,
      firstName: result.first_name,
      lastName: result.last_name,
      isAdmin: result.is_admin,
      isPlatformAdmin: result.is_platform_admin,
      avatarUrl: result.avatar_url
    };
    
    // Send notification emails (don't await to prevent blocking response)
    try {
      console.log('Sending notification emails...');
      
      // Send admin notification
      sendNewUserNotification(
        {
          email: result.email,
          firstName: result.first_name,
          lastName: result.last_name,
          username: result.username
        }
      ).then(() => console.log('Admin notification email sent'))
        .catch(err => console.error('Failed to send admin notification:', err));
      
      // Send welcome email to user
      sendWelcomeEmail(
        {
          id: result.id,
          email: result.email,
          firstName: result.first_name,
          lastName: result.last_name,
          username: result.username
        }
      ).then(() => console.log('Welcome email sent to user'))
        .catch(err => console.error('Failed to send welcome email:', err));
        
      console.log('Email notifications queued');
    } catch (emailError) {
      // Log but don't block signup process
      console.error('Error sending notification emails:', emailError);
    }
    
    res.status(201).json({
      token: `Bearer ${token}`,
      user: userResponse
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', isAuthenticated, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.is_admin,
      isPlatformAdmin: user.is_platform_admin,
      avatarUrl: user.avatar_url
    };
    
    res.json({ user: userResponse });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/auth/refresh
 * @desc Refresh the user's token
 * @access Private
 */
router.get('/refresh', isAuthenticated, async (req, res, next) => {
  try {
    // Get the current user from the request
    const userId = req.user.userId;
    
    // Find the user in the database to ensure they still exist and get fresh data
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin,
      isPlatformAdmin: user.is_platform_admin
    };
    
    // Sign a new token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log(`Created new token for ${user.email}, expires in 1 hour`);
    
    // Return the new token
    res.json({
      token: `Bearer ${token}`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: user.is_admin,
        isPlatformAdmin: user.is_platform_admin,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/auth/check-username
 * @desc Check if a username is available
 * @access Public
 */
router.get('/check-username', async (req, res, next) => {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ 
        available: false,
        message: 'Invalid username parameter'
      });
    }
    
    // Check username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({
        available: false,
        message: 'Username format invalid. Use only letters, numbers, underscore and hyphen (3-20 chars)'
      });
    }
    
    // Check if the username already exists in the database
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    res.json({
      available: !existingUsername,
      message: existingUsername ? 'Username is already taken' : 'Username is available'
    });
  } catch (err) {
    next(err);
  }
});

// Google Auth Route
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Initialize Google OAuth client
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Get user information from the token
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email is required from Google account' });
    }

    // Generate a username from the email
    const generateUsername = (email) => {
      // Extract part before @ and remove special characters
      const baseName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      
      // Add random numbers to make it unique
      const randomSuffix = Math.floor(Math.random() * 1000);
      
      return `${baseName}${randomSuffix}`;
    };

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // User doesn't exist, create a new user
      const firstName = name ? name.split(' ')[0] : '';
      const lastName = name ? name.split(' ').slice(1).join(' ') : '';
      
      // Generate a username from email
      const username = generateUsername(email);
      
      // Create new user with Google profile info
      user = await prisma.user.create({
        data: {
          email,
          username,
          first_name: firstName,
          last_name: lastName,
          image: picture,
          authProvider: 'google',
          authProviderId: googleId,
          password_hash: null
        },
      });
      
      // If organization is required, create one for the user
      if (process.env.ORGANIZATION_REQUIRED === 'true') {
        const orgName = `${firstName}'s Organization`;
        const orgUsername = username;
        
        const organization = await prisma.organization.create({
          data: {
            name: orgName,
            username: orgUsername,
          },
        });
        
        // Associate user with organization
        await prisma.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: 'ADMIN',
          },
        });
        
        // Update user with organization ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id },
        });
      }
    } else if (!user.authProviderId) {
      // User exists but hasn't used Google login before, update their profile
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: 'google',
          authProviderId: googleId,
          image: picture || user.image
        },
      });
    }

    // Generate a JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data and token
    return res.status(200).json({
      message: 'Google authentication successful',
      token: `Bearer ${jwtToken}`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        image: user.image,
        authProvider: user.authProvider,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message
    });
  }
});

module.exports = router;
