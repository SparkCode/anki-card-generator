import React, { useState } from 'react';
import { setLocalStorageItem } from '../utils/localStorage';

/**
 * Component for entering the user's English level
 * @param {Object} props - Component props
 * @param {string} props.selectedLevel - Currently selected English level
 * @param {Function} props.onLevelSelect - Function called when a level is selected
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.showLabel - Whether to show the label (default: false)
 */
const EnglishLevelSelector = ({ selectedLevel, onLevelSelect, disabled, showLabel = false }) => {
  const [level, setLevel] = useState(selectedLevel);

  const handleChange = (e) => {
    const levelValue = e.target.value;
    setLevel(levelValue);
  };

  const handleBlur = () => {
    if (level.trim() !== selectedLevel) {
      onLevelSelect(level.trim());
      setLocalStorageItem('userEnglishLevel', level.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div className="level-selector form-group">
      {showLabel && <label htmlFor="level-input">Your English level:</label>}
      <input
        id="level-input"
        type="text"
        value={level}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Enter your English level (e.g., B2, C1, A2)"
        className="form-control"
        disabled={disabled}
      />
      <small className="form-help-text">
        Specify your English level (e.g., B2, C1, A2-B1, Advanced)
      </small>
    </div>
  );
};

export default EnglishLevelSelector; 