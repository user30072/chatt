import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../prisma';
import { generateToken } from './jwt';
import { User } from '@prisma/client';

// Get environment variables with fallbacks
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}

if (!GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'postmessage' // Default to postmessage for token exchange
);

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    throw new Error('Invalid Google token');
  }
}

export async function handleGoogleAuth(token: string): Promise<{ user: User; token: string }> {
  const googleUser = await verifyGoogleToken(token);

  // Check if user exists by email
  let user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  // If user doesn't exist, create a new one
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleUser.email!,
        name: googleUser.name || 'Google User',
        image: googleUser.picture,
        authProvider: 'google',
        authProviderId: googleUser.sub,
        google_id: googleUser.sub, // For backward compatibility
        // Set default organization or handle organization creation
        organization: {
          create: {
            name: `${googleUser.name || 'User'}'s Organization`,
          }
        }
      },
      include: {
        organization: true
      }
    });
  } else {
    // Update existing user with Google info if needed
    if (user.authProvider !== 'google' || user.authProviderId !== googleUser.sub) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: 'google',
          authProviderId: googleUser.sub,
          google_id: googleUser.sub,
          name: googleUser.name || user.name,
          image: googleUser.picture || user.image,
        },
        include: {
          organization: true
        }
      });
    }
  }

  // Generate JWT token
  const jwtToken = generateToken(user);

  return { user, token: jwtToken };
} 