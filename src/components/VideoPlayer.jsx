import { useState } from 'react';
import './VideoPlayer.css';

function VideoPlayer() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
    const video = document.getElementById('showreel-video');
    if (video) {
      video.play();
    }
  };

  const handleClose = () => {
    const video = document.getElementById('showreel-video');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="showreel-button" onClick={handleClick}>
        SHOWREEL
      </div>

      {isOpen && (
        <div className="video-overlay" onClick={handleClose}>
          <video
            id="showreel-video"
            className="video-player"
            src="/assets/showreel.mp4"
            autoPlay
            controls
            playsInline
          />
        </div>
      )}
    </>
  );
}

export default VideoPlayer;
