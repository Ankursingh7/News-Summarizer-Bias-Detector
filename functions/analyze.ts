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
    You are an expert news analyst. Please analyze the article at the following URL: ${articleUrl}
    Your task is to provide the article's title, THREE different summaries, and a detailed, evidence-based bias analysis.
    1.  **Article Title**: Provide the original title of the article.
    2.  **Summaries**:
        *   **neutralSummary**: A 'Neutral Summary'. This should be an objective and balanced overview of the article's main points.
        *   **factOnlySummary**: A 'Fact-Only' summary. List only the verifiable facts presented in the article without interpretation, context, or narrative flow.
        *   **eli10Summary**: An 'Explain Like I'm 10' summary. Use very simple, child-friendly language to explain the main points of the article.
    3.  **Bias Analysis**: Perform a thorough analysis of potential bias in the article. For each of the following points, provide a 'finding' with your analysis and an 'evidence' array containing direct quotes from the article that support your finding. If no direct quotes apply, provide an empty array for 'evidence'.
        *   **Tone**: What is the overall tone? Critically, the value for the 'classification' field MUST be one of the following exact English strings: 'Positive', 'Negative', or 'Neutral'. The 'finding' and 'evidence' for the tone should be in the requested language.
        *   **Favoritism**: Does the article favor or criticize any side?
        *   **Charged Language**: Are there emotionally charged words?
        *   **Missing Perspectives**: Are there any significant perspectives missing?
        *   **Political Leaning**: Does the article show a political leaning (e.g., left, right, center, or leaning towards a specific party/ideology)?
    **VERY IMPORTANT**: Your entire response, including all summaries and bias analysis findings, MUST be in the following language: **${language}**. The only exception is the 'classification' field for Tone, which must remain in English.
    Provide your entire response as a single JSON object that conforms to the provided schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
      temperature: 0.2,
    },
  });

  const text = response.text.trim();
  const parsedJson = JSON.parse(text);
  
  if (parsedJson.articleTitle && parsedJson.neutralSummary && parsedJson.biasAnalysis) {
      return parsedJson as AnalysisResult;
  } else {
      throw new Error("Invalid JSON structure received from API for article analysis.");
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
