
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisResult, BiasAnalysisDetails, BiasPoint, TonePoint } from '../types';

interface NewsSummaryCardProps {
  result: AnalysisResult;
  onReconvert: (language: string) => void;
  isReconverting: boolean;
  currentLanguage: string;
}

const languages = [
    'English', 'Hindi', 'Marathi', 'Telugu', 'Tamil', 'Bengali', 'Kannada', 
    'Spanish', 'French', 'German', 'Japanese', 'Portuguese', 'Russian', 'Chinese (Simplified)'
];

interface BiasItemProps {
    icon: string;
    label: string;
    biasPoint: BiasPoint | TonePoint;
    delay: number;
    classification?: 'Positive' | 'Negative' | 'Neutral';
}

const BiasItem: React.FC<BiasItemProps> = ({ icon, label, biasPoint, delay, classification }) => {
    const classificationStyles = {
      Positive: 'bg-green-100 text-green-800 border-green-200',
      Negative: 'bg-red-100 text-red-800 border-red-200',
      Neutral: 'bg-gray-200 text-gray-800 border-gray-300',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + delay, duration: 0.4 }}
            className="flex flex-col"
        >
            <div className="flex items-start mb-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg mr-4 mt-1">
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-indigo-800">{label}</h4>
                        {classification && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${classificationStyles[classification]}`}>
                                {classification}
                            </span>
                        )}
                    </div>
                    <p className="text-indigo-900/80 leading-relaxed text-sm mt-1">{biasPoint.finding}</p>
                </div>
            </div>
            {biasPoint.evidence && biasPoint.evidence.length > 0 && (
                <div className="pl-12 mt-1">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Evidence</h5>
                    <div className="space-y-2">
                        {biasPoint.evidence.map((quote, index) => (
                            <motion.blockquote
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + delay + (index * 0.05), duration: 0.3 }}
                                className="border-l-4 border-indigo-200 pl-3 text-sm text-gray-600 italic"
                            >
                                "{quote}"
                            </motion.blockquote>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

type TabId = 'neutral' | 'fact-only' | 'eli10';

const NewsSummaryCard: React.FC<NewsSummaryCardProps> = ({ result, onReconvert, isReconverting, currentLanguage }) => {
  const { articleTitle, neutralSummary, factOnlySummary, eli10Summary, biasAnalysis } = result;
  const [activeTab, setActiveTab] = useState<TabId>('neutral');

  const tabs = [
    { id: 'neutral', label: 'Neutral', content: neutralSummary },
    { id: 'fact-only', label: 'Fact-Only', content: factOnlySummary },
    { id: 'eli10', label: "ELI10", content: eli10Summary },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-6 w-full max-w-3xl mx-auto mt-6 border border-gray-200 transition-shadow duration-300 hover:shadow-xl"
    >
        <AnimatePresence>
            {isReconverting && (
                <motion.div
                    key="reconvert-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl"
                >
                    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 font-semibold text-indigo-700">Translating report...</p>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
            >
                {articleTitle}
            </motion.h2>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex-shrink-0"
            >
                <div className="relative w-full sm:w-44">
                    <select
                        value={currentLanguage}
                        onChange={(e) => onReconvert(e.target.value)}
                        disabled={isReconverting}
                        className="w-full h-10 pl-3 pr-8 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                        aria-label="Change report language"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </motion.div>
        </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="flex items-center text-xl font-bold text-gray-800 mb-4">
          <span className="text-2xl mr-3">📰</span>
          Summaries
        </h3>

        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`${
                activeTab === tab.id ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              } relative font-medium px-4 py-2 transition-colors duration-200 focus:outline-none`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-indigo-600"
                  layoutId="underline"
                />
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-4 min-h-[120px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
            >
              {tabs.find(t => t.id === activeTab)?.content}
            </motion.p>
          </AnimatePresence>
        </div>

      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="flex items-center text-xl font-bold text-gray-800 mb-5">
            <span className="text-2xl mr-3">⚖️</span>
            Bias Analysis
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 bg-indigo-50 p-5 rounded-xl border border-indigo-200">
            <BiasItem icon="🗣️" label="Tone" biasPoint={biasAnalysis.tone} classification={biasAnalysis.tone.classification} delay={0} />
            <BiasItem icon="🤔" label="Favoritism & Criticism" biasPoint={biasAnalysis.favoritism} delay={0.1} />
            <BiasItem icon="🔥" label="Emotionally Charged Language" biasPoint={biasAnalysis.chargedLanguage} delay={0.2} />
            <BiasItem icon="🧩" label="Missing Perspectives" biasPoint={biasAnalysis.missingPerspectives} delay={0.3} />
            <BiasItem icon="🏛️" label="Political Leaning" biasPoint={biasAnalysis.politicalLeaning} delay={0.4} />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NewsSummaryCard;
