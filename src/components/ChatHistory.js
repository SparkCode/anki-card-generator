import React, { useState } from 'react';
import { getChatHistory, clearChatHistory, deleteChatHistoryEntry } from '../utils/localStorage';

/**
 * Component to display chat history of previous card generations
 * @param {Object} props - Component props
 * @param {Function} props.onHistoryItemClick - Function to call when a history item is clicked
 */
const ChatHistory = ({ onHistoryItemClick }) => {
  const [historyItems, setHistoryItems] = useState(getChatHistory());
  
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="chat-history empty">
        <h3>Chat History</h3>
        <p className="no-history">No previous card generations found.</p>
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
    <div className="chat-history">
      <div className="history-header">
        <h3>Chat History</h3>
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
            className="history-item"
            onClick={() => onHistoryItemClick(item)}
          >
            <div className="history-item-word">{item.word}</div>
            <div className="history-item-meta">
              {item.deck && <span className="history-item-deck">{item.deck}</span>}
              <div className="history-item-details">
                {item.englishLevel && (
                  <span className="history-item-level">
                    {item.englishLevel}
                  </span>
                )}
              </div>
              <span className="history-item-date">{formatDate(item.timestamp)}</span>
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
