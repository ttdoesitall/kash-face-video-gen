export const metadata = {
  title: 'Privacy Policy | Kash Face Video Generator',
  description: 'Privacy policy for the Kash Face Video Generator app.',
};

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.6,
        color: '#111',
      }}
    >
      <h1>Privacy Policy</h1>
      <p>Last updated: July 2026</p>

      <p>
        Kash Face Video Generator ("the app") is an internal tool built for
        TT Does It All LLC, owned and operated by LaToya Kelly. It generates
        AI avatar videos and, with the owner's approval, uploads them
        directly to the owner's own YouTube channel.
      </p>

      <h2>What this app does</h2>
      <p>
        The app lets LaToya Kelly enter a video title, generate a script,
        generate an AI avatar image, and generate a lip-synced talking
        video. When she approves a finished video, the app uploads that
        video file to her own YouTube channel with a title and description
        she has provided.
      </p>

      <h2>Google data this app accesses</h2>
      <p>
        This app requests one Google API scope:{' '}
        <code>https://www.googleapis.com/auth/youtube.upload</code>. This
        scope is used solely to upload video files created in this app to
        the owner's own YouTube channel. The app does not read, access, or
        collect any other Google Account data -- no Gmail, Calendar,
        Contacts, Drive, or personal profile information is ever accessed.
      </p>

      <h2>What is stored</h2>
      <p>
        The app stores only an OAuth refresh token, used to make YouTube
        upload API calls on the owner's behalf. It does not store Google
        account credentials, passwords, email content, or any personal
        profile data. Videos uploaded through this app are the owner's own
        original content, uploaded to the owner's own channel -- no other
        user's data is ever involved.
      </p>

      <h2>Data sharing</h2>
      <p>
        Data is never sold, shared with third parties, or used for
        advertising. This app is used solely by its owner to manage her own
        YouTube channel and is not made available to the public.
      </p>

      <h2>Revoking access</h2>
      <p>
        Access can be revoked at any time at{' '}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noreferrer"
        >
          myaccount.google.com/permissions
        </a>
        . Revoking access immediately stops the app's ability to upload
        videos.
      </p>

      <h2>Changes to this policy</h2>
      <p>Any changes to this policy will be posted on this page.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{' '}
        <a href="mailto:Toya@ttdoesitall.com">Toya@ttdoesitall.com</a>.
      </p>
    </main>
  );
}
