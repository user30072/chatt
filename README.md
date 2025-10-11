## Setting Up Google Sign-in

The application supports Google OAuth 2.0 for seamless user authentication. Follow these steps to set it up:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Set the application type to "Web application"
6. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: `https://your-domain.com`
7. Add authorized redirect URIs:
   - For development: `http://localhost:3000/login` and `http://localhost:3000/signup`
   - For production: `https://your-domain.com/login` and `https://your-domain.com/signup`
8. Click "Create" and note your Client ID and Client Secret
9. Add these values to your environment files:
   - Frontend `.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id`
   - Backend `.env`: `GOOGLE_CLIENT_ID=your-client-id` and `GOOGLE_CLIENT_SECRET=your-client-secret`

When users sign up or log in with Google, the system will:
- Create a new account for first-time users, generating a username based on their email
- Link Google authentication to existing accounts when the email matches
- Automatically verify email addresses from Google accounts 