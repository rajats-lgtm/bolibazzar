import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'BoliBazaar — India\'s AI Reverse Marketplace',
  description: 'Tell AI what you want to buy. Verified suppliers compete for your business.',
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
