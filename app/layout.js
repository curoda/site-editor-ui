import './globals.css';

export const metadata = {
  title: 'Site Editor UI',
  description: 'Chat-based website editor with live preview',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
