import { getApiKey } from '../utils/localStorage';

// Constants
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Get the prompt text for the Anki card generation
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @returns {string} - The formatted prompt
 */
const getPromptText = (word, context = '') => {
  const contextPart = context ? `\nContext for this word: ${context}` : '';
  
  return `
  i'm learning english with program Anki for memory words

i have B2 level of english, so try to use vocabulary from B2 preferably (maybe C1)  

when you do anki card do as similar to attached files as possible (at top side sentence and word i learn in bold with transcription inside sentence (you have to add transcription of the word always), at bottom side sentence and word replaced with % sign and with difenition of this word in english and top three translation in russian (but popular enough, if less three is also ok) but no the word i learn at bottom side)

do sentence moderate short like 10 words or so and with most popular usage with this word

in bold in top/bottom only show the word or set expression with the word

Feel like a kind 24 yo teacher in university but informal so it feels warm

So your goal is come up with anki card with word that given

you have to illustrate each sentence with image also  (write a prompt for google so i can find )

at comment section you can add most popular synonyms (and diff between the word and them) and antonyms.

at the end of the bottom write etimology of the word for better understanding and learning

at top shortly part of speech (noun / verb / adjective) , formal it or informal, in which topics it's used like medicine, vacation etc (short)

in comment: any important info that could help me learn the word correctly

when you do image do it without the word!!!

always write comments in italic 

add line breaks between paragraphs 

and write key words like Definition / in Russian / Comments in bold 

in front card sentence should be at the beginning and add line break after

write comments always in italic!!!

always add line breaks between blocks 

in backside all mentions of the word should be replaced with % sign

in caps show only word and significant parts


===EXAMPLE===

==front part==
She placed her bag in the overhead **compartment** /kəmˈpɑːrtmənt/ before taking her seat.

*noun, general, travel, storage*
==front part==

==bottom part==
She placed her bag in the overhead % before taking her seat.

**Definition**: A separate section or enclosed space within a larger container or structure, used for storing or organizing things.

_**In Russian**: отсек, отделение, купе_

_**Comments**: Commonly used in travel (train, plane, ship) and storage contexts. In aviation, "overhead %" refers to the space above seats for carry-on luggage. In trains, it can mean a private section for passengers._

**Synonyms**: section (broader, less specific), storage area (descriptive), cabin (when referring to a sleeping space in a train)

**Antonyms**: open space, hallway
==bottom part==

you have to add cards with==front part== and ==bottom part==

Here's the word I want to learn:${word}${contextPart}`;
};

/**
 * Generate an Anki card via OpenRouter API
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @returns {Promise} - The API response
 */
export const generateAnkiCard = async (word, context = '') => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your OpenRouter API key.');
  }
  
  const promptContent = getPromptText(word, context);
  
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
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Anki Card Generator'
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
    console.error('Error calling OpenRouter API:', error);
    throw error;
  }
};
