import './globals.css';

export const metadata = {
  title: 'Video Generator | Kash Face Academy',
  description: 'Generate faceless YouTube videos for Kash Face Academy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
