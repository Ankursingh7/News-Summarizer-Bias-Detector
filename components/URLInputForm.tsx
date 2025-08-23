
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
    'English',
    'Hindi',
    'Marathi',
    'Telugu',
    'Tamil',
    'Bengali',
    'Kannada',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Portuguese',
    'Russian',
    'Chinese (Simplified)'
];

const URLInputForm: React.FC<URLInputFormProps> = ({ onSubmit, isLoading, selectedLanguage, onLanguageChange }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-grow w-full">
            <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
            </svg>
            <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news/article"
                className="w-full h-12 pl-12 pr-4 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
                disabled={isLoading}
            />
            </div>
            <div className="relative flex-shrink-0 w-full sm:w-44">
                <select
                    value={selectedLanguage}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-12 pl-4 pr-10 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                    aria-label="Select analysis language"
                >
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
        <motion.button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center h-12 px-8 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out"
          whileTap={isLoading ? undefined : { scale: 0.97 }}
          animate={isLoading ? { scale: [1, 1.02, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } : { scale: 1 }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            'Analyze'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default URLInputForm;
