import { motion } from "framer-motion";

export default function SocialIcon({ href, icon: Icon, label }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.2 }}
      className="mx-2"
      aria-label={label}
    >
      <motion.div
        className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        whileHover={{
          boxShadow: "0 0 15px rgba(255,255,255,0.4)",
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>
    </motion.a>
  );
}
