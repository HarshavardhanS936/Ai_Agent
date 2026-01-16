import { useState, useEffect } from 'react';
import { MessageSquarePlus, Trash2, Database, MessageSquare } from 'lucide-react';
import axios from 'axios';

function Sidebar({ isOpen, closeSidebar, currentSessionId, setCurrentSessionId }) {
    const [sessions, setSessions] = useState([]);

    const fetchSessions = async () => {
        try {
            const res = await axios.get('/api/sessions');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to load sessions", err);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [currentSessionId]); // Reload when session changes (e.g. new chat)

    const handleNewChat = () => {
        setCurrentSessionId(Date.now().toString());
        if (window.innerWidth <= 768) closeSidebar();
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;

        try {
            await axios.post('/clear_history', { sessionId: id });
            if (id === currentSessionId) {
                handleNewChat();
            } else {
                fetchSessions();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelect = (id) => {
        setCurrentSessionId(id);
        if (window.innerWidth <= 768) closeSidebar();
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="brand">
                    <div style={{ background: '#3b82f6', padding: 4, borderRadius: 4 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5c0-5 5-5 10-5 0 5-5 5-5 5s-5-5-5-5-5-5-5-5Z" />
                        </svg>
                    </div>
                    Harsha's AI
                </div>
            </div>

            <button className="new-chat-btn" onClick={handleNewChat}>
                <MessageSquarePlus size={20} />
                New Chat
            </button>

            <div className="session-list">
                {sessions.map(session => (
                    <div
                        key={session.id}
                        className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                        onClick={() => handleSelect(session.id)}
                    >
                        <div className="session-preview">
                            <MessageSquare size={16} />
                            {session.preview}
                        </div>
                        <button className="delete-btn" onClick={(e) => handleDelete(e, session.id)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid #334155' }}>
                <a href="/db" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                    <Database size={16} />
                    View Database
                </a>
            </div>
        </div>
    );
}

export default Sidebar;
