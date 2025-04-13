import React, { useState } from 'react';
import { setLocalStorageItem } from '../utils/localStorage';

/**
 * Component for entering a native language for translations
 * @param {Object} props - Component props
 * @param {string} props.selectedLanguage - Currently selected language
 * @param {Function} props.onLanguageSelect - Function called when a language is selected
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.showLabel - Whether to show the label (default: false)
 */
const LanguageSelector = ({ selectedLanguage, onLanguageSelect, disabled, showLabel = false }) => {
  const [language, setLanguage] = useState(selectedLanguage);

  const handleChange = (e) => {
    const languageValue = e.target.value;
    setLanguage(languageValue);
  };

  const handleBlur = () => {
    if (language.trim() !== selectedLanguage) {
      onLanguageSelect(language.trim());
      setLocalStorageItem('userNativeLanguage', language.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div className="language-selector form-group">
      {showLabel && <label htmlFor="language-input">Your native language:</label>}
      <input
        id="language-input"
        type="text"
        value={language}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Enter your native language"
        className="form-control"
        disabled={disabled}
      />
      <small className="form-help-text">
        Enter the language you want translations in
      </small>
    </div>
  );
};

export default LanguageSelector; 