/**
 * Utilities for extracting content from AI-generated cards
 */

/**
 * Extracts the example sentence from AI-generated card content
 * @param {string} cardContent - The complete card content
 * @returns {string|null} - The extracted example sentence or null if not found
 */
const extractAiExampleSentence = (cardContent) => {
  if (!cardContent) return null;
  
  let sentence;
  
  // Check if the content has card markers
  const frontMatch = cardContent.match(/==front part==([\s\S]*?)==front part==/);
  
  if (frontMatch && frontMatch[1]) {
    // Extract from card content with markers
    const frontContent = frontMatch[1].trim();
    
    // Get the first line which should be the example sentence
    const lines = frontContent.split('\n');
    sentence = lines[0].trim();
  } else {
    // Check if this looks like a card format by seeing if it contains markers
    // If it seems like it should have markers but doesn't have complete ones, return null
    if (cardContent.includes('==front part==') || cardContent.includes('==back part==')) {
      return null;
    }
    
    // Otherwise treat the input as a plain example sentence
    sentence = cardContent.trim();
  }
  
  // Process the sentence in steps for better reliability
  
  // 1. Remove any part of speech markers (text between asterisks)
  sentence = sentence.replace(/\s+\*[^*]+\*$/g, '');
  
  // 2. Clean up bold formatting (text between double asterisks)
  sentence = sentence.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // 3. Clean up pronunciation notation (text between slashes) including US/UK variants
  sentence = sentence.replace(/\/[^/]+\/(\s*\([A-Z]+\))?\s*/g, '');
  
  // 4. Also clean up pronunciation notation in square brackets [like this]
  sentence = sentence.replace(/\[[^\]]+\](\s*\([A-Z]+\))?\s*/g, '');
  
  // 5. Remove any double spaces that might have been created and fix spacing around punctuation
  sentence = sentence.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1');
  
  return sentence.trim();
};

module.exports = {
  extractAiExampleSentence
}; 