import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMatches, GENRES } from '../api';
import Footer from '../components/Footer';
import styles from './Home.module.css';

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

function getGenreName(g) {
  if (!g) return 'Other';
  const parsed = parseInt(g, 10);
  if (!isNaN(parsed) && GENRES[parsed]) {
    return GENRES[parsed];
  }
  const str = String(g);
  return str.charAt(0).toUpperCase() + str.slice(1);
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

function getTimeStatus(eventTime) {
  if (!eventTime) return { type: 'unknown' };
  try {
    const now = Date.now();
    const t = parseUSEasternTime(eventTime);
    const diff = t - now;
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hours > 24) return { type: 'upcoming', text: `${Math.floor(hours / 24)}D` };
      if (hours > 0) return { type: 'upcoming', text: `${hours}H ${mins}M` };
      return { type: 'upcoming', text: `${mins}M` };
    }
    const passed = Math.abs(diff);
    if (passed < 10800000) return { type: 'live', text: 'LIVE' };
    return { type: 'finished', text: 'FINISHED' };
  } catch { return { type: 'unknown' }; }
}

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatches()
      .then(setMatches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const grouped = {};
  for (const m of matches) {
    const g = m.genre || 'other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(m);
  }
  const sections = Object.entries(grouped);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorText}>Failed to load matches: {error}</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <img src="/logo.png" alt="" className={styles.logo} />
            <span className={styles.brandText}>oraScore TV</span>
          </div>
        </header>
        <div className={styles.center}>
          <p className={styles.emptyText}>No live matches right now. Check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="" className={styles.logo} />
          <span className={styles.brandText}>oraScore TV</span>
        </div>
        <p className={styles.tagline}>Free live sports streams</p>
      </header>

      <main className={styles.main}>
        {sections.map(([genreId, sectionMatches]) => {
          const withStatus = sectionMatches.map(m => ({ ...m, statusObj: getTimeStatus(m.event_time) }));
          const live = withStatus.filter(m => m.statusObj.type === 'live');
          const upcoming = withStatus.filter(m => m.statusObj.type === 'upcoming');
          const finished = withStatus.filter(m => m.statusObj.type === 'finished');

          const renderCard = (m) => (
            <Link
              key={m.id}
              to={`/live/${m.custom_slug}`}
              className={styles.card}
              {...(m.logo_url ? { style: { backgroundImage: `url(${m.logo_url})` } } : {})}
            >
              <div className={styles.cardOverlay} />
              <div className={styles.cardTop}>
                {m.statusObj.type === 'live' && (
                  <div className={styles.liveBadge}>
                    <div className={styles.liveDot} />
                    LIVE
                  </div>
                )}
                {m.statusObj.type === 'upcoming' && (
                  <div className={styles.upcomingBadge}>{m.statusObj.text}</div>
                )}
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{m.title}</h3>
                <div className={styles.cardBottom}>
                  {m.statusObj.type === 'live' ? (
                    <span className={styles.cardLive}>LIVE</span>
                  ) : m.event_time ? (
                    <span className={styles.cardTime}>{formatTime(m.event_time)}</span>
                  ) : null}
                  {m.statusObj.type === 'finished' && (
                    <div className={styles.finishedBadge}>FINISHED</div>
                  )}
                </div>
              </div>
            </Link>
          );

          const sortedMatches = [...live, ...upcoming, ...finished];

          return (
            <div key={genreId} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {getGenreName(genreId)}
              </h2>
              <div className={styles.row}>
                {sortedMatches.map(renderCard)}
              </div>
            </div>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}
