import type { AnalysisResult, NewsHeadline } from '../types';

const PROXY_URL = '/.netlify/functions/gemini-proxy';

/**
 * A helper function to call our Netlify function proxy.
 * @param action The action to perform (e.g., 'analyzeNewsArticle').
 * @param payload The data required for the action.
 * @returns The JSON response from the function.
 */
async function callApi<T>(action: string, payload: unknown): Promise<T> {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        // Use the error message from the serverless function if available
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
}


export const analyzeNewsArticle = async (articleUrl: string, language: string): Promise<AnalysisResult> => {
    return callApi<AnalysisResult>('analyzeNewsArticle', { articleUrl, language });
};

export const translateAnalysisResult = async (analysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
    return callApi<AnalysisResult>('translateAnalysisResult', { analysis, targetLanguage });
};

export const translateTexts = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
    try {
        return await callApi<Record<string, string>>('translateTexts', { texts, targetLanguage });
    } catch (error) {
        console.error("Error translating texts via API, using fallback:", error);
        // Fallback to original texts if translation fails, to preserve UI functionality
        return texts.reduce((acc, text) => {
            acc[text] = text;
            return acc;
        }, {} as Record<string, string>);
    }
};

export const fetchLatestNews = async (category: string): Promise<{ headlines: NewsHeadline[], source: 'live' | 'mock' }> => {
    try {
         return await callApi<{ headlines: NewsHeadline[], source: 'live' | 'mock' }>('fetchLatestNews', { category });
    } catch (error) {
        console.error("Error fetching latest news via API, using fallback:", error);
        const mockNews: NewsHeadline[] = [
            { title: "Global Summit Addresses Climate Change Urgently", source: "Associated Press", url: "#" },
            { title: "New Breakthrough in AI Could Revolutionize Medicine", source: "Reuters", url: "#" },
            { title: "Stock Markets React to New Economic Policies", source: "The Wall Street Journal", url: "#" },
            { title: "Archaeologists Uncover Lost City in the Amazon", source: "National Geographic", url: "#" },
            { title: "Space Mission Successfully Launches to Explore Jupiter's Moons", source: "BBC News", url: "#" },
        ];
        return { headlines: mockNews, source: 'mock' };
    }
};
