import React from 'react';
import './Modal.css'; // We'll create this CSS file next

/**
 * A simple reusable Modal component.
 *
 * Props:
 *  - onClose: Function to call when the modal should be closed (e.g., clicking overlay or close button).
 *  - children: The content to display inside the modal.
 */
const Modal = ({ onClose, children }) => {
  // Function to handle clicks on the overlay (background)
  const handleOverlayClick = (e) => {
    // Check if the click was directly on the overlay div
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
};

export default Modal; 