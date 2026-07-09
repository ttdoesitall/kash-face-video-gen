'use client';

import { useState, useEffect } from 'react';

const STEPS = ['Script', 'Avatar', 'Image', 'Movement', 'Video', 'Done'];
const STAGE_FOR_STEP = ['script', 'avatar', 'image', 'movement', 'video'];

const STEP_INDEX = {
  input: 0,
  script: 0,
  gender: 1,
  avatar: 1,
  image: 2,
  movement: 3,
  video: 4,
  done: 5,
};

export default function Dashboard() {
  const [view, setView] = useState('create');

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
  const [videoUrl, setVideoUrl] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [videoStatusMessage, setVideoStatusMessage] = useState('');

  const [outfitPrompt, setOutfitPrompt] = useState('');
  const [outfitImageBase64, setOutfitImageBase64] = useState('');
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitError, setOutfitError] = useState('');

  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    setVideoUrl('');
    setSaveWarning('');
    setVideoStatusMessage('');
    setOutfitPrompt('');
    setOutfitImageBase64('');
    setOutfitLoading(false);
    setOutfitError('');
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
  // (movement analysis, video generation, save) never hit body size limits.
  const compressImage = (base64, mimeType, maxDim = 1024, quality = 0.82) => {
    return new Promise((resolve) => {
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

  // Fires in the background right after the avatar image succeeds so LaToya
  // never has to click through an extra step to get a wardrobe-consistency
  // reference image. Uses the same provider as the avatar image so a
  // ChatGPT avatar gets a ChatGPT outfit shot (brand names auto-stripped)
  // and a Gemini avatar gets a Gemini outfit shot (real branding kept).
  const generateOutfitReference = async (prompt, provider) => {
    setOutfitLoading(true);
    setOutfitError('');
    try {
      const promptData = await callApi('/api/generate-outfit-prompt', {
        avatarPrompt: prompt,
      });
      setOutfitPrompt(promptData.outfitPrompt);
      const imgUrl =
        provider === 'openai' ? '/api/generate-image-openai' : '/api/generate-image';
      const imgData = await callApi(imgUrl, {
        avatarPrompt: promptData.outfitPrompt,
        aspectRatio,
      });
      const compressed = await compressImage(imgData.imageBase64, imgData.mimeType);
      setOutfitImageBase64(compressed.base64);
    } catch (err) {
      setOutfitError(err.message);
    } finally {
      setOutfitLoading(false);
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
      setOutfitImageBase64('');
      setOutfitPrompt('');
      setOutfitError('');
      generateOutfitReference(avatarPrompt, provider);
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

  // Higgsfield can take 3-5+ minutes to render a clip -- longer than a
  // serverless function can safely stay open. generate-video kicks the job
  // off and returns a jobId immediately; this polls a lightweight status
  // endpoint every few seconds until the video is ready (or it fails).
  const pollVideoStatus = (jobId) => {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const maxWaitMs = 6 * 60 * 1000;

      const check = async () => {
        try {
          const res = await fetch(`/api/video-status?jobId=${encodeURIComponent(jobId)}`);
          const data = await res.json();
          if (!res.ok) {
            reject(new Error(data.error || 'Failed to check video status'));
            return;
          }
          if (data.status === 'completed') {
            resolve(data.videoUrl);
            return;
          }
          if (data.status === 'failed' || data.status === 'nsfw') {
            reject(new Error(data.error || 'Video generation failed'));
            return;
          }
          if (Date.now() - startedAt > maxWaitMs) {
            reject(
              new Error(
                'Video is taking longer than expected. Check History in a few minutes -- it may still finish.'
              )
            );
            return;
          }
          setVideoStatusMessage(
            data.status === 'queued'
              ? 'Queued...'
              : 'Still rendering -- this usually takes 2-4 minutes...'
          );
          setTimeout(check, 4000);
        } catch (err) {
          reject(err);
        }
      };

      check();
    });
  };

  const handleGenerateVideo = async () => {
    if (!movementPrompt.trim()) {
      setError('Movement prompt cannot be empty');
      return;
    }
    setLoading(true);
    setError('');
    setVideoStatusMessage('Starting video generation...');
    try {
      const data = await callApi('/api/generate-video', {
        imageBase64,
        movementPrompt,
      });
      const finalVideoUrl = await pollVideoStatus(data.jobId);
      setVideoUrl(finalVideoUrl);
      setStage('video');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setVideoStatusMessage('');
    }
  };

  const handleApproveAndSave = async () => {
    if (!videoUrl) {
      setError('Generate a video before saving');
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
        outfitImageBase64: outfitImageBase64 || undefined,
        movementPrompt,
        videoUrl,
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

  const goToStep = (i) => {
    if (i >= stepIndex) return;
    const target = STAGE_FOR_STEP[i];
    if (target) {
      setError('');
      setStage(target);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load history');
      }
      setHistoryItems(data.videos || []);
      setHistoryLoaded(true);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'history' && !historyLoaded && !historyLoading) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const openHistoryDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      const res = await fetch(`/api/videos/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load video');
      }
      setSelectedDetail(data.video);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeHistoryDetail = () => {
    setSelectedId(null);
    setSelectedDetail(null);
  };

  return (
    <div className="app-shell">
      <div className="dashboard-container">
        {view === 'create' && (
          <>
            <div className="dashboard-header">
              <h1>Video Generator</h1>
              <p>Title → Script → Avatar → Image → Movement → Video</p>
            </div>

            {stage !== 'input' && (
              <div className="stepper">
                {STEPS.map((label, i) => (
                  <div
                    key={label}
                    className={
                      'stepper-dot' +
                      (i === stepIndex ? ' active' : '') +
                      (i < stepIndex ? ' complete clickable' : '')
                    }
                    onClick={() => goToStep(i)}
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

                <div className="outfit-reference">
                  <div className="outfit-reference-header">
                    <span>Outfit Reference 👗</span>
                    {outfitLoading && <span className="stage-hint">Generating...</span>}
                  </div>
                  {outfitError && <div className="error-message">{outfitError}</div>}
                  {outfitImageBase64 && !outfitLoading && (
                    <div className="outfit-preview">
                      <img
                        src={`data:image/jpeg;base64,${outfitImageBase64}`}
                        alt="Outfit reference"
                      />
                    </div>
                  )}
                  {!outfitLoading && (
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => generateOutfitReference(avatarPrompt, imageProvider)}
                    >
                      {outfitImageBase64
                        ? 'Regenerate Outfit Reference'
                        : 'Generate Outfit Reference'}
                    </button>
                  )}
                </div>

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
                <p className="stage-hint">Edit freely, then generate the video.</p>
                <textarea
                  className="stage-textarea"
                  value={movementPrompt}
                  onChange={(e) => setMovementPrompt(e.target.value)}
                  rows={8}
                />
                {videoStatusMessage && (
                  <p className="stage-hint">{videoStatusMessage}</p>
                )}
                <div className="stage-actions">
                  <button
                    className="btn-secondary"
                    onClick={handleContinueFromImage}
                    disabled={loading}
                  >
                    {loading ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  <button onClick={handleGenerateVideo} disabled={loading}>
                    {loading ? 'Generating Video...' : 'Generate Video →'}
                  </button>
                </div>
              </div>
            )}

            {/* STAGE: VIDEO */}
            {stage === 'video' && (
              <div className="stage-card">
                <h3>Video Preview</h3>
                <p className="stage-hint">Watch it, then approve to save — or regenerate.</p>
                {videoStatusMessage && (
                  <p className="stage-hint">{videoStatusMessage}</p>
                )}
                {videoUrl && (
                  <div className="video-preview">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={videoUrl} controls playsInline />
                  </div>
                )}
                <div className="stage-actions">
                  <button
                    className="btn-secondary"
                    onClick={handleGenerateVideo}
                    disabled={loading}
                  >
                    {loading ? 'Regenerating...' : 'Regenerate Video'}
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
                  Script, avatar prompt, image, movement prompt, and video are saved.
                </p>
                {saveWarning && <div className="save-warning">{saveWarning}</div>}
                <div className="stage-actions">
                  <button onClick={resetAll}>Start New Video</button>
                  <button className="btn-secondary" onClick={() => setView('history')}>
                    View in History
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'history' && (
          <div className="history-view">
            <div className="dashboard-header">
              <h1>History</h1>
              <p>Everything you've approved and saved.</p>
            </div>

            {historyError && <div className="error-message">{historyError}</div>}
            {historyLoading && <p className="stage-hint">Loading...</p>}
            {!historyLoading && historyLoaded && historyItems.length === 0 && (
              <p className="stage-hint">
                No videos yet. Head to Create to make your first one.
              </p>
            )}

            <div className="history-list">
              {historyItems.map((item) => (
                <button
                  key={item.id}
                  className="history-card"
                  onClick={() => openHistoryDetail(item.id)}
                >
                  <div className="history-card-main">
                    <span className="history-card-title">{item.title}</span>
                    <span className="history-card-meta">
                      {new Date(item.created_at).toLocaleDateString()} · {item.status}
                      {item.video_url ? ' · video ready' : ''}
                    </span>
                  </div>
                  <span className="history-card-arrow">›</span>
                </button>
              ))}
            </div>

            {selectedId && (
              <div className="history-detail-overlay" onClick={closeHistoryDetail}>
                <div
                  className="history-detail-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="history-detail-close" onClick={closeHistoryDetail}>
                    ✕
                  </button>
                  {detailLoading && <p className="stage-hint">Loading...</p>}
                  {selectedDetail && (
                    <>
                      <h3>{selectedDetail.title}</h3>
                      {selectedDetail.video_url ? (
                        <div className="video-preview">
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <video src={selectedDetail.video_url} controls playsInline />
                        </div>
                      ) : selectedDetail.image_base64 ? (
                        <div className="image-preview">
                          <img
                            src={`data:image/jpeg;base64,${selectedDetail.image_base64}`}
                            alt={selectedDetail.title}
                          />
                        </div>
                      ) : null}
                      {selectedDetail.outfit_image_base64 && (
                        <>
                          <label className="aspect-label">Outfit Reference</label>
                          <div className="outfit-preview">
                            <img
                              src={`data:image/jpeg;base64,${selectedDetail.outfit_image_base64}`}
                              alt="Outfit reference"
                            />
                          </div>
                        </>
                      )}
                      <label className="aspect-label">Script</label>
                      <p className="history-detail-text">{selectedDetail.script}</p>
                      {selectedDetail.avatar_prompt && (
                        <>
                          <label className="aspect-label">Avatar Prompt</label>
                          <p className="history-detail-text">
                            {selectedDetail.avatar_prompt}
                          </p>
                        </>
                      )}
                      {selectedDetail.movement_prompt && (
                        <>
                          <label className="aspect-label">Movement Prompt</label>
                          <p className="history-detail-text">
                            {selectedDetail.movement_prompt}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <button
          className={view === 'create' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setView('create')}
        >
          <span className="bottom-nav-icon">🎬</span>
          <span className="bottom-nav-label">Create</span>
        </button>
        <button
          className={view === 'history' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setView('history')}
        >
          <span className="bottom-nav-icon">🕘</span>
          <span className="bottom-nav-label">History</span>
        </button>
      </nav>
    </div>
  );
}
