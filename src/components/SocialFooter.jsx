import React from "react";
import "./SocialFooter.css";

export default function SocialFooter() {
  return (
    <div className="social-footer-container">
      <div className="social-footer-background">
        {/* Instagram */}
        <a
          href="https://instagram.com/your_profile"
          target="_blank"
          rel="noreferrer"
          className="social-icon"
          aria-label="Instagram"
        >
          <img
            src="/rustam-site/assents/icons/instagram-white.svg"
            className="icon-img white"
            alt="Instagram"
          />
          <img
            src="/rustam-site/assents/icons/instagram-color.svg"
            className="icon-img color"
            alt="Instagram"
          />
        </a>

        {/* Telegram */}
        <a
          href="https://t.me/your_profile"
          target="_blank"
          rel="noreferrer"
          className="social-icon"
          aria-label="Telegram"
        >
          <img
            src="/rustam-site/assents/icons/telegram-white.svg"
            className="icon-img white"
            alt="Telegram"
          />
          <img
            src="/rustam-site/assents/icons/telegram-color.svg"
            className="icon-img color"
            alt="Telegram"
          />
        </a>
      </div>
    </div>
  );
}
