# Anki Card Generator - Technical Context

## Technology Stack

### Frontend
- **React**: Main UI framework with functional components and hooks
- **CSS/SCSS**: Styling with both standard CSS and SCSS for component-specific styles
- **JavaScript/JSX**: Primary programming languages
- **ReactMarkdown**: For rendering markdown content in cards
- **react-syntax-highlighter**: For code syntax highlighting within markdown

### Backend Communication
- **AnkiConnect API**: Interface with Anki desktop application
- **OpenRouter API**: AI service for generating card content
- **fetch/Axios**: For making API requests (based on service structure)
- **Audio APIs**: For handling pronunciation and TTS functionality

### Data Storage
- **Local Storage**: Browser storage for:
  - User preferences and API keys (API_KEY_STORAGE_KEY)
  - Chat history with timestamps and unique IDs (CHAT_HISTORY_STORAGE_KEY)
  - Dictionary data and pronunciation information
  - Card-specific preferences and settings
  - Text-based metadata for sentences and pronunciations
  - References to audio files (not the audio files themselves)
- **IndexedDB**: For binary data storage:
  - TTS audio blobs stored by sentence text as normalized keys
  - Organized in 'audioFiles' store with indexes for cardId, createdAt, and text
  - Automatic cleanup mechanism for older audio files (default: 30 days)
- **BlobURLs**: For in-memory audio reference and playback during the current session

## Key Files and Directories

### Components
- `APIKeyModal.js`: For managing API keys securely
- `APISettingsModal.js`: For configuring API-related settings
- `CardDisplay.js`: Complex component for displaying, editing, and managing generated cards
- `ChatHistory.js`: Tracks conversation/generation history
- `CreateCardModal.js`: UI for creating new cards
- `DeckSelector.js`: For selecting Anki decks
- `EnglishLevelSelector.js`: For specifying English proficiency level
- `ExampleSentenceAudio.jsx`: For handling audio playback of example sentences
- `LanguageSelector.js`: For selecting learning languages
- `StandaloneExampleAudio.jsx`: Independent audio playback component
- `WordForm.js`: Form for inputting words/phrases to create cards for

### Services
- `AnkiService.js`: Service for communicating with Anki
- `AudioDBService.js`: Service for managing audio data and storage
- `DictionaryService.js`: Service for dictionary lookups and word information
- `OpenRouterService.js`: Service for interfacing with OpenRouter AI
- `TtsService.js`: Service for text-to-speech generation

### Utilities
- `extractors.js`: Functions for parsing and extracting specific data from content
- `localStorage.js`: Helper functions for working with browser storage

### Style Files
- `reset.css`: CSS reset for consistent styling
- `animations.css`/`animations.scss`: Animation definitions
- Component-specific SCSS files (e.g., `ExampleSentenceAudio.scss`)

### Supporting Files
- `anki-proxy.js`: Handles proxy communication with Anki
- `CORS-FIX.md`, `DIRECT-CONNECTION.md`: Documentation for handling connection issues

## Development Setup
This is a standard React application created with Create React App:

1. Dependencies managed via npm/yarn (package.json present)
2. Standard React scripts for development server, building, and testing
3. Testing infrastructure with Jest and testing utilities

## React Implementation Details

### Component Architecture
- Functional components with React hooks
- Composition pattern for complex UI elements
- Conditional rendering based on state
- Custom utility components (e.g., `AutosizeTextarea`)

### State Management
- React hooks for local state management:
  - `useState` for UI state
  - `useEffect` for side effects and lifecycle management
  - `useRef` for DOM references
- No global state management library detected (Redux, Context API)
- State passed through props between components

### Rendering Patterns
- Markdown rendering with `ReactMarkdown`
- Code syntax highlighting
- Dynamic content display based on parsing
- Conditional rendering for loading states and error handling

## Technical Requirements

### Anki Integration
- Requires AnkiConnect add-on installed in Anki
- Needs network communication between browser and Anki desktop app
- May require CORS handling or proxy setup (indicated by CORS-FIX.md)
- Parses specific card format with front/back delimitation

### AI Integration
- Requires OpenRouter API key
- Proper handling of API rate limits and quotas
- Expects specific output format for card generation

### Audio and Pronunciation Features
- TTS generation capabilities
- Audio playback for word pronunciations (US/UK variants)
- Blob URL handling for in-memory audio management
- Local storage of audio references

### Browser Requirements
- Modern browser with LocalStorage support
- JavaScript enabled
- Audio playback capabilities
- Network access to both Anki (localhost) and OpenRouter (internet)

## Storage Implementation Details

### LocalStorage Implementation
- Utility functions in `localStorage.js` handle all storage operations
- Automatic JSON parsing/stringification for object data
- Special handling for specific keys that require consistent formatting
- Helper functions for common operations (saveApiKey, getChatHistory, etc.)
- Chat history entries include timestamps and unique IDs for management
- Limited to approximately 5MB of data per domain

### IndexedDB Implementation
- Singleton `AudioDBService` class manages all audio storage operations
- Database named 'AnkiTTSAudioCache' with 'audioFiles' object store
- Text normalization for reliable key generation (trimmed, lowercase text)
- Three indexes for querying: cardId, createdAt, and text
- Audio blobs stored directly in the database with metadata
- Method to clean up old audio files (cleanupOldFiles) to prevent storage overflow
- Versioned database structure (current version: 1)

## Technical Constraints
- **Security**: API keys need secure handling (not exposed in client-side code)
- **CORS**: Browser security policies may affect Anki communication
- **Reliability**: Depends on both Anki being open and API services being available
- **Performance**: AI generation may have latency based on model size and availability
- **Audio Limitations**: 
  - Blob URLs valid only for current browser session
  - IndexedDB has larger storage limits than localStorage (typically 50MB-unlimited)
  - Audio data must be regenerated when not found in IndexedDB
- **LocalStorage Limits**: 
  - Browser storage size limitations (typically 5-10MB)
  - Used for text data and references only, not binary data
