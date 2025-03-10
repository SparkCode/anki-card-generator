import React, { useState, useEffect } from 'react';
import APIKeyModal from './components/APIKeyModal';
import WordForm from './components/WordForm';
import CardDisplay from './components/CardDisplay';
import ChatHistory from './components/ChatHistory';
import CreateCardModal from './components/CreateCardModal';
import { generateAnkiCard } from './services/OpenRouterService';
import { guiAddCards, getDecks } from './services/AnkiService';
import { hasApiKey, addChatHistoryEntry, getApiKey, setLocalStorageItem, getLocalStorageItem } from './utils/localStorage';
import './App.css';

function App() {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [currentWord, setCurrentWord] = useState(''); // eslint-disable-line no-unused-vars
  const [showSettings, setShowSettings] = useState(false);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [cardCreationSuccess, setCardCreationSuccess] = useState(null);
  
  // Function to directly open Anki UI with card content
  const openAnkiCardUI = async (content) => {
    try {
      // Get the default deck from localStorage or use a default one
      const defaultDeck = getLocalStorageItem('lastSelectedDeck');
      
      if (!defaultDeck) {
        // If no default deck is set, try to get available decks and use the first one
        const decks = await getDecks();
        if (decks && decks.length > 0) {
          await guiAddCards(decks[0], content);
        } else {
          console.error('No decks available in Anki');
          alert('No decks available in Anki. Please create a deck first.');
        }
      } else {
        // Use the default deck
        await guiAddCards(defaultDeck, content);
      }
    } catch (err) {
      console.error('Error opening Anki UI:', err);
      alert(`Failed to open Anki UI: ${err.message || 'Unknown error'}`);
    }
  };
  
  // Expose the function globally so it can be called from external scripts
  useEffect(() => {
    window.openAnkiCardUI = openAnkiCardUI;
    
    // Cleanup when component unmounts
    return () => {
      delete window.openAnkiCardUI;
    };
  }, []);

  // Check if API key exists when the component mounts
  useEffect(() => {
    if (!hasApiKey()) {
      setApiKeyModalOpen(true);
    }
  }, []);

  const handleApiKeySave = () => {
    setApiKeyModalOpen(false);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleUpdateApiKey = () => {
    setApiKeyModalOpen(true);
  };

  const handleFormSubmit = async (word, context) => {
    setIsLoading(true);
    setError('');
    setCardContent('');
    setCurrentWord(word);
    
    try {
      const result = await generateAnkiCard(word, context);
      setCardContent(result.content);
      
      // Save to chat history
      addChatHistoryEntry({
        word,
        context,
        response: result.content,
        usage: result.usage
      });
    } catch (err) {
      setError(err.message || 'Failed to generate card');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryItemClick = (item) => {
    setCurrentWord(item.word);
    setCardContent(item.response);
  };

  const handleCardCreationSuccess = (noteId, deckName) => {
    setCardCreationSuccess({
      noteId,
      deckName,
      timestamp: new Date().toISOString()
    });
    
    // Store the creation info in local storage as well
    const creationInfo = {
      noteId,
      deckName,
      word: currentWord,
      timestamp: new Date().toISOString()
    };
    
    const createdCards = JSON.parse(localStorage.getItem('createdAnkiCards') || '[]');
    createdCards.push(creationInfo);
    setLocalStorageItem('createdAnkiCards', createdCards);
    
    // Show success message for 5 seconds
    setTimeout(() => {
      setCardCreationSuccess(null);
    }, 5000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔤 Anki Card Generator</h1>
        <button 
          className="settings-button"
          onClick={handleOpenSettings}
        >
          ⚙️
        </button>
      </header>

      <main className="App-main">
        <section className="input-section">
          <WordForm 
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
          
          {error && (
            <div className="error-message global-error">
              {error}
            </div>
          )}
        </section>

        <section className="output-section">
          <CardDisplay 
            content={cardContent}
            isLoading={isLoading}
            onOpenInAnkiUI={openAnkiCardUI}
          />
          
          {cardCreationSuccess && (
            <div className="success-message">
              <p>Card successfully created in deck "{cardCreationSuccess.deckName}"</p>
            </div>
          )}
        </section>

        <section className="history-section">
          <ChatHistory onHistoryItemClick={handleHistoryItemClick} />
        </section>
      </main>

      <APIKeyModal 
        isOpen={apiKeyModalOpen} 
        onSave={handleApiKeySave} 
      />
      
      <CreateCardModal
        isOpen={createCardModalOpen}
        onClose={() => setCreateCardModalOpen(false)}
        cardContent={cardContent}
        onSuccess={handleCardCreationSuccess}
      />

      {showSettings && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            <h2>Settings</h2>
            
            <div className="settings-section">
              <h3>API Key</h3>
              <p>Current API Key: {getApiKey() ? '••••••••' + getApiKey().slice(-4) : 'Not set'}</p>
              <button 
                className="button secondary"
                onClick={handleUpdateApiKey}
              >
                Update API Key
              </button>
            </div>
            
            <div className="settings-section">
              <h3>About</h3>
              <p>This app generates Anki flashcards using OpenRouter API to access Google Gemini 2.0 Flash.</p>
              <p>Your API key is stored only in your browser's local storage.</p>
            </div>
            
            <button 
              className="button primary close-button"
              onClick={handleCloseSettings}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="App-footer">
        <p>Made with ❤️ for language learners</p>
        <p>
          <a href="https://github.com/username/anki-card-generator" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
