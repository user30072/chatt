import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Log environment variables for debugging
console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
console.log('Google Client Secret available:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('JWT Secret available:', !!process.env.JWT_SECRET);
console.log('Environment:', process.env.NODE_ENV);

// More detailed logging for troubleshooting
if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  console.error('ERROR: NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set!');
} else {
  console.log('Google Client ID length:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length);
  console.log('Google Client ID starts with:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 5) + '...');
}

// Initialize Google OAuth client with the public client ID
const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// Generate a username based on email
function generateUsername(email) {
  // Extract part before @ and remove special characters
  const baseName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  
  // Add random numbers to make it unique
  const randomSuffix = Math.floor(Math.random() * 1000);
  
  return `${baseName}${randomSuffix}`;
}

export default async function handler(req, res) {
  // Set headers for Google OAuth postMessage communication
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Check if we have the required environment variables
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.error('Missing Google Client ID in server environment');
      return res.status(500).json({ 
        message: 'Server configuration error: Google Client ID is not set',
        error: 'MISSING_CLIENT_ID'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Missing JWT Secret in server environment');
      return res.status(500).json({ 
        message: 'Server configuration error: JWT Secret is not set',
        error: 'MISSING_JWT_SECRET'
      });
    }

    // Verify the Google token
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });

      // Get user information from the token
      const payload = ticket.getPayload();
      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user already exists in database
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // User doesn't exist, create a new user
        const firstName = name ? name.split(' ')[0] : '';
        const lastName = name ? name.split(' ').slice(1).join(' ') : '';
        
        // Generate a username from the email
        const username = generateUsername(email);
        
        // Create user with Google profile data (using snake_case to match Prisma schema)
        user = await prisma.user.create({
          data: {
            email,
            username,
            first_name: firstName,
            last_name: lastName,
            image: picture,
            authProvider: 'google',
            authProviderId: googleId,
          },
        });
      } else if (!user.authProviderId) {
        // User exists but doesn't have Google auth, update their profile
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: 'google',
            authProviderId: googleId,
            image: picture || user.image,
          },
        });
      }

      // Generate JWT token for authentication
      const authToken = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          username: user.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Return user data and token (convert snake_case to camelCase for frontend)
      const responseData = {
        message: 'Authentication successful',
        token: `Bearer ${authToken}`,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          image: user.image,
          authProvider: user.authProvider,
        },
      };
      
      console.log('Google auth: Sending response', { 
        hasToken: !!responseData.token,
        hasUser: !!responseData.user,
        userId: responseData.user?.id
      });
      
      return res.status(200).json(responseData);
    } catch (verificationError) {
      console.error('Google token verification error:', verificationError);
      return res.status(401).json({
        message: 'Invalid Google token',
        error: verificationError.message
      });
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message
    });
  }
} 