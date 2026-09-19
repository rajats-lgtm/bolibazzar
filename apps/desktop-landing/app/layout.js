import './globals.css';

export const metadata = {
  title: 'BoliBazzar — You Ask. Sellers Compete. You Win.',
  description:
    "India's AI-powered reverse marketplace. Tell AI what you want to buy — verified suppliers compete for your business.",
};

// Applied before paint so the page never flashes the wrong theme.
const themeInit = `try{var t=localStorage.getItem('bb_theme');var d=document.documentElement;var dark=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;d.classList.toggle('dark',dark);d.setAttribute('data-theme',dark?'dark':'light')}catch(e){}`;

export default function DesktopLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
