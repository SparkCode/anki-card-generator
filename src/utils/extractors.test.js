// Tests for content extractors
const { extractAiExampleSentence } = require('./extractors');

describe('extractAiExampleSentence', () => {
  test('returns null for null or empty input', () => {
    expect(extractAiExampleSentence(null)).toBeNull();
    expect(extractAiExampleSentence('')).toBeNull();
    expect(extractAiExampleSentence(undefined)).toBeNull();
  });

  test('returns null if front part markers are not found', () => {
    expect(extractAiExampleSentence('Some content without markers')).toBeNull();
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
}); 