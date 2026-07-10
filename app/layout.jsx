import './globals.css';

export const metadata = {
  title: 'Video Generator | Kash Face Academy',
  description: 'Generate faceless YouTube videos for Kash Face Academy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer
          style={{
            textAlign: 'center',
            padding: '16px',
            fontSize: '12px',
            color: '#9DA3AE',
          }}
        >
          <a href="/privacy" style={{ color: '#9DA3AE' }}>
            Privacy Policy
          </a>
        </footer>
      </body>
    </html>
  );
}
