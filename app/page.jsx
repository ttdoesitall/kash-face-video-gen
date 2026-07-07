'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState('');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Enter a video title');
      return;
    }

    setLoading(true);
    setError('');
    setScript('');
    setPrompt('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }

      setScript(data.script);
      setPrompt(data.prompt);
    } catch (err) {
      setError('Something went wrong. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Video Generator</h1>
        <p>Title → Script → Higgsfield Prompt</p>
      </div>

      <div className="input-section">
        <label>Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your video title..."
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate 💫'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {script && (
        <div className="output-section">
          <div className="output-box">
            <div className="output-header">
              <h3>Script</h3>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(script, 'script')}
              >
                {copied === 'script' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="output-text">{script}</div>
          </div>

          <div className="output-box">
            <div className="output-header">
              <h3>Higgsfield Prompt</h3>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(prompt, 'prompt')}
              >
                {copied === 'prompt' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="output-text">{prompt}</div>
          </div>
        </div>
      )}
    </div>
  );
}
