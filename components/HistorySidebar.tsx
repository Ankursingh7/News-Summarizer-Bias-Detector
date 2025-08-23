
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryItem } from '../types';

interface HistorySidebarProps {
  history: HistoryItem[];
  activeId: string | null;
  onSelectItem: (id: string) => void;
  onClearHistory: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, activeId, onSelectItem, onClearHistory }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white/60 backdrop-blur-sm shadow-md rounded-2xl p-6 border border-gray-200 h-full flex flex-col transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="flex justify-between items-center mb-5">
        <h2 className="flex items-center text-xl font-bold text-gray-800">
          <span className="text-2xl mr-3">📜</span>
          History
        </h2>
        {history.length > 0 && (
          <motion.button
            onClick={onClearHistory}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors hover:underline"
            aria-label="Clear analysis history"
            whileTap={{ scale: 0.95 }}
          >
            Clear
          </motion.button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto -mr-3 pr-3" style={{maxHeight: '60vh'}}>
        <AnimatePresence>
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500 pt-8"
            >
              <p>Your analyzed articles will appear here.</p>
            </motion.div>
          ) : (
            <ul className="space-y-2">
              {history.map((item, index) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <motion.button
                    onClick={() => onSelectItem(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      activeId === item.id
                        ? 'bg-indigo-100 text-indigo-800 scale-[1.02]'
                        : 'hover:bg-gray-100 hover:translate-x-1'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.url}</p>
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default HistorySidebar;
