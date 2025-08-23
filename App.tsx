
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import URLInputForm from './components/URLInputForm';
import NewsSummaryCard from './components/NewsSummaryCard';
import NewsSummaryCardSkeleton from './components/NewsSummaryCardSkeleton';
import ErrorAlert from './components/ErrorAlert';
import LatestNews from './components/LatestNews';
import HistorySidebar from './components/HistorySidebar';
import { analyzeNewsArticle, translateAnalysisResult } from './services/geminiService';
import type { AnalysisResult, HistoryItem } from './types';

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReconverting, setIsReconverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('English');

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory) as HistoryItem[];
        // Sort by timestamp, newest first
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(parsed);
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('analysisHistory');
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('analysisHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  const handleUrlSubmit = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveHistoryId(url);

    const existingItem = history.find(item => item.url === url);
    if (existingItem) {
        setAnalysisResult(existingItem.analysis);
        setIsLoading(false);
        return;
    }

    try {
      const result = await analyzeNewsArticle(url, language);
      setAnalysisResult(result);
      
      const newHistoryItem: HistoryItem = {
        id: url,
        url: url,
        title: result.articleTitle,
        analysis: result,
        timestamp: Date.now()
      };

      setHistory(prevHistory => [newHistoryItem, ...prevHistory.filter(item => item.id !== url)]);

    } catch (err) {
      if (err instanceof Error) {
        setError(`An error occurred: ${err.message}. Please check the URL or try again later.`);
      } else {
        setError("An unknown error occurred.");
      }
      setActiveHistoryId(null);
    } finally {
      setIsLoading(false);
    }
  }, [history, language]);

  const handleSelectHistoryItem = useCallback((id: string) => {
    const item = history.find(h => h.id === id);
    if (item) {
        setIsLoading(false);
        setError(null);
        setAnalysisResult(item.analysis);
        setActiveHistoryId(item.id);
    }
  }, [history]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setAnalysisResult(null);
    setActiveHistoryId(null);
  }, []);

  const handleReconvert = useCallback(async (newLanguage: string) => {
    if (!analysisResult || !activeHistoryId) return;

    setIsReconverting(true);
    setError(null);
    setLanguage(newLanguage);

    try {
        const translatedResult = await translateAnalysisResult(analysisResult, newLanguage);
        setAnalysisResult(translatedResult);

        setHistory(prevHistory => 
            prevHistory.map(item => 
                item.id === activeHistoryId 
                ? { ...item, analysis: translatedResult } 
                : item
            )
        );

    } catch (err) {
        if (err instanceof Error) {
            setError(`Failed to translate analysis: ${err.message}. Please try again.`);
        } else {
            setError("An unknown error occurred during translation.");
        }
    } finally {
        setIsReconverting(false);
    }
  }, [analysisResult, activeHistoryId]);


  return (
    <div className="min-h-screen w-full bg-[#CBD8E8] text-gray-800 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
                <motion.header 
                    className="text-center mb-8"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
                    }}
                >
                    <motion.h1 
                        className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                        variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
                    >
                        <span
                            className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600"
                            style={{ backgroundSize: '200% 200%', animation: 'gradient-pan 3s ease-in-out infinite' }}
                        >
                            News Bias Analyzer
                        </span>
                    </motion.h1>
                    <motion.p 
                        className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto"
                        variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
                    >
                        Get an AI-powered summary and detailed bias analysis from any news article URL.
                    </motion.p>
                </motion.header>

                <main>
                    <URLInputForm
                        onSubmit={handleUrlSubmit}
                        isLoading={isLoading}
                        selectedLanguage={language}
                        onLanguageChange={setLanguage}
                    />

                    <div className="mt-8">
                        <AnimatePresence mode="wait">
                          {isLoading ? (
                            <NewsSummaryCardSkeleton />
                          ) : error ? (
                            <ErrorAlert message={error} />
                          ) : analysisResult ? (
                            <NewsSummaryCard 
                                result={analysisResult} 
                                onReconvert={handleReconvert}
                                isReconverting={isReconverting}
                                currentLanguage={language}
                            />
                          ) : (
                            <LatestNews language={language} />
                          )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
            
            <div className="lg:col-span-1 sticky top-8">
                <HistorySidebar 
                    history={history} 
                    activeId={activeHistoryId}
                    onSelectItem={handleSelectHistoryItem}
                    onClearHistory={handleClearHistory}
                />
            </div>
        </div>
        <motion.footer 
            className="text-center mt-12 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
        >
            <p>Powered by Google Gemini. Analysis may not always be perfect.</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default App;
