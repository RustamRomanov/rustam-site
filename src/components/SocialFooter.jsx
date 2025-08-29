
import React from 'react';
import { FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import './SocialFooter.css';

export default function SocialFooter() {
  return (
    <div className="social-footer">
      <a href="https://instagram.com/your_profile" target="_blank" rel="noopener noreferrer">
        <FaInstagram className="social-icon" />
      </a>
      <a href="https://t.me/your_profile" target="_blank" rel="noopener noreferrer">
        <FaTelegramPlane className="social-icon" />
      </a>
    </div>
  );
}
