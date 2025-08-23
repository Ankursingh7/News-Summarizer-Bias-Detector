import { GoogleGenAI, Type } from "@google/genai";
import type { Handler } from "@netlify/functions";
import type { AnalysisResult, NewsHeadline } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set in Netlify build settings");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SCHEMAS ---
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
        classification: { type: Type.STRING },
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

// --- API LOGIC ---

const analyzeArticle = async (articleUrl: string, language: string): Promise<AnalysisResult> => {
    const prompt = `
    You are an expert news analyst. Your task is to analyze the content of the article found at the provided URL and produce a detailed report.
    URL: ${articleUrl}

    Based on the content of the article at the URL, provide the following in a single JSON object:
    1.  **articleTitle**: The original title of the article.
    2.  **Summaries**:
        *   **neutralSummary**: An objective and balanced overview.
        *   **factOnlySummary**: A list of verifiable facts without interpretation.
        *   **eli10Summary**: An 'Explain Like I'm 10' summary.
    3.  **Bias Analysis**: A detailed, evidence-based analysis. For each point, provide a 'finding' and an 'evidence' array of direct quotes.
        *   **Tone**: Overall tone. 'classification' MUST be 'Positive', 'Negative', or 'Neutral' (in English).
        *   **Favoritism**: Does it favor or criticize any side?
        *   **Charged Language**: Use of emotionally charged words.
        *   **Missing Perspectives**: Significant missing perspectives.
        *   **Political Leaning**: Any political leaning (left, right, center, etc.).

    **LANGUAGE REQUIREMENT**: The entire JSON response, including all summaries and findings, MUST be in **${language}**. The only exception is the 'classification' field for Tone.

    **OUTPUT FORMAT**: Your entire response must be ONLY the JSON object. Do not include any markdown formatting like \`\`\`json or any other explanatory text.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  let text = response.text.trim();
  if (text.startsWith('```json')) {
      text = text.substring(7, text.length - 3).trim();
  } else if (text.startsWith('```')) {
      text = text.substring(3, text.length - 3).trim();
  }

  try {
      const parsedJson = JSON.parse(text);
      if (parsedJson.articleTitle && parsedJson.neutralSummary && parsedJson.biasAnalysis) {
          return parsedJson as AnalysisResult;
      } else {
          console.error("Parsed JSON missing required fields:", parsedJson);
          throw new Error("Invalid JSON structure received from API for article analysis.");
      }
  } catch (e) {
      console.error("Failed to parse JSON from Gemini response:", text);
      throw new Error("Could not parse the analysis from the AI model.");
  }
};

const translateAnalysis = async (analysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
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
  
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      },
    });

    const text = response.text.trim();
    return JSON.parse(text) as AnalysisResult;
};

const translateBatchTexts = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1,
        },
    });
    const text = response.text.trim();
    return JSON.parse(text) as Record<string, string>;
};

const fetchNews = async (category: string): Promise<NewsHeadline[]> => {
    const prompt = `
    List 5 recent and significant ${category} news headlines from reputable, major news sources.
    For each headline, provide:
    1. The full title of the article.
    2. The name of the source (e.g., Reuters, BBC News, Associated Press).
    3. The direct URL to the article.
    Your entire response MUST be a valid JSON array of objects. Each object must have the following keys: "title", "source", "url".
    Do not include any text, explanation, or markdown formatting before or after the JSON array.
  `;

  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
  });

  let text = response.text.trim();
  if (text.startsWith('```json')) {
    text = text.substring(7, text.length - 3).trim();
  } else if (text.startsWith('```')) {
    text = text.substring(3, text.length - 3).trim();
  }
  
  const parsedJson = JSON.parse(text);

  if (Array.isArray(parsedJson) && parsedJson.every(item => item.title && item.source && item.url)) {
      return parsedJson as NewsHeadline[];
  } else {
      throw new Error("Invalid JSON structure received from API for news fetch.");
  }
};


// --- HANDLER ---

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        let result: unknown;

        switch (action) {
            case 'analyze':
                const { articleUrl, language } = body;
                if (!articleUrl || !language) throw new Error("Missing parameters for 'analyze' action");
                result = await analyzeArticle(articleUrl, language);
                break;
            
            case 'translate':
                const { analysis, targetLanguage } = body;
                if (!analysis || !targetLanguage) throw new Error("Missing parameters for 'translate' action");
                result = await translateAnalysis(analysis, targetLanguage);
                break;

            case 'translateTexts':
                const { texts, targetLanguage: lang } = body;
                 if (!texts || !lang) throw new Error("Missing parameters for 'translateTexts' action");
                result = await translateBatchTexts(texts, lang);
                break;
            
            case 'fetchNews':
                const { category } = body;
                if (!category) throw new Error("Missing parameters for 'fetchNews' action");
                result = await fetchNews(category);
                break;

            default:
                throw new Error(`Invalid action specified: ${action}`);
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error("Netlify Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : "An unknown server error occurred." }),
        };
    }
};
