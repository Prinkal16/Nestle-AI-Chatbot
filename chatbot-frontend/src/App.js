import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

const BOT_NAME = 'NestleBot';
const BOT_ICON = '🤖';

// const API_URL = "https://nestle-ai-chatbot-backend-dncveraeftgqbqbp.canadacentral-01.azurewebsites.net"
const API_URL = process.env.BACKEND_URL;
console.log("API URL:", API_URL);
// const API_URL = "http://localhost:5000";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I am NestleBot. How can I help you?' },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userMessage },
      { sender: 'bot', text: 'Typing...' },
    ]);

    fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    })
      .then(res => res.json())
      .then(data => {
        console.log("📦 Backend response:", data); // 🔍 For debugging

        setMessages(prev => {
          const msgs = [...prev];
          msgs.pop(); // remove 'Typing...'

          const newMsgs = [{ sender: 'bot', text: data.reply }];

          if (data.graphContext) {
            newMsgs.push({
              sender: 'bot',
              text: `📘 Related info from graph: ${data.graphContext}`,
            });
          }

          if (Array.isArray(data.sourceDocs) && data.sourceDocs.length > 0) {
            data.sourceDocs.forEach((doc, idx) => {
              const source = doc.metadata?.source;
              if (source) {
                newMsgs.push({
                  sender: 'bot',
                  text: `🔗 Source ${idx + 1}: [${source}](${source})`,
                });
              }
            });
          }

          return [...msgs, ...newMsgs];
        });
      })

      .catch(() => {
        setMessages(prev => {
          const msgs = [...prev];
          msgs.pop(); // remove 'Typing...'
          return [...msgs, {
            sender: 'bot',
            text: '⚠️ Error connecting to backend.',
          }];
        });
      });
  };

  return (
    <>
      {/* Chat icon */}
      <div
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          backgroundColor: '#0b72b9',
          borderRadius: '50%',
          width: 60,
          height: 60,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: 18,
          userSelect: 'none',
        }}
        title="Open Chat"
      >
        {BOT_ICON}
      </div>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            width: 350,
            height: 500,
            backgroundColor: 'white',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#0b72b9',
              color: 'white',
              padding: '10px',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {BOT_NAME}
          </div>
          <div
            style={{
              flex: 1,
              padding: 10,
              overflowY: 'auto',
              backgroundColor: '#f7f7f7',
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  textAlign: msg.sender === 'user' ? 'right' : 'left',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 15,
                    backgroundColor: msg.sender === 'user' ? '#0b72b9' : '#e0e0e0',
                    color: msg.sender === 'user' ? 'white' : 'black',
                    maxWidth: '75%',
                    wordWrap: 'break-word',
                  }}
                >
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => {
                        if (!props.children || props.children.length === 0) return null;

                        return (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0b72b9', textDecoration: 'underline' }}
                          >
                            {props.children}
                          </a>
                        );
                      },
                      img: () => null,
                      // img: ({ node, ...props }) => (
                      //   <img {...props} alt="img" style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '8px' }} />
                      // )
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #ddd' }}>
            <input
              style={{ flex: 1, padding: 10, border: 'none' }}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={e => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                backgroundColor: '#0b72b9',
                color: 'white',
                border: 'none',
                padding: '0 20px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
