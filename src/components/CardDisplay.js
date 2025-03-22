import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage';
import { extractAiExampleSentence } from '../utils/extractors';
import { generateDictDataKey } from '../App';
import ExampleSentenceAudio from './ExampleSentenceAudio';
// Basic resets and global styles
import '../styles/reset.css';
// Import global animations to ensure they're loaded before component styles
import '../styles/animations.css';
// Then import component styles
import './ExampleSentenceAudio.scss';

/**
 * Component to display the generated Anki card with front and back views
 * @param {Object} props - Component props
 * @param {string} props.content - The raw content from the AI
 * @param {boolean} props.isLoading - Whether content is still loading
 * @param {Function} props.onOpenInAnkiUI - Function called when the card is clicked to open in Anki UI
 * @param {Function} props.onRegenerate - Function called when regenerate button is clicked
 * @param {Object} props.ttsResult - Result from TTS generation containing success, filename, and previewUrl
 */
const CardDisplay = ({ content, isLoading, onOpenInAnkiUI, onRegenerate, ttsResult }) => {
  // Define extractCardParts function
  const extractCardParts = (fullContent) => {
    if (!fullContent) return { front: null, back: null };
    
    const frontPattern = /==front part==([\s\S]*?)==front part==/;
    const backPattern = /==bottom part==([\s\S]*?)==bottom part==/;
    
    const frontMatch = fullContent.match(frontPattern);
    const backMatch = fullContent.match(backPattern);
    
    return {
      front: frontMatch ? frontMatch[1].trim() : null,
      back: backMatch ? backMatch[1].trim() : null,
    };
  };
  
  // Initialize state - moved before conditional returns
  const parsedCard = content ? extractCardParts(content) : { front: null, back: null };
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [frontEditing, setFrontEditing] = useState(false);
  const [backEditing, setBackEditing] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [ttsAudioFilename, setTtsAudioFilename] = useState(null);
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState(null);
  const [exampleSentence, setExampleSentence] = useState('');
  const [hasTtsAudio, setHasTtsAudio] = useState(false);

  // Extract the bold word from front text to look up pronunciation
  useEffect(() => {
    if (frontText) {
      const boldWordMatch = frontText.match(/\*\*([^*]+)\*\*/);
      if (boldWordMatch) {
        setCurrentWord(boldWordMatch[1].trim());
      }
    }
  }, [frontText]);
  
  // Update text states when content changes
  useEffect(() => {
    if (content) {
      const { front, back } = extractCardParts(content);
      setFrontText(front || '');
      setBackText(back || '');
      // Reset editing state when new content arrives
      setFrontEditing(false);
      setBackEditing(false);
    }
  }, [content]);

  // Extract example sentence and check if TTS data exists for it
  useEffect(() => {
    if (!content) return;
    
    // Extract example sentence from the content
    const aiExampleSentence = extractAiExampleSentence(content);
    console.log('Extracted example sentence:', aiExampleSentence);
    
    if (!aiExampleSentence) {
      console.log('No example sentence found in content');
      setHasTtsAudio(false);
      setTtsAudioFilename(null);
      setTtsPreviewUrl(null);
      setExampleSentence('');
      return;
    }
    
    // Look up TTS data using the sentence key
    const dictKey = generateDictDataKey(aiExampleSentence);
    console.log('Looking up TTS data with key:', dictKey);
    
    let storedDictData = getLocalStorageItem(dictKey);
    console.log('Lookup result:', storedDictData ? 'Found data' : 'No data found');
    
    if (storedDictData) {
      // Show audio component if we have a filename or if TTS was generated successfully
      const hasTts = !!storedDictData.ttsAudioFilename || 
                    (!!storedDictData.exampleSentence && 
                     (storedDictData.pronunciationInfo?.ttsGeneratedSuccessfully || 
                      storedDictData.pronunciationInfo?.attemptedTts));
      
      console.log('hasTts determined as:', hasTts, {
        ttsAudioFilename: storedDictData.ttsAudioFilename,
        exampleSentence: storedDictData.exampleSentence,
        ttsGeneratedSuccessfully: storedDictData.pronunciationInfo?.ttsGeneratedSuccessfully,
        attemptedTts: storedDictData.pronunciationInfo?.attemptedTts
      });
      
      setHasTtsAudio(hasTts);
      setTtsAudioFilename(storedDictData.ttsAudioFilename || null);
      
      // Only use ttsPreviewUrl if it exists and we're in the same browser session
      // Blob URLs aren't valid across sessions
      setTtsPreviewUrl(storedDictData.ttsPreviewUrl || null);
      setExampleSentence(storedDictData.exampleSentence || '');
      
      console.log('TTS UI state:', {
        hasTts,
        ttsAudioFilename: storedDictData.ttsAudioFilename,
        ttsPreviewUrl: storedDictData.ttsPreviewUrl,
        exampleSentence: storedDictData.exampleSentence
      });
    } else {
      console.log('No stored data found for sentence key, setting default TTS state');
      setHasTtsAudio(false);
      setTtsAudioFilename(null);
      setTtsPreviewUrl(null);
      setExampleSentence(aiExampleSentence);
    }

    // If we have a direct ttsResult prop, use it immediately
    if (ttsResult && ttsResult.success) {
      setHasTtsAudio(true);
      setTtsAudioFilename(ttsResult.filename);
      setTtsPreviewUrl(ttsResult.previewUrl);
      setExampleSentence(aiExampleSentence);
    }
  }, [content, currentWord, ttsResult]);
  
  if (isLoading) {
    return (
      <div className="card-display loading">
        <div className="loading-spinner"></div>
        <p>Generating your Anki card...</p>
      </div>
    );
  }
  
  if (!content) {
    return null;
  }
  
  const { front, back: initialBack } = parsedCard;
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // Show a temporary success message
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 2000);
        }
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };
  
  const handleCopy = () => {
    copyToClipboard(frontText && backText ? `${frontText}\n\n${backText}` : content);
  };
  
  const handleCardClick = () => {
    if (content && onOpenInAnkiUI) {
      // Create a modified content string with the updated content
      let modifiedContent = content;
      
      const { front: originalFront, back: originalBack } = parsedCard;
      
      if (originalFront) {
        modifiedContent = modifiedContent.replace(
          /==front part==([\s\S]*?)==front part==/,
          `==front part==${frontText}==front part==`
        );
      }
      
      if (originalBack) {
        modifiedContent = modifiedContent.replace(
          /==bottom part==([\s\S]*?)==bottom part==/,
          `==bottom part==${backText}==bottom part==`
        );
      }
      
      onOpenInAnkiUI(modifiedContent);
    }
  };
  
  const MarkdownRenderer = ({ content }) => (
    <ReactMarkdown
      components={{
        code({node, inline, className, children, ...props}) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
  
  // Determine if ExampleSentenceAudio should be shown
  const shouldShowAudio = hasTtsAudio || (ttsResult && ttsResult.success);
  // Get audio details from either ttsResult or stored data
  const audioFilename = ttsResult?.success ? ttsResult.filename : ttsAudioFilename;
  const audioUrl = ttsResult?.success ? ttsResult.previewUrl : ttsPreviewUrl;
  
  return (
    <div className="card-display">
      <div className="card-content dual-view">
        {front || initialBack ? (
          <>
            {frontText && (
              <div className="card-side">
                <div className="card-side-header" onClick={() => setFrontEditing(!frontEditing)}>
                  Front {frontEditing ? "(Editing)" : "(Click to edit)"}
                </div>
                <div className="card-side-content front-content">
                  {frontEditing ? (
                    <AutosizeTextarea
                      value={frontText}
                      onChange={setFrontText}
                      placeholder="Edit the front side of your card here..."
                    />
                  ) : (
                    <div 
                      className="markdown-content" 
                      onClick={() => setFrontEditing(true)}
                    >
                      <MarkdownRenderer content={frontText} />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="card-divider"></div>
            
            <div className="card-side">
              <div className="card-side-header" onClick={() => setBackEditing(!backEditing)}>
                Back {backEditing ? "(Editing)" : "(Click to edit)"}
              </div>
              <div className="card-side-content back-content">
                {backEditing ? (
                  <AutosizeTextarea
                    value={backText}
                    onChange={setBackText}
                    placeholder="Edit the back side of your card here..."
                  />
                ) : (
                  <div 
                    className="markdown-content" 
                    onClick={() => setBackEditing(true)}
                  >
                    <MarkdownRenderer content={backText} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="parsing-error">
            <p>Sorry, couldn't parse the card format properly. Here's the raw content:</p>
            <div className="raw-content markdown-content">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        )}
      </div>

      {/* Pronunciation Preview */}
      {currentWord && exampleSentence && (
        <PronunciationPreview word={currentWord} sentence={exampleSentence} />
      )}

      {/* Example Sentence Audio */}
      {shouldShowAudio && (
        <ExampleSentenceAudio 
          sentence={exampleSentence}
          audioUrl={audioUrl}
          audioFilename={audioFilename}
          cardId={currentWord}
        />
      )}
      
      <div className="card-actions">
        <button 
          id="copy-btn"
          className="button secondary" 
          onClick={handleCopy}
          disabled={!content}
        >
          Copy to Clipboard
        </button>
        
        {content && onRegenerate && (
          <button 
            className="button secondary" 
            onClick={onRegenerate}
            disabled={isLoading}
          >
            Regenerate
          </button>
        )}
        
        {content && (
          <button 
            className="button primary" 
            onClick={handleCardClick}
          >
            Open in Anki UI
          </button>
        )}
      </div>
    </div>
  );
};

// Auto-resizing textarea component
const AutosizeTextarea = ({ value, onChange, placeholder }) => {
  const textareaRef = React.useRef(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight measurement
      textareaRef.current.style.height = 'auto';
      // Set the height to match the content, with a minimum of 150px
      const scrollHeight = Math.max(150, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [value]);
  
  return (
    <textarea
      ref={textareaRef}
      className="back-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        padding: '12px',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        minHeight: '150px',
        resize: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.5'
      }}
    />
  );
};

// Add the PronunciationPreview component
const PronunciationPreview = ({ word, sentence }) => {
  const [pronunciationInfo, setPronunciationInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(null);
  
  useEffect(() => {
    if (!word) {
      setLoading(false);
      return;
    }
    
    // If we have an example sentence, use it to look up dictionary data
    if (sentence) {
      const dictKey = generateDictDataKey(sentence);
      const storedDictData = getLocalStorageItem(dictKey);
      
      if (storedDictData?.pronunciationInfo) {
        setPronunciationInfo(storedDictData.pronunciationInfo);
      }
    }
    
    setLoading(false);
  }, [word, sentence]);
  
  const playAudio = (url, variant) => {
    if (!url) return;
    
    setAudioPlaying(variant);
    
    const audio = new Audio(url);
    audio.play()
      .then(() => {
        // Add an event listener to reset playing state when audio ends
        audio.addEventListener('ended', () => {
          setAudioPlaying(null);
        });
      })
      .catch(err => {
        console.error('Failed to play audio:', err);
        setAudioPlaying(null);
      });
  };
  
  if (loading || (!pronunciationInfo.usAudioUrl && !pronunciationInfo.ukAudioUrl)) {
    return null;
  }
  
  return (
    <div className="pronunciation-preview" style={{ 
      margin: '10px 0', 
      padding: '10px', 
      backgroundColor: '#f5f5f5', 
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px' 
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Pronunciation for "{word}":</div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        {pronunciationInfo.usAudioUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => playAudio(pronunciationInfo.usAudioUrl, 'us')}
              disabled={audioPlaying !== null}
              style={{
                padding: '4px 8px',
                backgroundColor: audioPlaying === 'us' ? '#ccc' : '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: audioPlaying === null ? 'pointer' : 'not-allowed'
              }}
            >
              🇺🇸 {audioPlaying === 'us' ? 'Playing...' : 'Play'}
            </button>
            {pronunciationInfo.usPronunciation && (
              <span>{pronunciationInfo.usPronunciation}</span>
            )}
          </div>
        )}
        
        {pronunciationInfo.ukAudioUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => playAudio(pronunciationInfo.ukAudioUrl, 'uk')}
              disabled={audioPlaying !== null}
              style={{
                padding: '4px 8px',
                backgroundColor: audioPlaying === 'uk' ? '#ccc' : '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: audioPlaying === null ? 'pointer' : 'not-allowed'
              }}
            >
              🇬🇧 {audioPlaying === 'uk' ? 'Playing...' : 'Play'}
            </button>
            {pronunciationInfo.ukPronunciation && (
              <span>{pronunciationInfo.ukPronunciation}</span>
            )}
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
        This audio will be added to your Anki card automatically
      </div>
    </div>
  );
};

export default CardDisplay;
