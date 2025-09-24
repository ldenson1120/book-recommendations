import React, { useState, useRef, useEffect } from 'react';
import { Send, Book, Upload, Sparkles } from 'lucide-react';

const BookRecommendationApp = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your personal book recommendation assistant. Upload your reading list CSV file, and I'll give you personalized book suggestions based on your reading history and ratings. What kind of book are you in the mood for today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookData, setBookData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });

      const headers = rows[0];
      const books = rows.slice(1).filter(row => row.length > 1 && row[0]).map(row => {
        const book = {};
        headers.forEach((header, index) => {
          book[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
        });
        return book;
      });

      setBookData(books);
      setDataLoaded(true);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Great! I've loaded ${books.length} books from your reading list. Now I'm ready to give you personalized recommendations! What kind of book are you looking for?`
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I had trouble reading your file. Please make sure it's a CSV export from Google Sheets."
      }]);
    }
  };

  const generateRecommendation = async (userMessage) => {
    if (!dataLoaded) {
      return "Please upload your book data first so I can give you personalized recommendations!";
    }

    const prompt = `You are a book recommendation assistant. Based on this user's reading history and request, provide 2-3 specific book recommendations.

User's Reading Data: ${JSON.stringify(bookData.slice(0, 50), null, 2)}

User Request: "${userMessage}"

Provide recommendations with:
1. Title and Author
2. Why it matches their taste
3. Connection to their reading history

Keep it concise and compelling.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      return "I'm having trouble connecting right now. Try looking for books similar to your highest-rated ones!";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const recommendation = await generateRecommendation(userMessage);
    
    setMessages(prev => [...prev, { role: 'assistant', content: recommendation }]);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f3e8ff 0%, #dbeafe 100%)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f3e8ff', padding: '8px', borderRadius: '8px' }}>
            <Book size={24} color="#9333ea" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>BookBot</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Your Personal Reading Companion</p>
          </div>
          {!dataLoaded && (
            <label style={{ 
              marginLeft: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#3b82f6', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              border: 'none'
            }}>
              <Upload size={16} />
              Upload CSV File
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          )}
          {dataLoaded && (
            <div style={{ 
              marginLeft: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '14px', 
              color: '#059669', 
              background: '#ecfdf5', 
              padding: '4px 12px', 
              borderRadius: '20px' 
            }}>
              <Sparkles size={16} />
              {bookData?.length} books loaded
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1024px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((message, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '768px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: message.role === 'user' ? '#3b82f6' : 'white',
                color: message.role === 'user' ? 'white' : 'black',
                boxShadow: message.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                marginLeft: message.role === 'user' ? '48px' : '0',
                marginRight: message.role === 'assistant' ? '48px' : '0'
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'white', padding: '12px 16px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginRight: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #9333ea', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Finding perfect books for you...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={dataLoaded ? "What kind of book are you in the mood for?" : "Upload your reading list first!"}
              disabled={!dataLoaded}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '12px 16px',
                minHeight: '44px',
                maxHeight: '120px',
                outline: 'none',
                background: dataLoaded ? 'white' : '#f9fafb',
                color: dataLoaded ? 'black' : '#9ca3af'
              }}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !dataLoaded || isLoading}
              style={{
                background: (!input.trim() || !dataLoaded || isLoading) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                cursor: (!input.trim() || !dataLoaded || isLoading) ? 'not-allowed' : 'pointer',
                flexShrink: 0
              }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BookRecommendationApp;