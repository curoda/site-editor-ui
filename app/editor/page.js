'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function EditorPage() {
  const [repoName, setRepoName] = useState('');
  const [vercelUrl, setVercelUrl] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeUrl, setIframeUrl] = useState('');
  const messagesEndRef = useRef(null);
  const iframeRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const savedRepo = localStorage.getItem('repoName');
    const savedUrl = localStorage.getItem('vercelUrl');
    if (!savedRepo || !savedUrl) {
      router.push('/');
      return;
    }
    setRepoName(savedRepo);
    setVercelUrl(savedUrl);
    setIframeUrl(savedUrl);
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm your site editor. I'm connected to the repo **${savedRepo}** and can see your site preview on the right.\n\nWhat would you like to change?`,
      },
    ]);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: history.slice(0, -1),
          repoName,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);

        if (data.committed) {
          setTimeout(() => {
            setIframeKey((k) => k + 1);
          }, 5000);
        }
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Network error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const refreshIframe = () => setIframeKey((k) => k + 1);

  const openInTab = () => window.open(vercelUrl, '_blank');

  const handleChangeSite = () => {
    router.push('/');
  };

  const renderMessage = (msg) => {
    // Simple markdown-like rendering for bold
    return msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={styles.root}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.topBarLogo}>✦ Site Editor UI</span>
        </div>
        <div style={styles.topBarCenter}>
          {vercelUrl && (
            <span style={styles.urlPill}>
              <span style={styles.liveDot} />
              <span style={styles.liveText}>Live</span>
              <span style={styles.urlText}>{vercelUrl.replace('https://', '')}</span>
            </span>
          )}
        </div>
        <div style={styles.topBarRight}>
          <button style={styles.changeSiteBtn} onClick={handleChangeSite}>
            ← Change site
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Left Pane - Chat */}
        <div style={styles.chatPane}>
          {/* Chat History */}
          <div style={styles.chatHistory}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                }
              >
                {msg.role === 'assistant' && (
                  <span style={styles.assistantAvatar}>✦</span>
                )}
                <div
                  style={
                    msg.role === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble
                  }
                >
                  <p style={styles.messageText}>{renderMessage(msg)}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.assistantMessage}>
                <span style={styles.assistantAvatar}>✦</span>
                <div style={styles.assistantBubble}>
                  <div style={styles.thinkingDots}>
                    <span style={{ ...styles.dot, animationDelay: '0s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={styles.inputArea}>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a change to make..."
              rows={3}
              disabled={loading}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: loading || !input.trim() ? 0.5 : 1,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              {loading ? '...' : '↑ Send'}
            </button>
          </div>
        </div>

        {/* Right Pane - Preview */}
        <div style={styles.previewPane}>
          {/* Address Bar */}
          <div style={styles.addressBar}>
            <span style={styles.addressText}>{iframeUrl}</span>
            <button style={styles.iconBtn} onClick={refreshIframe} title="Refresh">
              ↻
            </button>
            <button style={styles.iconBtn} onClick={openInTab} title="Open in new tab">
              ↗
            </button>
          </div>

          {/* iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeUrl}
            style={styles.iframe}
            title="Site Preview"
          />
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#FAF8F5',
    overflow: 'hidden',
  },
  topBar: {
    height: '52px',
    backgroundColor: '#1B2A4A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    gap: '16px',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    minWidth: '160px',
  },
  topBarLogo: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  topBarCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  urlPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '4px 14px',
    maxWidth: '400px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4ade80',
    flexShrink: 0,
  },
  liveText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4ade80',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  urlText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  topBarRight: {
    minWidth: '160px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  changeSiteBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  chatPane: {
    width: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e5e5',
  },
  chatHistory: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  userMessage: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  assistantAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#1B2A4A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#F18479',
    flexShrink: 0,
    lineHeight: '28px',
    textAlign: 'center',
  },
  userBubble: {
    backgroundColor: '#1B2A4A',
    borderRadius: '12px 12px 2px 12px',
    padding: '10px 14px',
    maxWidth: '240px',
  },
  assistantBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: '2px 12px 12px 12px',
    padding: '10px 14px',
    maxWidth: '240px',
  },
  messageText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'inherit',
    whiteSpace: 'pre-wrap',
  },
  thinkingDots: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    padding: '2px 0',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#737373',
    animation: 'dotPulse 1.4s ease-in-out infinite',
    display: 'inline-block',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e5e5e5',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'none',
    color: '#1B2A4A',
    outline: 'none',
    lineHeight: '1.5',
  },
  sendBtn: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    backgroundColor: '#F18479',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  previewPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  addressBar: {
    height: '44px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e5e5e5',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: '8px',
    flexShrink: 0,
  },
  addressText: {
    flex: 1,
    fontSize: '12px',
    color: '#737373',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '4px',
    padding: '4px 10px',
  },
  iconBtn: {
    width: '30px',
    height: '30px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: '#ffffff',
  },
};
