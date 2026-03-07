export async function GET() {
  // Get relevant environment variables (be careful not to expose secrets)
  const envInfo = {
    hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasJwtSecret: !!process.env.JWT_SECRET,
    googleClientIdLength: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.length || 0,
    googleClientIdFirstChars: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 
      `${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 5)}...` : null,
    jwtSecretFirstChars: process.env.JWT_SECRET ? 
      `${process.env.JWT_SECRET.substring(0, 3)}...` : null,
    nodeEnv: process.env.NODE_ENV,
    nextPublicEnv: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .map(key => key),
  };

  return new Response(JSON.stringify(envInfo, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
} 