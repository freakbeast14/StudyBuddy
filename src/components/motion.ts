import type { Variants } from "framer-motion";

export const spring = {
  type: "spring",
  stiffness: 320,
  damping: 24,
  mass: 0.7,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { ...spring } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

export const cardHoverTap = {
  whileHover: { y: -4, boxShadow: "0 12px 30px -18px rgba(0,0,0,0.35)" },
  whileTap: { y: 0, scale: 0.98 },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { ...spring } },
};
