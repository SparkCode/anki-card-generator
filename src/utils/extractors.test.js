// Tests for content extractors
const { extractAiExampleSentence } = require('./extractors');

describe('extractAiExampleSentence', () => {
  test('returns null for null or empty input', () => {
    expect(extractAiExampleSentence(null)).toBeNull();
    expect(extractAiExampleSentence('')).toBeNull();
    expect(extractAiExampleSentence(undefined)).toBeNull();
  });

  test('handles incomplete front part markers', () => {
    // Plain text without markers is now treated as a valid sentence
    expect(extractAiExampleSentence('Some content without markers')).toBe('Some content without markers');
    // Only incomplete marker patterns should return null
    expect(extractAiExampleSentence('==front part== no closing marker')).toBeNull();
  });

  test('extracts basic example sentence', () => {
    const content = `==front part==
This is an example sentence.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This is an example sentence.');
  });

  test('removes bold markdown formatting', () => {
    const content = `==front part==
This is an example with a **bold** word.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This is an example with a bold word.');
  });

  test('removes pronunciation notation', () => {
    const content = `==front part==
This is an example with /prəˌnʌnsiˈeɪʃən/ notation.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This is an example with notation.');
  });

  test('removes part of speech info', () => {
    const content = `==front part==
This example contains a specific word *noun*
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This example contains a specific word');
  });

  test('handles complex example with multiple formatting elements', () => {
    const content = `==front part==
She **endeavored** /ɪnˈdevərd/ to finish her project on time *verb*
More content that should be ignored
==front part==

==back part==
This should not be included
==back part==`;
    expect(extractAiExampleSentence(content)).toBe('She endeavored to finish her project on time');
  });

  test('trims whitespace from the extracted sentence', () => {
    const content = `==front part==
   This sentence has extra whitespace    
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This sentence has extra whitespace');
  });

  test('only returns the first line of the front content', () => {
    const content = `==front part==
This is the first line that should be extracted.
This second line should be ignored.
As well as this third line.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('This is the first line that should be extracted.');
  });

  test('example sentence with multiple lines', () => {
    const content = `==front part==
I need to **test** /test/ if the microphone is working.

*verb, general, technology*
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('I need to test if the microphone is working.');
  });
  
  test('uk/us pronunciation', () => {
    const content = `==front part==
Don't worry about being **presumptuous** /prɪˈzʌmp.tʃuː.əs/ (US) /prɪˈzʌmp.tʃəs/ (UK). You don't have to tell anyone.

*verb, general, technology*
==front part==`;
    expect(extractAiExampleSentence(content)).toBe("Don't worry about being presumptuous. You don't have to tell anyone.");
  });
  
  // New tests for square bracket pronunciation notation
  test('removes square bracket pronunciation notation', () => {
    const content = `==front part==
I read [riːd] about the new discoveries in quantum physics.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('I read about the new discoveries in quantum physics.');
  });
  
  test('removes square bracket notation with UK/US markers', () => {
    const content = `==front part==
I often **read** [riːd] (US) [red] (UK) books about science.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('I often read books about science.');
  });
  
  test('handles mixed slash and square bracket notation', () => {
    const content = `==front part==
The **content** [ˈkɒntent] /kənˈtent/ varies depending on the context.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('The content varies depending on the context.');
  });
  
  test('handles real-world square bracket example that caused the bug', () => {
    const content = `==front part==
I read [riːd] about the new discoveries in quantum physics.
*verb, past tense*
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('I read about the new discoveries in quantum physics.');
  });
  
  test('handles multiple square bracket notations in a single sentence', () => {
    const content = `==front part==
The **lead** [liːd] singer **read** [red] the **contract** [ˈkɒntrækt] carefully.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('The lead singer read the contract carefully.');
  });
  
  test('handles complex sentence with both types of notation and other formatting', () => {
    const content = `==front part==
She **read** [red] /riːd/ the **book** [bʊk] about **pronunciation** /prəˌnʌnsiˈeɪʃən/ *verb*
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('She read the book about pronunciation');
  });
  
  test('handles square brackets followed immediately by punctuation', () => {
    const content = `==front part==
Can you **read**[riːd]? It's an important skill.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('Can you read? It\'s an important skill.');
  });
  
  test('handles square brackets with no space after', () => {
    const content = `==front part==
I **read**[riːd]the book yesterday.
==front part==`;
    expect(extractAiExampleSentence(content)).toBe('I readthe book yesterday.');
  });
}); 