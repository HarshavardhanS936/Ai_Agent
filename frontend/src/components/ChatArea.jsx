import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Mic, MicOff, Volume2, VolumeX, FileText } from 'lucide-react';
import api from '../api/axios';
import { marked } from 'marked';

import botAvatar from '../assets/bot.svg';

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
        }, 15);
        return () => clearInterval(timer);
    }, [text]);

    const content = text.slice(0, displayLength);
    return <div dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />;
};

function ChatArea({ currentSessionId }) {
    const [messages, setMessages] = useState([]);
    const [inputObj, setInputObj] = useState({ text: '', file: null, preview: null, fileType: null });
    const [loading, setLoading] = useState(false);
    const [modelUsed, setModelUsed] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [speechEnabled, setSpeechEnabled] = useState(false);

    const [isDragging, setIsDragging] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        loadHistory();
    }, [currentSessionId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, modelUsed]);

    // Handle Drag and Drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = (file) => {
        if (!file) return;
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setInputObj(prev => ({ ...prev, file, preview: ev.target.result, fileType: 'image' }));
            };
            reader.readAsDataURL(file);
        } else if (fileType === 'application/pdf') {
            setInputObj(prev => ({ ...prev, file, preview: null, fileType: 'pdf' }));
        }
    };

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputObj(prev => ({ ...prev, text: prev.text + ' ' + transcript }));
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    // Stop speech when component unmounts or sessionId changes
    useEffect(() => {
        // KILL ALL SPEECH on first load
        window.speechSynthesis.cancel();

        // Kill speech when tab is closed/refreshed
        const killSpeech = () => window.speechSynthesis.cancel();
        window.addEventListener('beforeunload', killSpeech);

        return () => {
            window.speechSynthesis.cancel();
            window.removeEventListener('beforeunload', killSpeech);
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    // Stop speech specifically when session changes
    useEffect(() => {
        window.speechSynthesis.cancel();
    }, [currentSessionId]);

    // Cleanup speech if disabled manually
    useEffect(() => {
        if (!speechEnabled) {
            window.speechSynthesis.cancel();
        }
    }, [speechEnabled]);

    const cleanTextForSpeech = (text) => {
        if (!text) return '';

        return text
            // 1. Remove large code blocks first
            .replace(/```[\s\S]*?```/g, ' ')
            // 2. Remove URLs/Links but keep the text
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            // 3. Remove all markdown symbols (*, _, #, ~, `, >)
            .replace(/[\*_#~`>]/g, ' ')
            // 4. Remove list markers (bullet points, numberings at start of lines)
            .replace(/^\s*[\-\*\d\.]+\s+/gm, ' ')
            // 5. Replace multiple spaces/newlines with a single space for smooth speech
            .replace(/\s+/g, ' ')
            // 6. Final trim
            .trim();
    };

    const speak = (text) => {
        if (!speechEnabled) return;
        window.speechSynthesis.cancel();

        const cleanedText = cleanTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            // Cancel current speech before listening to avoid the AI "hearing" itself
            window.speechSynthesis.cancel();
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const loadHistory = async () => {
        try {
            const res = await api.get(`/api/history/${currentSessionId}`);
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
        processFile(file);
    };

    const clearFile = () => {
        setInputObj(prev => ({ ...prev, file: null, preview: null, fileType: null }));
    };

    const handleSend = async () => {
        if (!inputObj.text.trim() && !inputObj.file) return;

        const userMsg = {
            role: 'user',
            content: inputObj.text,
            image_url: inputObj.fileType === 'image' ? inputObj.preview : null,
            file_name: inputObj.fileType === 'pdf' ? inputObj.file.name : null,
            animate: false
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setModelUsed(null);

        const formData = new FormData();
        formData.append('message', inputObj.text);
        formData.append('sessionId', currentSessionId);
        if (inputObj.file) formData.append('image', inputObj.file);

        setInputObj({ text: '', file: null, preview: null, fileType: null });

        try {
            const res = await api.post('/chat', formData);

            const botMsg = {
                role: 'model',
                content: res.data.response,
                html_content: res.data.html_response,
                animate: true
            };

            setMessages(prev => [...prev, botMsg]);
            if (res.data.model_used) setModelUsed(res.data.model_used);

            if (speechEnabled) speak(res.data.response);

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
        <div
            className={`chat-interface ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="drag-overlay">
                    <div className="drag-overlay-content">
                        <ImageIcon size={48} color="var(--accent-color)" />
                        <p>Drop your images or PDFs here</p>
                    </div>
                </div>
            )}

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
                            {msg.file_name && (
                                <div className="file-preview-mini">
                                    <FileText size={16} />
                                    <span>{msg.file_name}</span>
                                </div>
                            )}

                            {msg.role === 'model' && msg.animate ? (
                                <TypewriterMsg
                                    text={msg.content}
                                    onComplete={() => { }}
                                />
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: msg.html_content || marked.parse(msg.content || '') }} />
                            )}

                            {msg.role === 'model' && (
                                <button
                                    className="msg-speak-btn"
                                    onClick={() => speak(msg.content)}
                                    title="Speak response"
                                >
                                    <Volume2 size={14} />
                                </button>
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
            </div>

            <div className="input-container">
                <div className="input-box">
                    {(inputObj.preview || inputObj.fileType === 'pdf') && (
                        <div style={{ position: 'relative', width: 'fit-content', marginBottom: 10 }}>
                            {inputObj.fileType === 'image' ? (
                                <img src={inputObj.preview} style={{ maxHeight: 80, borderRadius: 6, border: '1px solid #334155' }} />
                            ) : (
                                <div className="file-preview-card">
                                    <FileText size={24} />
                                    <span>{inputObj.file?.name}</span>
                                </div>
                            )}
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
                        <label className="icon-btn" title="Attach image or PDF">
                            <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
                            <ImageIcon size={20} className={inputObj.file ? "active-icon" : ""} />
                        </label>

                        <button
                            className={`icon-btn ${isListening ? 'listening' : ''}`}
                            onClick={toggleListening}
                            title={isListening ? "Listening..." : "Voice typing"}
                        >
                            {isListening ? <Mic size={20} color="#ef4444" /> : <Mic size={20} />}
                        </button>

                        <textarea
                            ref={inputRef}
                            value={inputObj.text}
                            onChange={e => setInputObj(prev => ({ ...prev, text: e.target.value }))}
                            onKeyDown={handleKeyDown}
                            placeholder={isListening ? "Listening..." : "Message Harsha..."}
                            rows={1}
                        />

                        <button
                            className={`icon-btn ${speechEnabled ? 'active-icon' : ''}`}
                            onClick={() => setSpeechEnabled(!speechEnabled)}
                            title={speechEnabled ? "Mute auto-speak" : "Enable auto-speak"}
                        >
                            {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>

                        <button
                            className="icon-btn send-btn"
                            onClick={handleSend}
                            disabled={!inputObj.text && !inputObj.file}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatArea;
