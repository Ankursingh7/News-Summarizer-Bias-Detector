import { GoogleGenAI, Type } from "@google/genai";
import type { Handler } from "@netlify/functions";
import type { AnalysisResult, NewsHeadline } from "../types";

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
    1. **articleTitle**
    2. **Summaries**
        * neutralSummary
        * factOnlySummary
        * eli10Summary
    3. **Bias Analysis**
        * Tone (classification: Positive, Negative, Neutral in English only)
        * Favoritism
        * Charged Language
        * Missing Perspectives
        * Political Leaning

    LANGUAGE REQUIREMENT: All output must be in ${language}, except tone.classification (must remain in English).
    OUTPUT FORMAT: Strict JSON only.
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
  if (text.startsWith("```json")) {
    text = text.substring(7, text.length - 3).trim();
  } else if (text.startsWith("```")) {
    text = text.substring(3, text.length - 3).trim();
  }

  try {
    const parsedJson = JSON.parse(text);
    if (parsedJson.articleTitle && parsedJson.neutralSummary && parsedJson.biasAnalysis) {
      return parsedJson as AnalysisResult;
    } else {
      throw new Error("Invalid JSON structure received from API for article analysis.");
    }
  } catch (e) {
    throw new Error("Could not parse the analysis from the AI model.");
  }
};

const translateAnalysis = async (analysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const prompt = `
    Translate the following JSON object into ${targetLanguage}.
    Preserve structure. Do not translate biasAnalysis.tone.classification (must remain Positive/Negative/Neutral).
    JSON: ${JSON.stringify(analysis, null, 2)}
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

  return JSON.parse(response.text.trim()) as AnalysisResult;
};

const translateBatchTexts = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
  const prompt = `
    Translate the following words into ${targetLanguage}.
    Return JSON where keys are original words and values are translations.
    Words: ${JSON.stringify(texts)}
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

  return JSON.parse(response.text.trim()) as Record<string, string>;
};

const fetchNews = async (category: string): Promise<NewsHeadline[]> => {
  const prompt = `
    List 5 recent ${category} news headlines with title, source, and URL in JSON array.
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
  if (text.startsWith("```json")) {
    text = text.substring(7, text.length - 3).trim();
  } else if (text.startsWith("```")) {
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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    let result: unknown;

    switch (action) {
      case "analyze":
        result = await analyzeArticle(body.articleUrl, body.language);
        break;

      case "translate":
        result = await translateAnalysis(body.analysis, body.targetLanguage);
        break;

      case "translateTexts":
        result = await translateBatchTexts(body.texts, body.targetLanguage);
        break;

      case "fetchNews":
        result = await fetchNews(body.category);
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown server error" }),
    };
  }
};
