import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, NewsHeadline } from '../types';

// Note: The application has been converted to make direct client-side API calls.
// The /api and /functions directories are no longer used and can be safely deleted.

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * Throws an error if the API key is not configured.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set. Please ensure it is available in your environment.");
    }
    
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
};


// --- SCHEMAS (for JSON responses) ---
const biasPointSchema = {
    type: Type.OBJECT,
    properties: {
        finding: { type: Type.STRING },
        evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["finding", "evidence"],
};

const tonePointSchema = {
    type: Type.OBJECT,
    properties: {
        classification: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] },
        finding: { type: Type.STRING },
        evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["classification", "finding", "evidence"],
};

const biasAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    tone: tonePointSchema,
    favoritism: biasPointSchema,
    chargedLanguage: biasPointSchema,
    missingPerspectives: biasPointSchema,
    politicalLeaning: biasPointSchema,
  },
  required: ["tone", "favoritism", "chargedLanguage", "missingPerspectives", "politicalLeaning"],
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    articleTitle: { type: Type.STRING },
    neutralSummary: { type: Type.STRING },
    factOnlySummary: { type: Type.STRING },
    eli10Summary: { type: Type.STRING },
    biasAnalysis: biasAnalysisSchema,
  },
  required: ["articleTitle", "neutralSummary", "factOnlySummary", "eli10Summary", "biasAnalysis"],
};

/**
 * Uses Google Search grounding to extract the main textual content from a news article URL.
 * @param articleUrl The URL of the news article.
 * @returns The main text content of the article.
 */
const getArticleContent = async (articleUrl: string): Promise<string> => {
    const aiClient = getAiClient();
    const prompt = `
        Please extract and return ONLY the main text content of the news article at the following URL.
        Do not include any ads, navigation links, comments, or boilerplate text from the website's template.
        Focus solely on the body of the article.
        URL: ${articleUrl}
    `;
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching article content:", error);
        throw new Error("Failed to retrieve article content from the URL.");
    }
};


export const analyzeNewsArticle = async (articleUrl: string, language: string): Promise<AnalysisResult> => {
    // Step 1: Fetch the article content using the search-grounded model.
    const articleContent = await getArticleContent(articleUrl);
    
    if (!articleContent || articleContent.trim().length < 150) { // Check for meaningful content
        throw new Error("Could not retrieve sufficient article content from the provided URL. It might be behind a paywall or inaccessible.");
    }

    // Step 2: Analyze the fetched content using JSON mode for a reliable structure.
    const aiClient = getAiClient();
    const analysisPrompt = `
    You are an expert news analyst. Your task is to analyze the content of the article provided below and produce a detailed report.
    
    ARTICLE CONTENT:
    ---
    ${articleContent}
    ---

    Based on the article content above, provide the following in a single JSON object:
    1.  **articleTitle**: The original title of the article. If you cannot find it, create a suitable title based on the content.
    2.  **Summaries**:
        *   **neutralSummary**: An objective and balanced overview.
        *   **factOnlySummary**: A list of verifiable facts without interpretation.
        *   **eli10Summary**: An 'Explain Like I'm 10' summary.
    3.  **Bias Analysis**: A detailed, evidence-based analysis. For each point, provide a 'finding' and an 'evidence' array of direct quotes from the provided article content.
        *   **Tone**: Overall tone. 'classification' MUST be 'Positive', 'Negative', or 'Neutral'.
        *   **Favoritism**: Does it favor or criticize any person, group, or entity?
        *   **Charged Language**: Use of emotionally charged or loaded words.
        *   **Missing Perspectives**: Significant viewpoints or context that are missing.
        *   **Political Leaning**: Any discernible political leaning (e.g., left, right, center, libertarian, etc.).

    **LANGUAGE REQUIREMENT**: The entire JSON response, including all summaries, findings, and evidence, MUST be in **${language}**. The only exception is the 'classification' field for Tone, which must remain in English.
  `;

    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: analysisPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: analysisSchema,
              temperature: 0.2,
            },
        });

        // The response from the model with JSON mode should be clean JSON.
        const parsedJson = JSON.parse(response.text.trim());

        // A final check to ensure the structure is what we expect.
        if (parsedJson.articleTitle && parsedJson.neutralSummary && parsedJson.biasAnalysis) {
            return parsedJson as AnalysisResult;
        } else {
            console.error("Parsed JSON missing required fields:", parsedJson);
            throw new Error("Invalid JSON structure received from AI for article analysis.");
        }
    } catch (error) {
        console.error("Error analyzing news article content:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get analysis from the AI model: ${error.message}`);
        }
        throw new Error("Failed to get analysis from the AI model.");
    }
};

export const translateAnalysisResult = async (analysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
    const aiClient = getAiClient();
    const prompt = `
      You are an expert translator. Your task is to translate the user-facing text content of the following JSON object into the specified target language.
      Target Language: **${targetLanguage}**
      JSON object to translate: ${JSON.stringify(analysis, null, 2)}
      **Instructions**:
      1.  Translate ALL string values in the JSON object, including titles, summaries, findings, and evidence quotes.
      2.  The JSON structure MUST be preserved exactly as in the original. Do not add, remove, or rename any keys.
      3.  **VERY IMPORTANT EXCEPTION**: The value for the key \`biasAnalysis.tone.classification\` MUST remain in English and be one of 'Positive', 'Negative', or 'Neutral'. Do NOT translate this specific value.
      4.  Ensure the translations are natural and maintain the original meaning and context of the news analysis.
      Provide your entire response as a single, valid JSON object that conforms to the schema. Do not include any other text or markdown formatting.
    `;
    
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.1,
            },
        });
        return JSON.parse(response.text.trim()) as AnalysisResult;
    } catch (error) {
        console.error("Error translating analysis result:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to translate the analysis: ${error.message}`);
        }
        throw new Error("Failed to translate the analysis.");
    }
};

export const translateTexts = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
    const aiClient = getAiClient();
    const prompt = `
      Translate the following English words into ${targetLanguage}.
      Provide the response as a single JSON object where keys are the original English words and values are their translations.
      Words to translate: ${JSON.stringify(texts)}
    `;

    const schema = {
      type: Type.OBJECT,
      properties: texts.reduce((acc, text) => {
          acc[text] = { type: Type.STRING };
          return acc;
      }, {} as Record<string, { type: Type }>),
      required: texts,
    };

    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1,
            },
        });
        return JSON.parse(response.text.trim()) as Record<string, string>;
    } catch (error) {
        console.error("Error translating texts:", error);
        // Fallback to original texts if translation fails
        return texts.reduce((acc, text) => {
            acc[text] = text;
            return acc;
        }, {} as Record<string, string>);
    }
};

export const fetchLatestNews = async (category: string): Promise<{ headlines: NewsHeadline[], source: 'live' | 'mock' }> => {
    const aiClient = getAiClient();
    const prompt = `
    List 5 recent and significant ${category} news headlines from reputable, major news sources.
    For each headline, provide:
    1. The full title of the article.
    2. The name of the source (e.g., Reuters, BBC News, Associated Press).
    3. The direct URL to the article.
    Your entire response MUST be a valid JSON array of objects. Each object must have the following keys: "title", "source", "url".
    Do not include any text, explanation, or markdown formatting before or after the JSON array.
  `;

  try {
      const response = await aiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
          },
      });

      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7, cleanText.length - 3).trim();
      } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3, cleanText.length - 3).trim();
      }
      
      const parsedJson = JSON.parse(cleanText);

      if (Array.isArray(parsedJson) && parsedJson.every(item => item.title && item.source && item.url)) {
          return { headlines: parsedJson as NewsHeadline[], source: 'live' };
      } else {
          console.warn("API for fetch news did not return a valid array, using fallback.", parsedJson);
          throw new Error("Invalid JSON structure received from API for news fetch.");
      }
  } catch (error) {
    console.error("Error fetching latest news, using fallback:", error);
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