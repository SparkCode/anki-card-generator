# Anki Card Generator - Product Context

## Purpose & Problem Space
The Anki Card Generator addresses the time-consuming and often tedious process of creating effective flashcards for language learning. Creating high-quality Anki cards manually requires:
- Researching word definitions, usage examples, and pronunciations
- Finding relevant images or context
- Formatting cards consistently
- Adding appropriate tags and metadata

This application bridges the gap between AI language capabilities and Anki's powerful spaced repetition system.

## Functional Overview
The application serves as a middleware between AI services (via OpenRouter) and Anki (via AnkiConnect):

1. Users input a word, phrase, or concept they want to learn
2. AI generates comprehensive card content including definitions, examples, usage notes
3. Users can review and edit the generated content if needed
4. The application sends the finalized card to Anki through its API
5. Users can manage existing cards and create new ones through the interface

## User Experience Goals
- **Simplicity**: Minimize the steps required to create a high-quality card
- **Customization**: Allow users to configure card templates and content preferences
- **Reliability**: Ensure consistent connection with both AI services and Anki
- **Quality**: Generate cards that support effective learning better than manually created ones

## Integration Points
- **Anki**: Via AnkiConnect API for adding cards to user-selected decks
- **AI Services**: Via OpenRouter for generating card content
- **Local Storage**: For saving user preferences and API keys

## Workflow
1. User configures APIs and preferences (one-time setup)
2. User selects a deck and inputs learning material
3. System generates card content
4. User reviews, potentially edits, and confirms
5. System adds card to selected Anki deck
6. User continues with additional cards or exits

## Value Proposition
- **Time Saving**: Reduce card creation time from minutes to seconds
- **Consistency**: Ensure all cards follow the same high-quality format
- **Enhanced Learning**: Leverage AI to create more comprehensive learning materials
- **Accessibility**: Make effective flashcard creation accessible to non-experts
