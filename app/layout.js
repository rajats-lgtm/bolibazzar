import './globals.css';
import { Toaster } from 'sonner';
import Script from 'next/script';

export const metadata = {
  title: 'BoliBazzar — You Ask. Sellers Compete. You Win.',
  description: 'India\'s AI-powered reverse marketplace. Tell AI what you want to buy — verified suppliers compete for your business.',
};

const themeInit = `try{var t=localStorage.getItem('bb_theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark')}else{d.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="bb-theme-init" strategy="beforeInteractive">{themeInit}</Script>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
