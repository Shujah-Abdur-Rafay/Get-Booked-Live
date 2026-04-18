import { motion } from "framer-motion";
import { forwardRef, ComponentPropsWithoutRef } from "react";

/**
 * Wraps any element with whileHover/whileTap scale. 
 * Use as a direct replacement for <button> or wrap around Link children.
 */
export const MotionButton = motion.button;

export const hoverTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
};

export const arrowHover = {
  whileHover: { x: 4 },
  transition: { duration: 0.15 },
};
