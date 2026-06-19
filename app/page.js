'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [repoName, setRepoName] = useState('');
  const [vercelUrl, setVercelUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Pre-fill from localStorage if available
    const savedRepo = localStorage.getItem('repoName');
    const savedUrl = localStorage.getItem('vercelUrl');
    if (savedRepo) setRepoName(savedRepo);
    if (savedUrl) setVercelUrl(savedUrl);
  }, []);

  const handleStart = () => {
    if (!repoName.trim() || !vercelUrl.trim()) {
      alert('Please fill in both fields.');
      return;
    }
    const url = vercelUrl.trim().startsWith('http')
      ? vercelUrl.trim()
      : `https://${vercelUrl.trim()}`;
    localStorage.setItem('repoName', repoName.trim());
    localStorage.setItem('vercelUrl', url);
    router.push('/editor');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>✦</span>
          <span style={styles.logoText}>Site Editor UI</span>
        </div>

        <h1 style={styles.title}>Edit your cloned site</h1>
        <p style={styles.subtitle}>
          Paste the repo name and Vercel URL from your site cloner agent output
        </p>

        <div style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>GitHub Repo Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. my-cloned-site-20240101"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
            />
            <span style={styles.hint}>Just the repo name, not the full URL</span>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Vercel URL</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. https://my-cloned-site.vercel.app"
              value={vercelUrl}
              onChange={(e) => setVercelUrl(e.target.value)}
            />
            <span style={styles.hint}>The deployed preview URL of your cloned site</span>
          </div>

          <button
            style={styles.button}
            onClick={handleStart}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#e06e63')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#F18479')}
          >
            Start Editing →
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FAF8F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(27, 42, 74, 0.08)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '20px',
    color: '#F18479',
  },
  logoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1B2A4A',
    letterSpacing: '-0.01em',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1B2A4A',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: '#737373',
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1B2A4A',
    letterSpacing: '0.01em',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1.5px solid #e5e5e5',
    fontSize: '14px',
    color: '#1B2A4A',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: '12px',
    color: '#a3a3a3',
  },
  button: {
    marginTop: '8px',
    padding: '14px 24px',
    backgroundColor: '#F18479',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s',
    letterSpacing: '-0.01em',
  },
};
