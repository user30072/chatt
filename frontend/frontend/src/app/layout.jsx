import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';
import "../styles/fonts.css";
import GoogleOAuthWrapper from '@/components/GoogleOAuthWrapper';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "any bot™",
  description: "Customizable AI Powered Chatbots",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Roboto';
            font-style: normal;
            font-weight: 400;
            src: url(https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2) format('woff2');
            font-display: swap;
          }
          @font-face {
            font-family: 'Roboto';
            font-style: normal;
            font-weight: 700;
            src: url(https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2) format('woff2');
            font-display: swap;
          }
          
          * {
            font-family: 'Roboto' !important;
          }
        ` }} />
      </head>
      <body className={inter.className} style={{ fontFamily: "Roboto" }}>
        <AuthProvider>
          <Providers>
          <GoogleOAuthWrapper>
              {children}
            </GoogleOAuthWrapper>
            </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
