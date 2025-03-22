import { getApiKey } from '../utils/localStorage';

// Constants
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Get the prompt text for the Anki card generation
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @param {string} nativeLanguage - User's native language (e.g., 'Russian', 'French', 'German')
 * @param {string} englishLevel - User's English level (e.g., 'B2', 'C1')
 * @param {Object} pronunciationInfo - Optional pronunciation information from the dictionary
 * @returns {string} - The formatted prompt
 */
const getPromptText = (word, context = '', nativeLanguage = 'Russian', englishLevel = 'B2 preferably (maybe C1)', pronunciationInfo = null) => {
  const contextPart = context ? `\nContext for this word: ${context}` : '';
  // Use the language directly, default to Russian if empty
  const languageName = nativeLanguage && nativeLanguage.trim() ? nativeLanguage.trim() : 'Russian';
  // Use the provided English level or default
  const level = englishLevel && englishLevel.trim() ? englishLevel.trim() : 'B2 preferably (maybe C1)';

  return `
  i'm learning english with program Anki for memory words

i have ${level} level of english, so try to use vocabulary from ${level}  

when you do anki card do as similar pattern as possible (at top side sentence and word i learn in bold (you have to add transcription of the word always), at bottom side sentence and word replaced with % sign and with difenition of this word in english and top three translation in ${languageName} (but popular enough, if less three is also ok), at bottom side the word have always be replaced with % sign)

do sentence moderate short like 10 words or so and with most popular usage with this word (or with context i'll give you)

in bold in top/bottom only show the word or set expression with the word

Feel like a kind 24 yo teacher in university but informal so it feels warm

So your goal is come up with anki card with word that given by me

you have to illustrate each sentence with image also  (write a prompt for google so i can find image)

at comment section you can add most popular synonyms (and diff between the word and them) and antonyms.

at the end of the bottom write etimology of the word for better understanding and learning

at top shortly part of speech (noun / verb / adjective) , formal it or informal, in which topics it's used like medicine, vacation etc (short)

in comment: any important info that could help me learn the word correctly

always write comments in italic 

add line breaks between paragraphs 

and write key words like Definition / in ${languageName} / Comments in bold 

in front card sentence should be at the beginning and add line break after

write comments always in italic!!!

always add line breaks between blocks 

keep in mind that sense: when the user see back side of the card, he have to guess word from the sentence, so the word should be replaced with % sign or just do not use the word in back side

===EXAMPLE===

==front part==
She placed her bag in the overhead **compartment** before taking her seat.

*noun, general, travel, storage*
==front part==

==bottom part==
She placed her bag in the overhead % before taking her seat.

**Definition**: A separate section or enclosed space within a larger container or structure, used for storing or organizing things.

_**In ${languageName}**: отсек, отделение, купе_

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

_**In ${languageName}**: благодарность, привет, респект_

**Comments**: _This word is very informal and commonly used on social media and in other casual settings to recognize someone's contributions or achievements. It's a friendly way to acknowledge someone or something._


**Synonyms**: acknowledgment, recognition, commendation. _(acknowledgment is more formal, recognition is a general term for noticing something, and commendation implies official praise)_

**Antonyms**: criticism, disapproval.

**Etymology**: A combination of "shout" (meaning to speak loudly) and "out" (implying public expression). The term originated in hip-hop culture as a way to publicly acknowledge friends and supporters.
==bottom part==

you have to add cards with==front part== and ==bottom part==

Here's the word I want to learn:${word}${contextPart}`;
};

/**
 * Generate an Anki card via OpenRouter API
 * @param {string} word - The word to create a card for
 * @param {string} context - Optional context for the word
 * @param {string} nativeLanguage - User's native language (defaults to 'Russian')
 * @param {string} englishLevel - User's English level (defaults to 'B2 preferably (maybe C1)')
 * @param {Object} pronunciationInfo - Optional pronunciation information
 * @returns {Promise} - The API response
 */
export const generateAnkiCard = async (word, context = '', nativeLanguage = 'Russian', englishLevel = 'B2 preferably (maybe C1)', pronunciationInfo = null) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key not found. Please set your OpenRouter API key.');
  }
  
  const promptContent = getPromptText(word, context, nativeLanguage, englishLevel, pronunciationInfo);
  
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
