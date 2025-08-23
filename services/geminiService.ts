import type { AnalysisResult, NewsHeadline } from '../types';

async function apiCall<T>(action: string, params: Record<string, any>): Promise<T> {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export const analyzeNewsArticle = async (articleUrl: string, language: string): Promise<AnalysisResult> => {
    try {
        return await apiCall<AnalysisResult>('analyze', { articleUrl, language });
    } catch (error) {
        console.error("Error analyzing news article:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get analysis from the AI model: ${error.message}`);
        }
        throw new Error("Failed to get analysis from the AI model.");
    }
};

export const translateAnalysisResult = async (analysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
    try {
        return await apiCall<AnalysisResult>('translate', { analysis, targetLanguage });
    } catch (error) {
        console.error("Error translating analysis result:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to translate the analysis: ${error.message}`);
        }
        throw new Error("Failed to translate the analysis.");
    }
};

export const translateTexts = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
    try {
        return await apiCall<Record<string, string>>('translateTexts', { texts, targetLanguage });
    } catch (error) {
        console.error("Error translating texts:", error);
        // Fallback to original texts if translation fails
        return texts.reduce((acc, text) => {
            acc[text] = text;
            return acc;
        }, {} as Record<string, string>);
    }
};

export const fetchLatestNews = async (category: string): Promise<NewsHeadline[]> => {
  try {
    const news = await apiCall<NewsHeadline[]>('fetchNews', { category });
    if (Array.isArray(news)) {
        return news;
    }
    console.warn("API for fetch news did not return an array:", news);
    return [];
  } catch (error) {
    console.error("Error fetching latest news:", error);
    // Return empty array on failure so the UI can handle it gracefully.
    return [];
  }
};
