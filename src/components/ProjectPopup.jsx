const SocialFooter = () => {
  return (
    <footer className="absolute bottom-6 left-6 text-sm text-white z-20">
      <div className="flex space-x-4">
        <a
          href="https://instagram.com/rustamromanov.ru"
          className="hover:scale-110 transition-transform hover:text-pink-400"
          target="_blank"
        >
          📷 Instagram
        </a>
        <a
          href="https://t.me/rustamromanov"
          className="hover:scale-110 transition-transform hover:text-blue-400"
          target="_blank"
        >
          ✈️ Telegram
        </a>
      </div>
    </footer>
  );
};

export default SocialFooter;
