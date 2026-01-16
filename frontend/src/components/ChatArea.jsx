import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { marked } from 'marked';

import botAvatar from '../assets/bot.svg'; // We might need to handle assets, but for now use text/emoji or inline SVG if missing

const TypewriterMsg = ({ text, onComplete }) => {
    const [displayLength, setDisplayLength] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setDisplayLength((prev) => {
                if (prev < text.length) return prev + 1;
                clearInterval(timer);
                onComplete && onComplete();
                return prev;
            });
        }, 15); // Adjust speed here (lower = faster)
        return () => clearInterval(timer);
    }, [text]);

    const content = text.slice(0, displayLength);
    return <div dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />;
};

function ChatArea({ currentSessionId }) {
    const [messages, setMessages] = useState([]);
    const [inputObj, setInputObj] = useState({ text: '', file: null, preview: null });
    const [loading, setLoading] = useState(false);
    const [modelUsed, setModelUsed] = useState(null);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        loadHistory();
    }, [currentSessionId]);

    useEffect(() => {
        // Auto-scroll logic could be improved to stick to bottom
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, modelUsed]); // Trigger on modelUsed too as it appears late

    const loadHistory = async () => {
        try {
            // First, check if clear history was just called (new chat)
            // If it's a new generated ID, it won't have history in DB
            // But the API handles empty returns fine.
            const res = await api.get(`/api/history/${currentSessionId}`);
            // History messages should NOT animate
            const historyMsgs = res.data.map(msg => ({
                ...msg,
                animate: false
            }));
            setMessages(historyMsgs);
        } catch (err) {
            console.error("Error loading chat", err);
        }
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setInputObj(prev => ({ ...prev, file, preview: ev.target.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const clearFile = () => {
        setInputObj(prev => ({ ...prev, file: null, preview: null }));
    };

    const handleSend = async () => {
        if (!inputObj.text.trim() && !inputObj.file) return;

        const userMsg = {
            role: 'user',
            content: inputObj.text, // User msg is plain text usually, but handle consistency
            image_url: inputObj.preview, // For optimistic UI
            animate: false
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setModelUsed(null);

        const formData = new FormData();
        formData.append('message', inputObj.text);
        formData.append('sessionId', currentSessionId);
        if (inputObj.file) formData.append('image', inputObj.file);

        // Clear input
        setInputObj({ text: '', file: null, preview: null });

        try {
            const res = await api.post('/chat', formData);

            const botMsg = {
                role: 'model',
                content: res.data.response, // Use RAW text for typewriter
                html_content: res.data.html_response, // Backup full HTML
                animate: true // Enable animation for this new message
            };

            setMessages(prev => [...prev, botMsg]);
            if (res.data.model_used) setModelUsed(res.data.model_used);

        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, something went wrong.", animate: false }]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-interface">
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="welcome-screen">
                        <h2>How can I help you today?</h2>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role === 'model' ? 'bot' : 'user'}`}>
                        <div className="avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="message-content">
                            {msg.image_url && (
                                <img src={msg.image_url} alt="User upload" className="message-image" />
                            )}

                            {msg.role === 'model' && msg.animate ? (
                                <TypewriterMsg
                                    text={msg.content}
                                    onComplete={() => {
                                        // Optional: Could update state to set animate: false to "finalize" it
                                        // But strictly not necessary unless resizing window re-triggers it (it won't with key=i)
                                    }}
                                />
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: msg.html_content || marked.parse(msg.content || '') }} />
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="message bot">
                        <div className="avatar">🤖</div>
                        <div className="message-content" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Loader2 className="animate-spin" size={16} />
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />

                {/* Toast */}
                {modelUsed && (
                    <div style={{
                        position: 'fixed', top: 20, right: 20,
                        background: 'rgba(30, 41, 59, 0.9)', color: 'white',
                        padding: '8px 16px', borderRadius: 20,
                        fontSize: '0.85rem', backdropFilter: 'blur(4px)',
                        animation: 'fadeIn 0.3s',
                        zIndex: 1000
                    }}>
                        Using: {modelUsed}
                    </div>
                )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="input-container">
                <div className="input-box">
                    {inputObj.preview && (
                        <div style={{ position: 'relative', width: 'fit-content' }}>
                            <img src={inputObj.preview} style={{ maxHeight: 80, borderRadius: 6, border: '1px solid #334155' }} />
                            <button
                                onClick={clearFile}
                                style={{
                                    position: 'absolute', top: -6, right: -6,
                                    background: '#ef4444', color: 'white',
                                    border: 'none', borderRadius: '50%',
                                    width: 20, height: 20, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <div className="input-row">
                        <label className="icon-btn" style={{ cursor: 'pointer' }}>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                            <ImageIcon size={20} className={inputObj.file ? "text-blue-500" : ""} />
                        </label>

                        <textarea
                            ref={inputRef}
                            value={inputObj.text}
                            onChange={e => setInputObj(prev => ({ ...prev, text: e.target.value }))}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Gemini..."
                            rows={1}
                        />

                        <button
                            className="icon-btn send-btn"
                            onClick={handleSend}
                            disabled={!inputObj.text && !inputObj.file}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: 10 }}>
                    Harsha's AI can make mistakes. Consider checking important information.
                </div>
            </div>
        </div>
    );
}

export default ChatArea;
