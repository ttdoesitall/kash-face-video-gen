'use client';

import { useState } from 'react';

const STEPS = ['Script', 'Avatar', 'Image', 'Movement', 'Done'];

const STEP_INDEX = {
  input: 0,
  script: 0,
  gender: 1,
  avatar: 1,
  image: 2,
  movement: 3,
  done: 4,
};

export default function Dashboard() {
  const [stage, setStage] = useState('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [gender, setGender] = useState('female');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/png');
  const [imageProvider, setImageProvider] = useState('gemini');
  const [movementPrompt, setMovementPrompt] = useState('');
  const [saveWarning, setSaveWarning] = useState('');

  const resetAll = () => {
    setStage('input');
    setLoading(false);
    setError('');
    setTitle('');
    setScript('');
    setGender('female');
    setAvatarPrompt('');
    setAspectRatio('16:9');
    setImageBase64('');
    setImageMime('image/png');
    setImageProvider('gemini');
    setMovementPrompt('');
    setSaveWarning('');
  };

  const callApi = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  // Resizes + recompresses a base64 image client-side so downstream requests
  // (movement analysis, save) never hit Vercel's serverless body size limit.
  const compressImage = (base64, mimeType, maxDim = 1024, quality = 0.82) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedBase64 = dataUrl.split(',')[1];
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        // If compression fails for any reason, fall back to the original image
        // rather than blocking the whole flow.
        resolve({ base64, mimeType });
      };
      img.src = `data:${mimeType};base64,${base64}`;
    });
  };

  const handleGenerateScript = async () => {
    if (!title.trim()) {
      setError('Enter a video title');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await callApi('/api/generate-script', { title });
      setScript(data.script);
      setStage('script');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFromScript = () => {
    if (!script.trim()) {
      setError('Script cannot be empty');
      return;
    }
    setError('');
    setStage('gender');
  };

  const handleGenerateAvatar = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callApi('/api/generate-avatar', { script, gender });
      setAvatarPrompt(data.avatarPrompt);
      setStage('avatar');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (provider) => {
    if (!avatarPrompt.trim()) {
      setError('Avatar prompt cannot be empty');
      return;
    }
    setLoading(true);
    setError('');
    const url =
      provider === 'openai' ? '/api/generate-image-openai' : '/api/generate-image';
    try {
      const data = await callApi(url, {
        avatarPrompt,
        aspectRatio,
      });
      const compressed = await compressImage(data.imageBase64, data.mimeType);
      setImageBase64(compressed.base64);
      setImageMime(compressed.mimeType);
      setImageProvider(provider);
      setStage('image');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = () => {
    handleGenerateImage(imageProvider);
  };

  const handleContinueFromImage = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callApi('/api/generate-movement', {
        imageBase64,
        mimeType: imageMime,
        script,
      });
      setMovementPrompt(data.movementPrompt);
      setStage('movement');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndSave = async () => {
    if (!movementPrompt.trim()) {
      setError('Movement prompt cannot be empty');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await callApi('/api/save', {
        title,
        script,
        gender,
        avatarPrompt,
        imageBase64,
        movementPrompt,
      });
      if (data.warning) {
        setSaveWarning(data.warning);
      }
      setStage('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEP_INDEX[stage] ?? 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Video Generator</h1>
        <p>Title → Script → Avatar → Image → Movement</p>
      </div>

      {stage !== 'input' && (
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={
                'stepper-dot' +
                (i === stepIndex ? ' active' : '') +
                (i < stepIndex ? ' complete' : '')
              }
            >
              <span className="stepper-circle">{i + 1}</span>
              <span className="stepper-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* STAGE: INPUT */}
      {stage === 'input' && (
        <div className="stage-card">
          <div className="input-section">
            <label>Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your video title..."
              onKeyPress={(e) => e.key === 'Enter' && handleGenerateScript()}
            />
            <button onClick={handleGenerateScript} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Script 💫'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: SCRIPT */}
      {stage === 'script' && (
        <div className="stage-card">
          <h3>Script</h3>
          <p className="stage-hint">Edit freely, then continue.</p>
          <textarea
            className="stage-textarea"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={10}
          />
          <div className="stage-actions">
            <button
              className="btn-secondary"
              onClick={handleGenerateScript}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button onClick={handleContinueFromScript} disabled={loading}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* STAGE: GENDER SELECT */}
      {stage === 'gender' && (
        <div className="stage-card">
          <h3>Avatar Setup</h3>
          <p className="stage-hint">Male or female avatar?</p>
          <div className="gender-options">
            <button
              className={gender === 'female' ? 'gender-btn active' : 'gender-btn'}
              onClick={() => setGender('female')}
            >
              Female
            </button>
            <button
              className={gender === 'male' ? 'gender-btn active' : 'gender-btn'}
              onClick={() => setGender('male')}
            >
              Male
            </button>
          </div>
          <div className="stage-actions">
            <button
              className="btn-secondary"
              onClick={() => setStage('script')}
              disabled={loading}
            >
              ← Back to Script
            </button>
            <button onClick={handleGenerateAvatar} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Avatar Prompt →'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: AVATAR PROMPT */}
      {stage === 'avatar' && (
        <div className="stage-card">
          <h3>Avatar Prompt</h3>
          <p className="stage-hint">Edit freely, then generate the image.</p>
          <textarea
            className="stage-textarea"
            value={avatarPrompt}
            onChange={(e) => setAvatarPrompt(e.target.value)}
            rows={8}
          />
          <label className="aspect-label">Aspect Ratio</label>
          <select
            className="aspect-select"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            <option value="16:9">16:9 (widescreen)</option>
            <option value="9:16">9:16 (vertical / reels)</option>
            <option value="1:1">1:1 (square)</option>
            <option value="4:5">4:5 (portrait)</option>
          </select>
          <div className="stage-actions">
            <button
              className="btn-secondary"
              onClick={handleGenerateAvatar}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : 'Regenerate Prompt'}
            </button>
            <button onClick={() => handleGenerateImage('gemini')} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Image (Gemini) 🖼️'}
            </button>
            <button onClick={() => handleGenerateImage('openai')} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Image (ChatGPT) 🎨'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: IMAGE */}
      {stage === 'image' && (
        <div className="stage-card">
          <h3>Avatar Image</h3>
          <p className="stage-hint">
            Generated with {imageProvider === 'openai' ? 'ChatGPT' : 'Gemini'}.
          </p>
          {imageBase64 && (
            <div className="image-preview">
              <img
                src={`data:${imageMime};base64,${imageBase64}`}
                alt="Generated avatar"
              />
            </div>
          )}
          <div className="stage-actions">
            <button
              className="btn-secondary"
              onClick={handleRegenerateImage}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : 'Regenerate (same provider)'}
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                handleGenerateImage(imageProvider === 'openai' ? 'gemini' : 'openai')
              }
              disabled={loading}
            >
              {loading
                ? 'Generating...'
                : `Try ${imageProvider === 'openai' ? 'Gemini' : 'ChatGPT'} Instead`}
            </button>
            <button onClick={handleContinueFromImage} disabled={loading}>
              {loading ? 'Analyzing...' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: MOVEMENT */}
      {stage === 'movement' && (
        <div className="stage-card">
          <h3>Movement Prompt</h3>
          <p className="stage-hint">Edit freely, then approve to save everything.</p>
          <textarea
            className="stage-textarea"
            value={movementPrompt}
            onChange={(e) => setMovementPrompt(e.target.value)}
            rows={8}
          />
          <div className="stage-actions">
            <button
              className="btn-secondary"
              onClick={handleContinueFromImage}
              disabled={loading}
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button onClick={handleApproveAndSave} disabled={loading}>
              {loading ? 'Saving...' : 'Approve & Save ✓'}
            </button>
          </div>
        </div>
      )}

      {/* STAGE: DONE */}
      {stage === 'done' && (
        <div className="stage-card done-card">
          <h3>Saved ✓</h3>
          <p className="stage-hint">
            Script, avatar prompt, image, and movement prompt are saved.
          </p>
          {saveWarning && <div className="save-warning">{saveWarning}</div>}
          <div className="stage-actions">
            <button onClick={resetAll}>Start New Video</button>
          </div>
        </div>
      )}
    </div>
  );
}
