import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMatch, GENRES } from '../api';
import Footer from '../components/Footer';
import styles from './Match.module.css';

const EMBED_BASE = import.meta.env.VITE_EMBED_URL || '';

function parseUSEasternTime(dateStr) {
  if (typeof dateStr !== 'string') return new Date(dateStr).getTime();
  if (dateStr.endsWith('Z') || dateStr.includes('+')) return new Date(dateStr).getTime();
  
  const cleanStr = dateStr.replace(' ', 'T');
  const naiveDate = new Date(cleanStr + 'Z');
  
  const month = naiveDate.getUTCMonth() + 1;
  const dom = naiveDate.getUTCDate();
  const dow = naiveDate.getUTCDay();
  
  let isDST = false;
  if (month > 3 && month < 11) isDST = true;
  else if (month === 3) isDST = (dom - dow) >= 8;
  else if (month === 11) isDST = (dom - dow) <= 0;
  
  const offset = isDST ? '-04:00' : '-05:00';
  return new Date(cleanStr + offset).getTime();
}

function formatTime(t) {
  if (!t) return null;
  try {
    return new Date(parseUSEasternTime(t)).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return t; }
}

function isFinished(eventTime) {
  if (!eventTime) return false;
  try {
    const t = parseUSEasternTime(eventTime);
    // The backend auto-deletes finished matches. If it's in the DB, it's NOT finished.
    return false;
  } catch { return false; }
}

export default function Match() {
  const { slug } = useParams();
  const [match, setMatch] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  const handleRefreshPlayer = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage('FORCE_REFRESH', '*');
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMatch(null);
    setActiveStream(null);

    fetchMatch(slug)
      .then(m => {
        if (!m) { setError('Match not found.'); return; }
        setMatch(m);
        if (m.channels && m.channels.length > 0) {
          setActiveStream(m.channels[0]);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const embedUrl = activeStream
    ? (() => {
        if (activeStream.stream_type === 'embed') {
          // High-Tech Architecture: Route Dictionary (O(1) Lookup)
          const routeMap = {
            'sora 2': 'sora2-embed',
            'sora2': 'sora2-embed'
          };
          
          const providerKey = (activeStream.provider || '').toLowerCase().trim();
          const route = routeMap[providerKey] || 'sora3-embed'; // Fallback to sora3
          
          return `${EMBED_BASE}/${route}?url=${encodeURIComponent(activeStream.embed_url)}`;
        }
        return `${EMBED_BASE}/embed?ch=${encodeURIComponent(activeStream.channel_slug)}`;
      })()
    : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.error}>{error || 'Match not found.'}</p>
          <Link to="/" className={styles.backBtn}>← Back to matches</Link>
        </div>
      </div>
    );
  }

  const finished = isFinished(match.event_time);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← All Matches</Link>
        <div className={styles.brand}>
          <img src="/logo.png" alt="" className={styles.logo} />
          <span className={styles.brandText}>oraScore TV</span>
        </div>
      </header>

      <main className={styles.main}>
        {finished ? (
          <>
            <div className={styles.finished} {...(match.logo_url ? { style: { backgroundImage: `url(${match.logo_url})` } } : {})}>
              <div className={styles.finishedOverlay} />
              <div className={styles.finishedBadge}>FINISHED</div>
              <div className={styles.finishedMsg}>This match has concluded</div>
            </div>
            <div className={styles.info}>
              <div className={styles.infoTop}>
                {match.genre && GENRES[match.genre] && (
                  <span className={styles.badge}>{GENRES[match.genre]}</span>
                )}
                {match.event_time && (
                  <span className={styles.time}>{formatTime(match.event_time)}</span>
                )}
              </div>
              <h1 className={styles.title}>{match.title}</h1>
              <p className={styles.finishedMsg}>This match has concluded</p>
            </div>
          </>
        ) : (
          <>
            <div className={styles.player}>
              {embedUrl ? (
                <>
                  <iframe
                    ref={iframeRef}
                    key={activeStream ? `${activeStream.channel_slug}-${activeStream.provider || 'system'}` : 'embed'}
                    src={embedUrl}
                    title={match.title}
                    className={styles.iframe}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                  <button 
                    className={styles.streamBtn} 
                    style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      color: '#fff', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(4px)',
                      zIndex: 10,
                      padding: '6px 14px',
                      fontSize: '12px'
                    }}
                    onClick={handleRefreshPlayer}
                    title="Reload Video Player"
                  >
                    Refresh ⟳
                  </button>
                </>
              ) : (
                <div className={styles.noStream}>No stream available</div>
              )}
            </div>

            {match.channels && match.channels.length >= 1 && (
              <div className={styles.streams}>
                {match.channels.map((c, i) => (
                  <button
                    key={`${c.channel_slug}-${c.provider || 'system'}-${i}`}
                    className={`${styles.streamBtn} ${activeStream === c ? styles.streamBtnActive : ''}`}
                    onClick={() => setActiveStream(c)}
                  >
                    {c.label || `Stream ${i + 1}`}
                    {c.provider && <span className={styles.providerBadge}>{c.provider}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.info}>
              <div className={styles.infoTop}>
                {match.genre && GENRES[match.genre] && (
                  <span className={styles.badge}>{GENRES[match.genre]}</span>
                )}
                {match.event_time && (
                  <span className={styles.time}>{formatTime(match.event_time)}</span>
                )}
              </div>
              <h1 className={styles.title}>{match.title}</h1>
              <p className={styles.streamsCount}>
                {match.channels ? match.channels.length : 0} stream{match.channels && match.channels.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
