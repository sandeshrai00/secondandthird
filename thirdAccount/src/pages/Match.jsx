import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMatch, GENRES } from '../api';
import Footer from '../components/Footer';
import styles from './Match.module.css';

const EMBED_BASE = import.meta.env.VITE_EMBED_URL || '';

function formatTime(t) {
  if (!t) return null;
  try {
    return new Date(t).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return t; }
}

function isFinished(eventTime) {
  if (!eventTime) return false;
  try {
    // Parse the stored time, then shift to local midnight for comparison
    const eventDate = new Date(eventTime.replace(/-/g, '/'));
    const now = new Date();
    // Use local date comparison: check if event date is before today
    const eventLocal = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // If event was yesterday or earlier, it's finished
    return eventLocal < todayLocal;
  } catch { return false; }
}

export default function Match() {
  const { slug } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMatch(null);
    setActiveChannel(null);

    fetchMatch(slug)
      .then(m => {
        if (!m) { setError('Match not found.'); return; }
        setMatch(m);
        if (m.channels && m.channels.length > 0) {
          setActiveChannel(m.channels[0].channel_slug);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const embedUrl = activeChannel
    ? (() => {
        const ch = match.channels.find(c => c.channel_slug === activeChannel);
        if (!ch) return null;
        if (ch.stream_type === 'embed' && ch.embed_url) {
          return `${EMBED_BASE}/provider-embed?url=${encodeURIComponent(ch.embed_url)}`;
        }
        return `${EMBED_BASE}/embed?ch=${encodeURIComponent(ch.channel_slug)}`;
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
                <iframe
                  key={activeChannel}
                  src={embedUrl}
                  title={match.title}
                  className={styles.iframe}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className={styles.noStream}>No stream available</div>
              )}
            </div>

            {match.channels && match.channels.length > 1 && (
              <div className={styles.streams}>
                {match.channels.map((c, i) => (
                  <button
                    key={c.channel_slug}
                    className={`${styles.streamBtn} ${activeChannel === c.channel_slug ? styles.streamBtnActive : ''}`}
                    onClick={() => setActiveChannel(c.channel_slug)}
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
