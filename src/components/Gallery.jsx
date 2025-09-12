import { motion } from "framer-motion";

const FadeIn = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.8 }}
  >
    {children}
  </motion.div>
);

const Gallery = () => {
  return (
    <section id="gallery" className="py-20 px-6 bg-black text-white">
      <FadeIn>
        <h2 className="text-3xl font-bold text-center mb-10">Проекты</h2>
      </FadeIn>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <FadeIn key={item}>
            <div className="h-64 bg-gray-800 rounded-lg"></div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
};

export default Gallery;
