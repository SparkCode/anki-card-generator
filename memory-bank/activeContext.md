# Anki Card Generator - Active Context

## Current Focus
- Initial memory bank setup for the Anki Card Generator project
- Understanding the project structure and component relationships
- Preparing for future development and improvements

## Recent Changes
- Memory bank initialization (projectbrief.md, productContext.md, techContext.md, systemPatterns.md)
- No code changes have been made yet

## Active Considerations
- How to best handle CORS issues with Anki integration (noted in project files)
- Security implications of storing API keys in localStorage
- Potential improvements to the card generation workflow

## Current Development Context
The project appears to be a functional React application for generating Anki cards. Based on the file structure and documentation, there are two main integration points requiring attention:

1. **Anki Integration**
   - Requires AnkiConnect add-on
   - May have CORS challenges (documented in CORS-FIX.md)
   - Proxy solution may be in place (anki-proxy.js)

2. **OpenRouter AI Integration**
   - API key management
   - Prompt engineering for effective card generation
   - Handling API limits and quotas

## Upcoming Work
Without specific task information, potential next steps might include:

- Reviewing the existing code to understand implementation details
- Testing the current functionality to identify pain points
- Exploring the connection methods (direct vs proxy) for Anki
- Analyzing the AI prompt templates for card generation quality
- Improving error handling and user feedback

## Questions to Resolve
- How stable is the current Anki connection?
- What LLM models are being used through OpenRouter?
- Are there specific card templates being used?
- How are language-specific considerations handled?
- What are the primary user pain points with the current implementation?

## Development Environment
- React application (likely created with Create React App)
- Local development environment
- Integration testing requires:
  - Running Anki desktop with AnkiConnect add-on
  - Valid OpenRouter API key
  - Network access to both local and internet resources
