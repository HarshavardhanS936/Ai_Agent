import { MessageSquarePlus, Database } from 'lucide-react';
import api from '../api/axios';

function Sidebar({ isOpen, closeSidebar, currentSessionId, setCurrentSessionId }) {

    // Logic for new chat - Generate ID and close sidebar on mobile
    const handleNewChat = () => {
        setCurrentSessionId(Date.now().toString());
        if (window.innerWidth <= 768) closeSidebar();
    };
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

        <div style={{ padding: '1rem', borderTop: '1px solid #334155', marginTop: 'auto' }}>
            <a href="/db" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                <Database size={16} />
                View Database
            </a>
        </div>
    </div>
);
}

export default Sidebar;
