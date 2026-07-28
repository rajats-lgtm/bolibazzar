import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'BoliBazzar — You Ask. Sellers Compete. You Win.',
  description: 'India\'s AI-powered reverse marketplace. Tell AI what you want to buy — verified suppliers compete for your business.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
