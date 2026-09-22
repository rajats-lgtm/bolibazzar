import './globals.css';

export const metadata = {
  title: 'BoliBazzar Admin',
  description: 'BoliBazzar administration dashboard',
};

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
