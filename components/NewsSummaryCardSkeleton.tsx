
import React from 'react';
import { motion } from 'framer-motion';

const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const NewsSummaryCardSkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-6 w-full max-w-3xl mx-auto mt-6 border border-gray-200"
      aria-label="Loading analysis"
    >
      {/* Title Skeleton */}
      <SkeletonBlock className="h-8 w-3/4 mb-6" />

      {/* Summaries Section Skeleton */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <SkeletonBlock className="h-7 w-48" />
        </div>
        
        {/* Tabs Skeleton */}
        <div className="flex border-b border-gray-200 mb-4">
          <SkeletonBlock className="h-10 w-20 mr-2" />
          <SkeletonBlock className="h-10 w-20 mr-2" />
          <SkeletonBlock className="h-10 w-20" />
        </div>

        {/* Summary Content Skeleton */}
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      </div>

      {/* Bias Analysis Section Skeleton */}
      <div>
        <div className="flex items-center mb-5">
            <SkeletonBlock className="h-7 w-56" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 bg-indigo-50 p-5 rounded-xl border border-indigo-200">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start">
              <SkeletonBlock className="w-8 h-8 rounded-full mr-4 mt-1 flex-shrink-0" />
              <div className="w-full">
                <SkeletonBlock className="h-5 w-3/4 mb-2" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default NewsSummaryCardSkeleton;
