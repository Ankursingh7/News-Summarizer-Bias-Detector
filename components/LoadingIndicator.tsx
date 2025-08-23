import React from 'react';
import { motion, AnimatePresence, Transition } from 'framer-motion';

const loadingTexts = [
  "Reading the article...",
  "Analyzing the language...",
  "Checking for bias...",
  "Crafting the summary...",
  "Finalizing the report...",
];

const LoadingIndicator: React.FC = () => {
    const [textIndex, setTextIndex] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const dotVariants = {
        initial: { y: "0%" },
        animate: { y: ["0%", "-60%", "0%"] }
    };

    const dotTransition: Transition = {
        duration: 0.7,
        repeat: Infinity,
        ease: "easeInOut"
    };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="flex items-end justify-center space-x-2 h-16">
          <motion.span variants={dotVariants} transition={dotTransition} className="w-4 h-4 bg-indigo-600 rounded-full" />
          <motion.span variants={dotVariants} transition={{ ...dotTransition, delay: 0.2 }} className="w-4 h-4 bg-indigo-600 rounded-full" />
          <motion.span variants={dotVariants} transition={{ ...dotTransition, delay: 0.4 }} className="w-4 h-4 bg-indigo-600 rounded-full" />
      </div>
       <AnimatePresence mode="wait">
        <motion.p
            key={textIndex}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-lg font-semibold text-indigo-700"
        >
            {loadingTexts[textIndex]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
};

export default LoadingIndicator;
