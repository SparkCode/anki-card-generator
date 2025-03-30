import React, { useState, useEffect, useRef } from 'react';
import { getChatHistory, clearChatHistory, deleteChatHistoryEntry } from '../utils/localStorage';
import './ChatHistory.css';

/**
 * Component to display chat history of previous card generations
 * @param {Object} props - Component props
 * @param {Function} props.onHistoryItemClick - Function to call when a history item is clicked
 */
const ChatHistory = ({ onHistoryItemClick }) => {
  const [historyItems, setHistoryItems] = useState(getChatHistory());
  const [newEntryId, setNewEntryId] = useState(null);
  
  // Reference to the history container for scrolling
  const historyContainerRef = useRef(null);
  
  // Refresh history when the component is mounted and when entries are added
  useEffect(() => {
    // Function to update history items from localStorage
    const refreshHistory = () => {
      setHistoryItems(getChatHistory());
    };
    
    // Handler for new history item event
    const handleHistoryUpdated = (event) => {
      refreshHistory();
      // Mark the new entry to highlight it
      if (event.detail && event.detail.id) {
        setNewEntryId(event.detail.id);
        // Remove the highlight after 3 seconds
        setTimeout(() => {
          setNewEntryId(null);
        }, 3000);
        
        // Scroll to top of the history container
        if (historyContainerRef.current) {
          setTimeout(() => {
            historyContainerRef.current.scrollTop = 0;
          }, 100); // Slight delay to ensure DOM is updated
        }
      }
    };
    
    // Set up event listener for storage changes
    window.addEventListener('storage', refreshHistory);
    
    // Custom event for when a new history item is added
    window.addEventListener('chatHistoryUpdated', handleHistoryUpdated);
    
    // Refresh on mount
    refreshHistory();
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('storage', refreshHistory);
      window.removeEventListener('chatHistoryUpdated', handleHistoryUpdated);
    };
  }, []);
  
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="chat-history empty">
        <div className="history-header">
          <h3>Chat History</h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="no-history">No previous card generations found.</p>
          <p className="empty-state-hint">
            When you generate cards, they'll appear here for quick access.
          </p>
        </div>
      </div>
    );
  }
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      clearChatHistory();
      setHistoryItems([]);
    }
  };
  
  const handleDeleteHistoryItem = (event, itemId) => {
    event.stopPropagation(); // Prevent triggering the item click
    deleteChatHistoryEntry(itemId);
    setHistoryItems(historyItems.filter(item => item.id !== itemId));
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return `today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <div className="chat-history" ref={historyContainerRef}>
      <div className="history-header">
        <h3>Chat History <span className="history-count">({historyItems.length})</span></h3>
        <button 
          className="button text-button"
          onClick={handleClearHistory}
        >
          Clear History
        </button>
      </div>
      
      <ul className="history-list">
        {historyItems.map((item) => (
          <li 
            key={item.id} 
            className={`history-item ${item.id === newEntryId ? 'history-item-new' : ''}`}
            onClick={() => onHistoryItemClick(item)}
          >
            <div className="history-item-word">{item.word}</div>
            <div className="history-item-meta">
              {item.deck && <span className="history-item-deck">{item.deck}</span>}
              {item.context && item.context.length > 0 && (
                <span className="history-item-context" title={item.context}>
                  {item.context.length > 30 ? item.context.substring(0, 30) + '...' : item.context}
                </span>
              )}
              <div className="history-item-details">
                <span className="history-item-date">{formatDate(item.timestamp)}</span>
              </div>
            </div>
            <button 
              className="history-item-delete"
              onClick={(e) => handleDeleteHistoryItem(e, item.id)}
              aria-label="Delete history item"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatHistory;
