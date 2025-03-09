# Anki Card Generator

A web application that helps language learners generate high-quality Anki flashcards using artificial intelligence. This tool leverages Claude 3.7 Sonnet via the OpenRouter API to create well-structured, pedagogically sound flashcards for vocabulary learning.

## Features

- **AI-Powered Card Generation**: Enter an English word and optional context to generate a complete Anki card
- **B2-C1 Level Focus**: Cards are designed for intermediate to advanced English learners
- **Standardized Format**: Each card includes:
  - Front side: Sentence with target word in bold + pronunciation + part of speech info
  - Back side: Definition, Russian translations, usage notes, synonyms/antonyms, and etymology
- **Image Suggestions**: Includes Google image search prompts for visual reinforcement
- **Chat History**: Save and revisit previously generated cards
- **Direct Integration with Anki**: Create cards directly in your Anki decks via AnkiConnect
- **Local Storage**: API key and history stored only in your browser

## Getting Started

### Prerequisites

- An OpenRouter API key (available from [OpenRouter](https://openrouter.ai/keys))
- Anki desktop app with the AnkiConnect add-on installed (add-on code: 2055492159)
- A modern web browser

### Usage

1. Configure Anki:
   - Install the AnkiConnect add-on in Anki (code: 2055492159)
   - Configure AnkiConnect to allow connections (see [DIRECT-CONNECTION.md](DIRECT-CONNECTION.md))
   - Keep Anki running when using the application

2. Visit the application at [https://sebeldin.github.io/anki-playground](https://sebeldin.github.io/anki-playground)
3. Enter your OpenRouter API key when prompted (stored only in your browser)
4. Type an English word you want to learn
5. Optionally add context about how you'd like to use the word
6. Click "Generate Card" and wait for the AI to create your card
7. Either:
   - Copy the front and back content to your Anki deck manually, or
   - Use the "Create in Anki" button to add the card directly to your selected deck

## Example Card Format

### Front Card:
```
She placed her bag in the overhead **compartment** /kəmˈpɑːrtmənt/ before taking her seat.

*noun, general, travel, storage*
```

### Back Card:
```
She placed her bag in the overhead % before taking her seat.

**Definition**: A separate section or enclosed space within a larger container or structure, used for storing or organizing things.

_**In Russian**: отсек, отделение, купе_

_**Comments**: Commonly used in travel (train, plane, ship) and storage contexts. In aviation, "overhead %" refers to the space above seats for carry-on luggage. In trains, it can mean a private section for passengers._

**Synonyms**: section (broader, less specific), storage area (descriptive), cabin (when referring to a sleeping space in a train)

**Antonyms**: open space, hallway
```

## Development

### Local Setup

1. Clone the repository
   ```
   git clone https://github.com/sebeldin/anki-playground.git
   ```
2. Install dependencies
   ```
   cd anki-card-generator
   npm install
   ```
3. Configure AnkiConnect to allow connections from your development server (see [DIRECT-CONNECTION.md](DIRECT-CONNECTION.md))
4. Start the development server
   ```
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment

Deploy to GitHub Pages with:
```
npm run deploy
```

## Technologies Used

- React
- OpenRouter API (Claude 3.7 Sonnet)
- AnkiConnect API
- localStorage for persistent storage
- GitHub Pages for hosting

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for language learners using Anki's spaced repetition system
- Powered by Anthropic's Claude 3.7 Sonnet via OpenRouter
