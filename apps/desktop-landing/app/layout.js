import '../../../app/globals.css';

export const metadata = {
  title: 'BoliBazzar',
  description: 'BoliBazzar marketplace',
};

export default function DesktopLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
