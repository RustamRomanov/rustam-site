import { motion } from "framer-motion";
import ReactPlayer from "react-player";

const HeroSection = () => {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      <ReactPlayer
        url="/assents/video/showreel.mp4"
        playing
        loop
        muted
        controls={false}
        width="100%"
        height="100%"
        className="absolute top-0 left-0 object-cover z-0"
      />
      <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-20 h-full flex flex-col items-center justify-center text-center text-white px-4"
      >
        <h1 className="text-5xl font-bold mb-4">Rustam Romanov</h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Режиссер. Продюсер. Создатель сильных историй.
        </p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
