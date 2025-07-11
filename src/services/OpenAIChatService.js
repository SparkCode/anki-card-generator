import { getApiKey, getPromptTemplateFromStorage } from '../utils/localStorage';

// Constants
// OpenAI chat completions endpoint
const API_URL = 'https://api.openai.com/v1/chat/completions';
// Default model to use for card generation
const DEFAULT_MODEL = 'gpt-4o';

// Default prompt template - Export this
export const DEFAULT_PROMPT_TEMPLATE = `
I'm learning english with program Anki for memory words. So your goal is come up with anki card with word that given by me

i have {{{level}}} level of english, so try to use vocabulary from {{{level}}}

Follow this pattern.
At top side:
— sentence and word i learn in bold (you have to add transcription of the word always). Sentence should be at the beginning and add line break after

— shortly part of speech (noun / verb / adjective) , formal it or informal, in which topics it's used like medicine, vacation etc (short)

At bottom side:
— Sentence and word replaced with % sign and with definition of this word in english and top three translation in {{{languageName}}} (but popular enough, if less three is also ok), at bottom side the word have always be replaced with % sign)
— you have to illustrate each sentence with image also  (write a prompt for google so i can find image)
— add most popular synonyms (and diff between the word and them) and antonyms
— write etymology of the word for better understanding and learning
— add comment: any important info that could help me learn the word correctly, always write comments in italic


Additional:
— do sentence moderate short like 10 words or so and with most popular usage with this word (or with context i'll give you);

— in bold in top/bottom only show the word or set expression with the word

— Feel like a kind 24 yo teacher in university but informal so it feels warm

— add line breaks between paragraphs

— keep in mind that sense: when the user see back side of the card, he have to guess word from the sentence, so the word should be replaced with % sign or just do not use the word in back side


{{{deckContext}}}

===EXAMPLE===

==front part==
She placed her bag in the overhead **compartment** before taking her seat.

*noun, general, travel, storage*
==front part==

==bottom part==
She placed her bag in the overhead % before taking her seat.

**Definition**: A separate section or enclosed space within a larger container or structure, used for storing or organizing things.

_**In {{{languageName}}}**: отсек, отделение, купе_

_**Comments**: Commonly used in travel (train, plane, ship) and storage contexts. In aviation, "overhead %" refers to the space above seats for carry-on luggage. In trains, it can mean a private section for passengers._

**Synonyms**: section (broader, less specific), storage area (descriptive), cabin (when referring to a sleeping space in a train)

**Antonyms**: open space, hallway
==bottom part==

==front part==
Huge **shoutout** to all the volunteers who helped make the festival a success!

*noun, informal, social media/community, recognition*
==front part==

==bottom part==
Huge % to all the volunteers who helped make the festival a success!

**Definition**: A public expression of praise, gratitude, or recognition.

_**In {{{languageName}}}**: благодарность, привет, респект_

**Comments**: _This word is very informal and commonly used on social media and in other casual settings to recognize someone's contributions or achievements. It's a friendly way to acknowledge someone or something._


**Synonyms**: acknowledgment, recognition, commendation. _(acknowledgment is more formal, recognition is a general term for noticing something, and commendation implies official praise)_

**Antonyms**: criticism, disapproval.

**Etymology**: A combination of "shout" (meaning to speak loudly) and "out" (implying public expression). The term originated in hip-hop culture as a way to publicly acknowledge friends and supporters.
==bottom part==

you have to add cards with==front part== and ==bottom part==

Here's the word I want to learn:{{{word}}}{{{contextPart}}}`;

/**
 * Get the current prompt template (user-defined or default)
 * @returns {string} - The prompt template string
 */
const getCurrentPromptTemplate = () => {
  return getPromptTemplateFromStorage() || DEFAULT_PROMPT_TEMPLATE;
};

/**
 * Get the prompt text for the Anki card generation
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @param {string} nativeLanguage - User's native language (e.g., 'Russian', 'French', 'German')
 * @param {string} englishLevel - User's English level (e.g., 'B2', 'C1')
 * @param {Object} pronunciationInfo - Optional pronunciation information from the dictionary
 * @param {string} deckName - The name of the deck
 * @returns {string} - The formatted prompt
 */
const getPromptText = (word, context = '', nativeLanguage = 'Russian', englishLevel = 'Upper intermediate', pronunciationInfo = null, deckName = '') => {
  const contextPart = context ? `\nContext for this word: ${context}` : '';
  // Use the language directly, default to Russian if empty
  const languageName = nativeLanguage && nativeLanguage.trim() ? nativeLanguage.trim() : 'Russian';
  // Use the provided English level or default
  const level = englishLevel && englishLevel.trim() ? englishLevel.trim() : 'Upper intermediate';

  const deckContext = deckName ? `\nI am currently studying the deck named: "${deckName}". Use this deck name for additional context if relevant.` : '';

  let promptTemplate = getCurrentPromptTemplate(); // Use the function to get the template

  // Replace placeholders with actual values
  promptTemplate = promptTemplate.replace(/{{{level}}}/g, level);
  promptTemplate = promptTemplate.replace(/{{{languageName}}}/g, languageName);
  promptTemplate = promptTemplate.replace(/{{{deckContext}}}/g, deckContext);
  promptTemplate = promptTemplate.replace(/{{{word}}}/g, word);
  promptTemplate = promptTemplate.replace(/{{{contextPart}}}/g, contextPart);

  return promptTemplate;
};

/**
 * Generate an Anki card via OpenAI Chat Completions API
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @param {string} nativeLanguage - User's native language (defaults to 'Russian')
 * @param {string} englishLevel - User's English level (defaults to 'Upper intermediate')
 * @param {Object} pronunciationInfo - Optional pronunciation information
 * @param {string} deckName - The name of the deck
 * @returns {Promise} - The API response
 */
export const generateAnkiCard = async (
  word,
  context = '',
  nativeLanguage = 'Russian',
  englishLevel = 'Upper intermediate',
  pronunciationInfo = null,
  deckName = ''
) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your OpenAI API key.');
  }
  
  const promptContent = getPromptText(word, context, nativeLanguage, englishLevel, pronunciationInfo, deckName);
  
  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'user',
        content: promptContent
      }
    ]
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error?.message || 
        `API request failed with status ${response.status}`
      );
    }
    
    const data = await response.json();
    
    // Extract the content from the response
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    console.error('Error calling OpenAI Chat Completions API:', error);
    throw error;
  }
}; 