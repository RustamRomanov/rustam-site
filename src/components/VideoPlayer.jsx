import { useState } from 'react';
import ReactPlayer from 'react-player';

const ShowreelPlayer = () => {
  const [open, setOpen] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <>
      <div
        className="absolute top-[140px] left-1/2 -translate-x-1/2 cursor-pointer bg-white bg-opacity-10 px-6 py-2 rounded-md hover:bg-opacity-20 transition-all"
        onClick={() => setOpen(true)}
      >
        ▶️ Showreel
      </div>

      {open && (
        <div
          tabIndex="0"
          onKeyDown={handleKeyDown}
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
        >
          <div className="relative w-[80vw] max-w-4xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-[-50px] right-0 text-white text-2xl"
            >
              ✕
            </button>
            <ReactPlayer
              url="/assents/video/showreel.mp4"
              playing
              controls
              volume={1}
              width="100%"
              height="100%"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ShowreelPlayer;
