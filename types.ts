
export interface Horse {
  id: string;
  name: string;
  number: number;
  jockey: string;
  weight: number;
  lastPositions: number[];
  avgTime: string;
  odds: number;
  // 追加の詳細情報
  pastResults?: string[]; // 過去の主要なレース結果
  pedigree?: string; // 血統（父、母、母父など）
  jockeyCompatibility?: string; // 騎手との相性・コンビ実績
}

export interface PaddockAnalysisResult {
  horseId: string;
  score: number; // 1-10
  feedback: string;
  analyzedAt: string;
}

export interface PredictionResult {
  horseId: string;
  winProbability: number;
  reasoning: string;
}

export interface TicketAdvice {
  type: string;
  selection: string;
  logic: string;
}

export interface PredictionReport {
  raceDevelopment: string;
  paceWeight: 'HIGH' | 'NORMAL' | 'SLOW';
  predictions: PredictionResult[];
  recommendedTickets: TicketAdvice[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Race {
  id: string;
  name: string;
  venue: string;
  distance: number;
  weather: string;
  trackCondition: string;
  horses: Horse[];
  sources?: GroundingSource[];
}
