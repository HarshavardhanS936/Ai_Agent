import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    // Generate initial session ID if needed, or handle it in Sidebar
    if (!currentSessionId) {
      setCurrentSessionId(Date.now().toString());
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <>
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
        currentSessionId={currentSessionId}
        setCurrentSessionId={setCurrentSessionId}
      />

      <div className="main-chat">


        <ChatArea
          currentSessionId={currentSessionId}
          key={currentSessionId} // Remount chat area when session changes
        />
      </div>
    </>
  );
}

export default App;
