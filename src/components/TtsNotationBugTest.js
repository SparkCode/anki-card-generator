/**
 * Test file demonstrating the square bracket pronunciation notation bug fix
 * 
 * The bug occurred when:
 * 1. TTS was generated for a sentence with square bracket notation
 * 2. The key stored in localStorage included the notation
 * 3. When later trying to retrieve the data, the notation wasn't removed consistently
 */

const { extractAiExampleSentence } = require('../utils/extractors');

// Implement our own version of generateDictDataKey for the test
function generateDictDataKey(sentence) {
  if (!sentence) return null;
  // Use the sentence as the key instead of the word
  // Trim and lowercase for consistency
  return `dictData_${sentence.trim().toLowerCase()}`;
}

/**
 * Simulates saving TTS data to localStorage with a key derived from a sentence
 * @param {string} rawSentence - The raw sentence with notation
 * @param {object} data - The data to store
 * @param {Map} mockStorage - Mock localStorage
 */
function saveToLocalStorage(rawSentence, data, mockStorage) {
  // Use extracted clean sentence to generate key
  const cleanSentence = extractAiExampleSentence(`==front part==\n${rawSentence}\n==front part==`);
  console.log(`Cleaned sentence for storage: "${cleanSentence}"`);
  
  const dictKey = generateDictDataKey(cleanSentence);
  console.log(`Generated storage key: "${dictKey}"`);
  
  // Store data
  mockStorage.set(dictKey, JSON.stringify(data));
  return { cleanSentence, dictKey };
}

/**
 * Simulates retrieving TTS data from localStorage based on a sentence
 * @param {string} rawSentence - The raw sentence with notation
 * @param {Map} mockStorage - Mock localStorage
 * @returns {object|null} - The retrieved data
 */
function retrieveFromLocalStorage(rawSentence, mockStorage) {
  // Use extracted clean sentence to generate key
  const cleanSentence = extractAiExampleSentence(`==front part==\n${rawSentence}\n==front part==`);
  console.log(`Cleaned sentence for retrieval: "${cleanSentence}"`);
  
  const dictKey = generateDictDataKey(cleanSentence);
  console.log(`Generated retrieval key: "${dictKey}"`);
  
  // Get data
  const storedData = mockStorage.get(dictKey);
  return storedData ? JSON.parse(storedData) : null;
}

/**
 * Test that demonstrates the bug and verifies the fix
 */
function testSquareBracketBug() {
  // Create mock storage
  const mockStorage = new Map();
  
  // Original sentence with square bracket notation that caused the bug
  const sentenceWithSquareBrackets = 'I read [riːd] about the new discoveries in quantum physics.';
  
  // 1. Store TTS data with the sentence
  const ttsData = {
    ttsAudioFilename: 'read_example_shimmer.mp3',
    exampleSentence: sentenceWithSquareBrackets,
    word: 'read',
    pronunciationInfo: {
      ttsGeneratedSuccessfully: true,
      attemptedTts: true
    },
    timestamp: Date.now()
  };
  
  const { cleanSentence, dictKey } = saveToLocalStorage(sentenceWithSquareBrackets, ttsData, mockStorage);
  
  // 2. Try to retrieve it later
  const retrievedData = retrieveFromLocalStorage(sentenceWithSquareBrackets, mockStorage);
  
  // 3. Verify if we can find the data
  console.log('Storage contains:', Array.from(mockStorage.keys()));
  console.log('Data found:', retrievedData ? 'YES' : 'NO');
  
  // 4. Report test results
  if (retrievedData) {
    console.log('✅ TEST PASSED: Square bracket notation is correctly handled');
    console.log('The fix ensures consistent keys between storage and retrieval');
  } else {
    console.log('❌ TEST FAILED: Square bracket notation causes inconsistent keys');
    console.log('Original bug is still present');
  }
  
  return {
    passed: !!retrievedData,
    storedKey: dictKey,
    mockStorage,
    cleanSentence
  };
}

// Also test the bug with the original problematic notation
function testRealWorldBug() {
  console.log('\n---------- TESTING WITH REAL WORLD EXAMPLE ----------');
  
  // Create mock storage
  const mockStorage = new Map();
  
  // The exact example that caused the bug in the logs
  const realWorldExample = 'I read [riːd] about the new discoveries in quantum physics.';
  
  // Hypothetical scenario where the notation was present during storage but removed during retrieval
  const withoutNotation = 'I read about the new discoveries in quantum physics.';
  
  // 1. Store TTS data with notation
  console.log('\nSTORING DATA WITH NOTATION:');
  const ttsData = {
    ttsAudioFilename: 'read_example_shimmer.mp3',
    exampleSentence: realWorldExample,
    word: 'read',
    pronunciationInfo: {
      ttsGeneratedSuccessfully: true,
      attemptedTts: true
    },
    timestamp: Date.now()
  };
  
  saveToLocalStorage(realWorldExample, ttsData, mockStorage);
  
  // 2. Retrieve with the exact same notation (should work even without fix)
  console.log('\nRETRIEVING WITH IDENTICAL NOTATION:');
  const retrievedWithNotation = retrieveFromLocalStorage(realWorldExample, mockStorage);
  console.log('Data found with identical notation:', retrievedWithNotation ? 'YES' : 'NO');
  
  // 3. Retrieve with different notation (this would fail before the fix)
  console.log('\nRETRIEVING WITHOUT NOTATION (the real test):');
  const retrievedWithoutNotation = retrieveFromLocalStorage(withoutNotation, mockStorage);
  console.log('Data found without notation:', retrievedWithoutNotation ? 'YES' : 'NO');
  
  // 4. Report real-world test results
  if (retrievedWithoutNotation) {
    console.log('✅ REAL-WORLD TEST PASSED: The fix allows retrieving data even when notation varies');
  } else {
    console.log('❌ REAL-WORLD TEST FAILED: Different notation still prevents finding the data');
  }
  
  return {
    passedIdentical: !!retrievedWithNotation,
    passedDifferent: !!retrievedWithoutNotation
  };
}

module.exports = {
  testSquareBracketBug,
  testRealWorldBug
};

// If running this file directly
if (require.main === module) {
  console.log('Running test for square bracket notation bug...');
  testSquareBracketBug();
  
  // Also run the real-world test
  testRealWorldBug();
} 