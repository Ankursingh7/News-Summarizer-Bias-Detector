
import React from 'react';
import { motion } from 'framer-motion';

interface ErrorAlertProps {
  message: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-lg shadow-md"
      role="alert"
    >
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M10 0a10 10 0 100 20 10 10 0 000-20zM9 14h2v2H9v-2zm0-8h2v6H9V6z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold">Error</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorAlert;