# Anki Card Generator - Technical Context

## Technology Stack

### Frontend
- **React**: Main UI framework (identified from App.js and component structure)
- **CSS**: Styling (App.css, index.css)
- **JavaScript**: Primary programming language

### Backend Communication
- **AnkiConnect API**: Interface with Anki desktop application
- **OpenRouter API**: AI service for generating card content
- **fetch/Axios**: For making API requests (based on service structure)

### Data Storage
- **Local Storage**: Browser storage for user preferences and API keys

## Key Files and Directories

### Components
- `APIKeyModal.js`: For managing API keys securely
- `CardDisplay.js`: For displaying generated cards
- `ChatHistory.js`: Appears to track conversation/generation history
- `CreateCardModal.js`: UI for creating new cards
- `DeckSelector.js`: For selecting Anki decks
- `WordForm.js`: Form for inputting words/phrases to create cards for

### Services
- `AnkiService.js`: Service for communicating with Anki
- `OpenRouterService.js`: Service for interfacing with OpenRouter AI

### Utilities
- `localStorage.js`: Helper functions for working with browser storage

### Supporting Files
- `anki-proxy.js`: Likely handles proxy communication with Anki
- `CORS-FIX.md`, `DIRECT-CONNECTION.md`: Documentation for handling connection issues

## Development Setup
Based on the project structure, this appears to be a standard React application:

1. Dependencies managed via npm/yarn (package.json present)
2. Standard React scripts for development server, building, and testing
3. Appears to be created using Create React App (based on file structure)

## Technical Requirements

### Anki Integration
- Requires AnkiConnect add-on installed in Anki
- Needs network communication between browser and Anki desktop app
- May require CORS handling or proxy setup (indicated by CORS-FIX.md)

### AI Integration
- Requires OpenRouter API key
- Proper handling of API rate limits and quotas

### Browser Requirements
- Modern browser with LocalStorage support
- JavaScript enabled
- Network access to both Anki (localhost) and OpenRouter (internet)

## Technical Constraints
- **Security**: API keys need secure handling (not exposed in client-side code)
- **CORS**: Browser security policies may affect Anki communication
- **Reliability**: Depends on both Anki being open and API services being available
- **Performance**: AI generation may have latency based on model size and availability
