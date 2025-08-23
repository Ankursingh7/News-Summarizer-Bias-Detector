
export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
}

export interface BiasPoint {
  finding: string;
  evidence: string[];
}

export interface TonePoint {
  classification: 'Positive' | 'Negative' | 'Neutral';
  finding: string;
  evidence: string[];
}

export interface BiasAnalysisDetails {
  tone: TonePoint;
  favoritism: BiasPoint;
  chargedLanguage: BiasPoint;
  missingPerspectives: BiasPoint;
  politicalLeaning: BiasPoint;
}

export interface AnalysisResult {
  articleTitle: string;
  neutralSummary: string;
  factOnlySummary: string;
  eli10Summary: string;
  biasAnalysis: BiasAnalysisDetails;
}

export interface HistoryItem {
  id: string; // URL
  url: string;
  title: string;
  analysis: AnalysisResult;
  timestamp: number;
}
