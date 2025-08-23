
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchLatestNews, translateTexts } from '../services/geminiService';
import type { NewsHeadline } from '../types';

const englishCategories = ['Political', 'International', 'Indian'];

interface LatestNewsProps {
    language: string;
    onAnalyzeUrl: (url: string) => void;
}

const LatestNews: React.FC<LatestNewsProps> = ({ language, onAnalyzeUrl }) => {
    const [activeCategory, setActiveCategory] = useState<string>('Political');
    const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isFallback, setIsFallback] = useState<boolean>(false);
    const [translatedCategories, setTranslatedCategories] = useState<Record<string, string>>(() => 
        englishCategories.reduce((acc, cat) => ({ ...acc, [cat]: cat }), {})
    );

    useEffect(() => {
        const getTranslations = async () => {
            if (language === 'English' || !language) {
                setTranslatedCategories(englishCategories.reduce((acc, cat) => ({ ...acc, [cat]: cat }), {}));
                return;
            }
            try {
                const translations = await translateTexts(englishCategories, language);
                setTranslatedCategories(translations);
            } catch (e) {
                console.error("Failed to translate categories", e);
                 // Fallback to English if translation fails
                setTranslatedCategories(englishCategories.reduce((acc, cat) => ({ ...acc, [cat]: cat }), {}));
            }
        };

        getTranslations();
    }, [language]);

    useEffect(() => {
        const getNews = async () => {
            try {
                setIsLoading(true);
                setError(null);
                setIsFallback(false); // Reset on each fetch

                const { headlines: news, source } = await fetchLatestNews(activeCategory);
                
                if (news.length === 0) {
                    const categoryName = translatedCategories[activeCategory]?.toLowerCase() || activeCategory.toLowerCase();
                    setError(`Could not fetch recent ${categoryName} news at this time.`);
                } else {
                    setHeadlines(news);
                    if (source === 'mock') {
                        setIsFallback(true);
                    }
                }
            } catch (err) {
                setError("An error occurred while fetching news.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        getNews();
    }, [activeCategory, translatedCategories]);

    const NewsSkeleton = () => (
        <div className="animate-pulse flex flex-col space-y-3">
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white/60 backdrop-blur-sm shadow-md rounded-2xl p-6 w-full max-w-3xl mx-auto mt-6 border border-gray-200 transition-shadow duration-300 hover:shadow-lg"
        >
            <h2 className="flex items-center text-xl font-bold text-gray-800 mb-5">
                <span className="text-2xl mr-3">🌐</span>
                Latest Headlines
            </h2>
            
             <div className="flex border-b border-gray-200 mb-5">
              {englishCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`${
                    activeCategory === category ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  } relative font-medium px-3 sm:px-4 py-2 transition-colors duration-200 focus:outline-none text-sm`}
                  aria-pressed={activeCategory === category}
                >
                  {translatedCategories[category] || category}
                  {activeCategory === category && (
                    <motion.div
                      className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-indigo-600"
                      layoutId="latestNewsUnderline"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {isFallback && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 text-sm text-center text-amber-800 bg-amber-100 border border-amber-200 rounded-lg"
              >
                Live headlines are currently unavailable. Showing sample news.
              </motion.div>
            )}

            <div className="space-y-3 min-h-[290px]">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            {Array.from({ length: 5 }).map((_, i) => <NewsSkeleton key={i} />)}
                        </motion.div>
                    ) : error ? (
                         <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-center text-gray-500 flex items-center justify-center h-[290px]"
                         >
                            <p>{error}</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={activeCategory}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                             className="space-y-2"
                        >
                            {headlines.map((headline, index) => (
                                <motion.div
                                    key={headline.url}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.07, duration: 0.3 }}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-50 transition-colors duration-200 group"
                                >
                                    <a
                                        href={headline.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block flex-grow mr-4 group-hover:translate-x-1 transition-transform duration-200"
                                    >
                                        <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">
                                            {headline.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">{headline.source}</p>
                                    </a>
                                    <motion.button
                                        onClick={() => onAnalyzeUrl(headline.url)}
                                        className="flex-shrink-0 px-3 py-1 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        aria-label={`Analyze article: ${headline.title}`}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Analyze
                                    </motion.button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default LatestNews;
