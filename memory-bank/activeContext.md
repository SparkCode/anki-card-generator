# Anki Card Generator - Active Context

## Current Focus
- Understanding the card rendering and editing workflow
- Analyzing audio and pronunciation features integration
- Documenting component relationships and data flow patterns
- Visualizing the card generation and display process

## Recent Changes
- Memory bank initialization (projectbrief.md, productContext.md, techContext.md, systemPatterns.md)
- Detailed analysis of CardDisplay.js component functionality
- Created flowchart of Anki card rendering process

## Active Considerations
- How to best handle CORS issues with Anki integration (noted in project files)
- Security implications of storing API keys in localStorage
- Potential improvements to the card generation workflow
- Audio integration for example sentences and pronunciation
- State management for card editing and preview

## Current Development Context
The project is a functional React application for generating Anki cards with advanced features. Based on the analysis, there are several key functional areas:

1. **Anki Integration**
   - Requires AnkiConnect add-on
   - May have CORS challenges (documented in CORS-FIX.md)
   - Proxy solution may be in place (anki-proxy.js)
   - Card content is parsed from AI output using pattern matching

2. **OpenRouter AI Integration**
   - API key management
   - Prompt engineering for effective card generation
   - Handling API limits and quotas

3. **Card Display and Editing**
   - Content parsing using regex patterns to extract front/back parts
   - Inline markdown editing capabilities
   - Preview of changes before submission to Anki
   - Syntax highlighting for code blocks in cards

4. **Audio and Pronunciation Features**
   - Text-to-Speech (TTS) for example sentences
   - Dictionary-based pronunciation audio clips (US/UK variants)
   - Local storage of audio references and URLs
   - Audio preview functionality in the card editor

## Upcoming Work
Based on the code analysis, potential next steps might include:

- Improving the card content extraction with more robust parsing
- Enhancing the audio generation and playback experience
- Creating a more detailed visualization of the entire application workflow
- Testing error handling for TTS and pronunciation features
- Exploring potential optimizations for localStorage usage
- Documenting the AI response format expectations for card generation

## Questions to Resolve
- How stable is the current Anki connection?
- What LLM models are being used through OpenRouter?
- Are there specific card templates being used?
- How are language-specific considerations handled?
- What are the primary user pain points with the current implementation?
- How is the audio data for pronunciations being generated and stored?
- What is the expected format for AI-generated content (front/back delimiter patterns)?
- How are example sentences extracted and processed for TTS?

## Development Environment
- React application (created with Create React App)
- Local development environment
- Integration testing requires:
  - Running Anki desktop with AnkiConnect add-on
  - Valid OpenRouter API key
  - Network access to both local and internet resources
  - Audio playback capabilities for testing TTS features
