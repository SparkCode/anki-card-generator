import React, { useState, useEffect, useRef, useCallback } from 'react';
import APISettingsModal from './components/APISettingsModal';
import WordForm from './components/WordForm';
import CardDisplay from './components/CardDisplay';
import ChatHistory from './components/ChatHistory';
import CreateCardModal from './components/CreateCardModal';
import SettingsModal from './components/SettingsModal';
import Modal from './components/Modal';
import { generateAnkiCard, DEFAULT_PROMPT_TEMPLATE } from './services/OpenAIChatService';
import { guiAddCards, getDecks, storeAudioData } from './services/AnkiService';
import { fetchWordInfo, extractPronunciationInfo } from './services/DictionaryService';
import {
  getApiKey, saveApiKey, hasApiKey,
  getChatHistory, addChatHistoryEntry, clearChatHistory, deleteChatHistoryEntry,
  getPromptTemplateFromStorage, savePromptTemplateToStorage,
  getLocalStorageItem, setLocalStorageItem
} from './utils/localStorage';
import { hasOpenAIApiKey, generateExampleAudio } from './services/TtsService';
import audioDB from './services/AudioDBService';
import './App.css';
const { extractAiExampleSentence } = require('./utils/extractors');

// Helper function to generate a consistent key for dictionary data
const generateDictDataKey = (sentence) => {
  if (!sentence) return null;
  // Use the sentence as the key instead of the word
  // Trim and lowercase for consistency
  return `dictData_${sentence.trim().toLowerCase()}`;
};

function App() {
  const [inputText, setInputText] = useState('');
  const [ankiCards, setAnkiCards] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiSettingsModalOpen, setApiSettingsModalOpen] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [error, setError] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [currentWord, setCurrentWord] = useState(''); 
  const [currentContext, setCurrentContext] = useState('');
  const [currentDeck, setCurrentDeck] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [cardCreationSuccess, setCardCreationSuccess] = useState(null);
  const [enableTts, setEnableTts] = useState(getLocalStorageItem('enableTts') !== false);
  const [selectedLanguage, setSelectedLanguage] = useState(getLocalStorageItem('userNativeLanguage') || 'Russian');
  const [selectedEnglishLevel, setSelectedEnglishLevel] = useState(getLocalStorageItem('userEnglishLevel') || 'Upper intermediate');
  const [ttsResult, setTtsResult] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);

  const chatHistoryRef = useRef(null);

  // Function to directly open Anki UI with card content
  const openAnkiCardUI = async (content) => {
    try {
      // Get the default deck from localStorage or use a default one
      const defaultDeck = getLocalStorageItem('lastSelectedDeck');
      
      // Try to get stored pronunciation info for the current word and example sentence
      let pronunciationInfo = null;
      
      // Look for dictionary data based on the extracted example sentence from the content
      const aiExampleSentence = extractAiExampleSentence(content);
      if (aiExampleSentence) {
        const dictKey = generateDictDataKey(aiExampleSentence);
        const storedDictData = getLocalStorageItem(dictKey);
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
    
    // Clean up old audio files (keep files from last 30 days)
    audioDB.cleanupOldFiles(30)
      .then(deletedCount => {
        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} old audio files`);
        }
      })
      .catch(err => console.error('Error cleaning up old audio files:', err));

    // Load prompt template
    const storedTemplate = getPromptTemplateFromStorage();
    setPromptTemplate(storedTemplate || DEFAULT_PROMPT_TEMPLATE);
  }, []);

  const handleApiSettingsSave = () => {
    setApiSettingsModalOpen(false);
    setShowApiSettings(false);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleToggleTts = () => {
    setEnableTts(!enableTts);
    setLocalStorageItem('enableTts', !enableTts);
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
    if (!sentence) {
      return null;
    }
    
    try {
      console.log('Generating TTS audio for:', sentence);
      
      const { filename, audioData } = await generateExampleAudio(word, sentence);
      
      // Store in Anki
      await storeAudioData(audioData, filename);
      
      // Create audio blob for playback
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      
      // Store in AudioDBService
      await audioDB.storeAudio(word, sentence, audioBlob);
      
      console.log('TTS audio generated successfully as:', filename, audioBlobUrl);
      
      // Store TTS data in localStorage to ensure CardDisplay can find it
      const dictKey = generateDictDataKey(sentence);
      setLocalStorageItem(dictKey, {
        ttsAudioFilename: filename,
        exampleSentence: sentence,
        word: word,
        ttsPreviewUrl: audioBlobUrl,
        pronunciationInfo: {
          ttsGeneratedSuccessfully: true,
          attemptedTts: true
        },
        timestamp: Date.now()
      });
      
      return {
        filename,
        previewUrl: audioBlobUrl,
        success: true,
        fromCache: false
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
    setTtsResult(null);
    
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
      const result = await generateAnkiCard(word, context, selectedLanguage, selectedEnglishLevel, pronunciationInfo, selectedDeck);
      setCardContent(result.content);
      
      // Extract example sentence from the AI-generated card (this is preferred over dictionary)
      const aiExampleSentence = extractAiExampleSentence(result.content);
      if (aiExampleSentence) {
        exampleSentence = aiExampleSentence;
      }
      
      // Generate TTS audio if enabled
      let attemptedTts = false;
      let ttsGeneratedSuccessfully = false;
      
      if (exampleSentence && enableTts) {
        attemptedTts = true; // Mark that we attempted to generate TTS
        const ttsResult = await generateTtsAudio(word, exampleSentence);
        setTtsResult(ttsResult);
        
        if (ttsResult && ttsResult.success) {
          ttsAudioFilename = ttsResult.filename;
          ttsGeneratedSuccessfully = true;
        }
      }
      
      // Store the dictionary data in localStorage using the sentence as the key
      if (exampleSentence) {
        setLocalStorageItem(generateDictDataKey(exampleSentence), {
          data: dictionaryData,
          pronunciationInfo: {
            ...pronunciationInfo,
            attemptedTts: attemptedTts,
            ttsGeneratedSuccessfully: ttsGeneratedSuccessfully
          },
          exampleSentence,
          ttsAudioFilename,
          word,
          timestamp: Date.now()
        });
      }
      
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
    setTtsResult(null);
    
    try {
      // First, check if we already have dictionary data for this word
      let pronunciationInfo = null;
      let exampleSentence = null;
      let ttsAudioFilename = null;
      let dictionaryData = null;
      
      // If no stored data, fetch dictionary data
      try {
        dictionaryData = await fetchWordInfo(currentWord);
        pronunciationInfo = extractPronunciationInfo(dictionaryData);
        exampleSentence = extractExampleSentence(dictionaryData);
      } catch (dictError) {
        console.warn('Dictionary lookup failed during regeneration:', dictError);
        // Continue without additional info
      }
      
      // Generate the card with pronunciation info if available
      const result = await generateAnkiCard(currentWord, currentContext, selectedLanguage, selectedEnglishLevel, pronunciationInfo, currentDeck);
      setCardContent(result.content);
      
      // Extract example sentence from the AI-generated card (this is preferred over dictionary)
      const aiExampleSentence = extractAiExampleSentence(result.content);
      if (aiExampleSentence) {
        exampleSentence = aiExampleSentence;
      }
      
      // Generate TTS audio if enabled and not already available, or if we have a new AI example
      let attemptedTts = pronunciationInfo?.attemptedTts || false;
      let ttsGeneratedSuccessfully = false;
      
      if (exampleSentence && enableTts) {
        attemptedTts = true;
        const ttsResult = await generateTtsAudio(currentWord, exampleSentence);
        setTtsResult(ttsResult);
        
        if (ttsResult && ttsResult.success) {
          ttsAudioFilename = ttsResult.filename;
          ttsGeneratedSuccessfully = true;
        }
      }
      
      // Update data in localStorage with the sentence as the key
      if (exampleSentence) {
        setLocalStorageItem(generateDictDataKey(exampleSentence), {
          data: dictionaryData,
          pronunciationInfo: {
            ...pronunciationInfo, 
            attemptedTts,
            ttsGeneratedSuccessfully
          },
          exampleSentence,
          ttsAudioFilename,
          word: currentWord,
          timestamp: Date.now()
        });
      }
      
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

  // Handler for prompt template change
  const handlePromptTemplateChange = (event) => {
    setPromptTemplate(event.target.value);
  };

  // Save the prompt template
  const handleSavePromptTemplate = () => {
    savePromptTemplateToStorage(promptTemplate);
    console.log("Prompt template saved.");
  };

  const handleResetPromptTemplate = () => {
    setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
    // Maybe save immediately or let user save explicitly
    // savePromptTemplateToStorage(DEFAULT_PROMPT_TEMPLATE);
  };

  const handleManageApiKeys = () => {
    setShowSettings(false);
    setShowApiSettings(true);
  };

  const handleConfirmClearHistory = () => {
    clearChatHistory();
    setModalContent(null);
  };

  const handleConfirmDeleteEntry = () => {
    if (entryToDelete) {
      deleteChatHistoryEntry(entryToDelete);
      setEntryToDelete(null);
    }
    setModalContent(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📝 Anki Card Generator</h1>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(true)}
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
            ttsResult={ttsResult}
          />
          
          {cardCreationSuccess && (
            <div className="success-message">
              <p>Card successfully created in deck "{cardCreationSuccess.deckName}"</p>
            </div>
          )}
        </section>

        <section className="history-section">
          <ChatHistory
            ref={chatHistoryRef}
            onHistoryItemClick={handleHistoryItemClick}
            onClearHistory={() => {
              setModalContent('confirmClear');
            }}
            onDeleteEntry={(id) => {
              setEntryToDelete(id);
              setModalContent('confirmDelete');
            }}
          />
        </section>
      </main>

      {/* Render the extracted SettingsModal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        onManageApiKeys={handleManageApiKeys}
        enableTts={enableTts}
        onToggleTts={handleToggleTts}
        selectedLanguage={selectedLanguage}
        onLanguageSelect={handleLanguageSelect}
        selectedEnglishLevel={selectedEnglishLevel}
        onLevelSelect={handleEnglishLevelSelect}
        promptTemplate={promptTemplate}
        onPromptTemplateChange={handlePromptTemplateChange}
        onSavePromptTemplate={handleSavePromptTemplate}
        onResetPromptTemplate={handleResetPromptTemplate}
      />

      {/* Separate API Settings Modal */}
      {showApiSettings && (
        <APISettingsModal
          isOpen={showApiSettings}
          onClose={() => setShowApiSettings(false)}
          onSave={handleApiSettingsSave}
        />
      )}

      {/* Other modals (CreateCard, Confirmations) */}
      {createCardModalOpen && (
         <CreateCardModal
            isOpen={createCardModalOpen}
            onClose={() => setCreateCardModalOpen(false)}
            cardContent={cardContent}
            onSuccess={handleCardCreationSuccess}
            word={currentWord}
          />
      )}

      {/* Confirmation Modals - Using modalContent state now */}
      {modalContent === 'confirmClear' && (
        <Modal onClose={() => setModalContent(null)}>
          <h2>Confirm Clear History</h2>
          <p>Are you sure you want to clear the entire chat history?</p>
          <button className="button danger" onClick={handleConfirmClearHistory}>Yes, Clear History</button>
          <button className="button secondary" onClick={() => setModalContent(null)}>Cancel</button>
        </Modal>
      )}

      {modalContent === 'confirmDelete' && (
        <Modal onClose={() => setModalContent(null)}>
          <h2>Confirm Delete Entry</h2>
          <p>Are you sure you want to delete this chat entry?</p>
          <button className="button danger" onClick={handleConfirmDeleteEntry}>Yes, Delete Entry</button>
          <button className="button secondary" onClick={() => setModalContent(null)}>Cancel</button>
        </Modal>
      )}

      <footer className="App-footer">
        <p>Made with ❤️ for language learners</p>
        <p>
          <a href="https://github.com/SparkCode/anki-card-generator" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
export { generateDictDataKey };
