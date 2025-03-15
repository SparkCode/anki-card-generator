import React, { useState, useEffect } from 'react';
import APISettingsModal from './components/APISettingsModal';
import WordForm from './components/WordForm';
import CardDisplay from './components/CardDisplay';
import ChatHistory from './components/ChatHistory';
import CreateCardModal from './components/CreateCardModal';
import LanguageSelector from './components/LanguageSelector';
import EnglishLevelSelector from './components/EnglishLevelSelector';
import { generateAnkiCard } from './services/OpenRouterService';
import { guiAddCards, getDecks, storeAudioData } from './services/AnkiService';
import { fetchWordInfo, extractPronunciationInfo } from './services/DictionaryService'; 
import { hasApiKey, addChatHistoryEntry, getApiKey, setLocalStorageItem, getLocalStorageItem } from './utils/localStorage';
import { hasOpenAIApiKey, generateExampleAudio } from './services/TtsService';
import './App.css';
const { extractAiExampleSentence } = require('./utils/extractors');

function App() {
  const [apiSettingsModalOpen, setApiSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [currentWord, setCurrentWord] = useState(''); 
  const [currentContext, setCurrentContext] = useState('');
  const [currentDeck, setCurrentDeck] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [cardCreationSuccess, setCardCreationSuccess] = useState(null);
  const [enableTts, setEnableTts] = useState(getLocalStorageItem('enableTts') !== false); // Default to true
  const [selectedLanguage, setSelectedLanguage] = useState(
    getLocalStorageItem('userNativeLanguage') || 'Russian'
  );
  const [selectedEnglishLevel, setSelectedEnglishLevel] = useState(
    getLocalStorageItem('userEnglishLevel') || 'B2 preferably (maybe C1)'
  );
  
  // Function to directly open Anki UI with card content
  const openAnkiCardUI = async (content) => {
    try {
      // Get the default deck from localStorage or use a default one
      const defaultDeck = getLocalStorageItem('lastSelectedDeck');
      
      // Try to get stored pronunciation info for the current word
      let pronunciationInfo = null;
      let ttsAudioFilename = null;
      
      if (currentWord) {
        const storedDictData = getLocalStorageItem(`dictData_${currentWord}`);
        if (storedDictData) {
          pronunciationInfo = {
            ...storedDictData.pronunciationInfo,
            ttsAudioFilename: storedDictData.ttsAudioFilename
          };
        }
      }
      
      if (!defaultDeck) {
        // If no default deck is set, try to get available decks and use the first one
        const decks = await getDecks();
        if (decks && decks.length > 0) {
          await guiAddCards(decks[0], content, false, pronunciationInfo);
        } else {
          console.error('No decks available in Anki');
          alert('No decks available in Anki. Please create a deck first.');
        }
      } else {
        // Use the default deck
        await guiAddCards(defaultDeck, content, false, pronunciationInfo);
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
      setApiSettingsModalOpen(true);
    }
  }, []);

  const handleApiSettingsSave = () => {
    setApiSettingsModalOpen(false);
    setShowApiSettings(false); // Close the API settings section if it's open within settings modal
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setShowApiSettings(false); // Also reset the API settings view when closing settings
  };
  
  const handleToggleTts = () => {
    const newValue = !enableTts;
    setEnableTts(newValue);
    setLocalStorageItem('enableTts', newValue);
  };

  const handleUpdateApiSettings = () => {
    if (showSettings) {
      // If settings modal is open, show API settings within it
      setShowApiSettings(true);
    } else {
      // Otherwise open the standalone API settings modal
      setApiSettingsModalOpen(true);
    }
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setLocalStorageItem('userNativeLanguage', language);
  };

  const handleEnglishLevelSelect = (level) => {
    setSelectedEnglishLevel(level);
    setLocalStorageItem('userEnglishLevel', level);
  };
  
  // Extract example sentence from dictionary data
  const extractExampleSentence = (dictionaryData) => {
    if (!dictionaryData || !dictionaryData.definition || !dictionaryData.definition.length) {
      return null;
    }
    
    // Look through all definitions for examples
    for (const def of dictionaryData.definition) {
      if (def.example && def.example.length > 0) {
        // Return the first example that has enough words (at least 4)
        for (const example of def.example) {
          if (example.text && example.text.split(' ').length >= 4) {
            return example.text;
          }
        }
      }
    }
    
    return null;
  };
  
  // Extract example sentence from AI-generated card content is now imported from utils/extractors.js
  
  // Generate TTS audio for a sentence
  const generateTtsAudio = async (word, sentence) => {
    if (!hasOpenAIApiKey() || !enableTts || !sentence) {
      return null;
    }
    
    try {
      console.log('Generating TTS audio for:', sentence);
      const { filename, audioData } = await generateExampleAudio(word, sentence);
      
      // Store in Anki
      await storeAudioData(audioData, filename);
      
      // Create a blob URL for playback in the browser
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      
      console.log('TTS audio generated successfully as:', filename);
      return {
        filename,
        previewUrl: audioBlobUrl,
        success: true
      };
    } catch (error) {
      console.error('Failed to generate TTS audio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const handleFormSubmit = async (word, context, selectedDeck) => {
    setIsLoading(true);
    setError('');
    setCardContent('');
    setCurrentWord(word);
    setCurrentContext(context);
    setCurrentDeck(selectedDeck);
    
    try {
      // First, try to fetch dictionary data for the word
      let pronunciationInfo = null;
      let exampleSentence = null;
      let ttsAudioFilename = null;
      
      let dictionaryData = null;
      try {
        dictionaryData = await fetchWordInfo(word);
        pronunciationInfo = extractPronunciationInfo(dictionaryData);
        
        // Extract example sentence for TTS
        exampleSentence = extractExampleSentence(dictionaryData);
      } catch (dictError) {
        // If dictionary lookup fails, just log it and continue without pronunciation info
        console.warn('Dictionary lookup failed:', dictError);
        // Don't throw the error as we still want to generate the card
      }
      
      // Generate the card with the pronunciation info if available
      const result = await generateAnkiCard(word, context, selectedLanguage, selectedEnglishLevel, pronunciationInfo);
      setCardContent(result.content);
      
      // Extract example sentence from the AI-generated card (this is preferred over dictionary)
      const aiExampleSentence = extractAiExampleSentence(result.content);
      if (aiExampleSentence) {
        exampleSentence = aiExampleSentence;
      }
      
      // Generate TTS audio if enabled
      let ttsPreviewUrl = null;
      let attemptedTts = false;
      let ttsGeneratedSuccessfully = false;
      if (exampleSentence && enableTts && hasOpenAIApiKey()) {
        attemptedTts = true; // Mark that we attempted to generate TTS
        const ttsResult = await generateTtsAudio(word, exampleSentence);
        if (ttsResult && ttsResult.success) {
          ttsAudioFilename = ttsResult.filename;
          ttsPreviewUrl = ttsResult.previewUrl;
          ttsGeneratedSuccessfully = true;
        }
      }
      
      // Store the dictionary data in localStorage for later use
      setLocalStorageItem(`dictData_${word}`, {
        data: dictionaryData,
        pronunciationInfo: {
          ...pronunciationInfo,
          attemptedTts: attemptedTts,
          ttsGeneratedSuccessfully: ttsGeneratedSuccessfully
        },
        exampleSentence,
        ttsAudioFilename,
        // Don't store blob URLs in localStorage as they don't persist between sessions
        // Instead we'll keep track of whether audio generation succeeded
        timestamp: Date.now()
      });
      
      // Save to chat history with the pronunciation info (also don't store blob URLs)
      addChatHistoryEntry({
        word,
        context,
        deck: selectedDeck,
        nativeLanguage: selectedLanguage,
        englishLevel: selectedEnglishLevel,
        response: result.content,
        pronunciationInfo,
        exampleSentence,
        ttsAudioFilename,
        usage: result.usage
      });
      
      // Store the selected deck for future use
      setLocalStorageItem('lastSelectedDeck', selectedDeck);
    } catch (err) {
      setError(err.message || 'Failed to generate card');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerateCard = async () => {
    if (!currentWord) return;
    
    setIsLoading(true);
    setError('');
    setCardContent('');
    
    try {
      // First, check if we already have dictionary data for this word
      let pronunciationInfo = null;
      let exampleSentence = null;
      let ttsAudioFilename = null;
      let dictionaryData = null;
      const storedDictData = getLocalStorageItem(`dictData_${currentWord}`);
      
      if (storedDictData) {
        pronunciationInfo = {
          ...storedDictData.pronunciationInfo,
          ttsAudioFilename: storedDictData.ttsAudioFilename
        };
        exampleSentence = storedDictData.exampleSentence;
        ttsAudioFilename = storedDictData.ttsAudioFilename;
        dictionaryData = storedDictData.data;
      } 
      
      // If no stored data, fetch dictionary data
      if (!storedDictData) {
        try {
          dictionaryData = await fetchWordInfo(currentWord);
          pronunciationInfo = extractPronunciationInfo(dictionaryData);
          exampleSentence = extractExampleSentence(dictionaryData);
        } catch (dictError) {
          console.warn('Dictionary lookup failed during regeneration:', dictError);
          // Continue without additional info
        }
      }
      
      // Generate the card with pronunciation info if available
      const result = await generateAnkiCard(currentWord, currentContext, selectedLanguage, selectedEnglishLevel, pronunciationInfo);
      setCardContent(result.content);
      
      // Extract example sentence from the AI-generated card (this is preferred over dictionary)
      const aiExampleSentence = extractAiExampleSentence(result.content);
      if (aiExampleSentence) {
        exampleSentence = aiExampleSentence;
      }
      
      // Generate TTS audio if enabled and not already available, or if we have a new AI example
      let ttsPreviewUrl = null;
      let attemptedTts = pronunciationInfo?.attemptedTts || false;
      if (exampleSentence && enableTts && hasOpenAIApiKey() && 
          (aiExampleSentence || !ttsAudioFilename)) {
        attemptedTts = true;
        const ttsResult = await generateTtsAudio(currentWord, exampleSentence);
        if (ttsResult && ttsResult.success) {
          ttsAudioFilename = ttsResult.filename;
          ttsPreviewUrl = ttsResult.previewUrl;
        }
      }
      
      // Store for future use
      setLocalStorageItem(`dictData_${currentWord}`, {
        data: dictionaryData,
        pronunciationInfo: {
          ...pronunciationInfo,
          attemptedTts: attemptedTts,
          ttsGeneratedSuccessfully: !!ttsAudioFilename
        },
        exampleSentence,
        ttsAudioFilename,
        // Don't store blob URLs as they aren't valid across sessions
        timestamp: Date.now()
      });
      
      // Save to chat history with pronunciation info
      addChatHistoryEntry({
        word: currentWord,
        context: currentContext,
        deck: currentDeck,
        nativeLanguage: selectedLanguage,
        englishLevel: selectedEnglishLevel,
        response: result.content,
        pronunciationInfo,
        exampleSentence,
        ttsAudioFilename,
        usage: result.usage
      });
    } catch (err) {
      setError(err.message || 'Failed to regenerate card');
      console.error('Error regenerating card:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryItemClick = (item) => {
    setCurrentWord(item.word);
    setCurrentContext(item.context || '');
    setCurrentDeck(item.deck || '');
    setCardContent(item.response);
    
    // If englishLevel is available in history item, set it
    if (item.englishLevel) {
      setSelectedEnglishLevel(item.englishLevel);
      setLocalStorageItem('userEnglishLevel', item.englishLevel);
    }
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
        <h1>📝 Anki Card Generator</h1>
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
            onRegenerate={handleRegenerateCard}
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

      {/* Standalone API settings modal (used when first loading app or when settings modal is not open) */}
      {apiSettingsModalOpen && !showSettings && (
        <APISettingsModal 
          isOpen={true}
          onSave={handleApiSettingsSave} 
        />
      )}
      
      <CreateCardModal
        isOpen={createCardModalOpen}
        onClose={() => setCreateCardModalOpen(false)}
        cardContent={cardContent}
        onSuccess={handleCardCreationSuccess}
        word={currentWord}
      />

      {showSettings && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            {!showApiSettings ? (
              <>
                <h2>Settings</h2>
                
                <div className="settings-section">
                  <h3>API Settings</h3>
                  <p>OpenRouter API Key: {getApiKey() ? '••••••••' + getApiKey().slice(-4) : 'Not set'}</p>
                  <p>OpenAI API Key: {hasOpenAIApiKey() ? '••••••••' : 'Not set'}</p>
                  <button 
                    className="button secondary"
                    onClick={handleUpdateApiSettings}
                  >
                    Manage API Keys
                  </button>
                </div>
                
                <div className="settings-section">
                  <h3>Text-to-Speech</h3>
                  <div className="setting-toggle">
                    <label htmlFor="tts-toggle">Generate example audio using OpenAI TTS</label>
                    <input
                      id="tts-toggle"
                      type="checkbox"
                      checked={enableTts}
                      onChange={handleToggleTts}
                    />
                  </div>
                  <p className="help-text">
                    When enabled, the app will generate audio for example sentences using OpenAI's text-to-speech.
                    {!hasOpenAIApiKey() && enableTts && (
                      <span className="warning-text"> OpenAI API key is required for this feature.</span>
                    )}
                  </p>
                </div>
                
                <div className="settings-section">
                  <h3>Language Preferences</h3>
                  <p>Select your native language for card translations:</p>
                  <LanguageSelector
                    selectedLanguage={selectedLanguage}
                    onLanguageSelect={handleLanguageSelect}
                    showLabel={false}
                  />
                </div>
                
                <div className="settings-section">
                  <h3>English Level</h3>
                  <p>Specify your English proficiency level:</p>
                  <EnglishLevelSelector
                    selectedLevel={selectedEnglishLevel}
                    onLevelSelect={handleEnglishLevelSelect}
                    showLabel={false}
                  />
                </div>
                
                <div className="settings-section">
                  <h3>About</h3>
                  <p>This app generates Anki flashcards using OpenRouter API to access Google Gemini 2.0 Flash.</p>
                  <p>Your API keys are stored only in your browser's local storage.</p>
                </div>
                
                <button 
                  className="button primary close-button"
                  onClick={handleCloseSettings}
                >
                  Close
                </button>
              </>
            ) : (
              <div className="api-settings-container">
                <h2>API Settings</h2>
                <APISettingsModal 
                  isOpen={true}
                  onSave={handleApiSettingsSave}
                  embedded={true}
                />
                <button 
                  className="button secondary back-button"
                  onClick={() => setShowApiSettings(false)}
                >
                  Back to Settings
                </button>
              </div>
            )}
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
