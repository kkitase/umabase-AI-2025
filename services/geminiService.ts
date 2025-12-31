
import { GoogleGenAI, Type } from "@google/genai";
import { Horse, PaddockAnalysisResult, Race, GroundingSource, PredictionReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateRaceData = async (raceName: string): Promise<Race> => {
  const prompt = `
    競馬のレース「${raceName}」の出走表データを生成してください。
    必ずGoogle検索を使用して、実在する（または出走が有力視されている）馬の名前、騎手、オッズを調査してください。
    
    以下の項目を含めてJSON形式で出力してください：
    - レース名、開催場所、距離、天候、馬場状態
    - 出走馬（5〜12頭）：
      - 名前、馬番、騎手、斤量（weight）、近3走の着順、想定タイム、最新または想定オッズ
      - pastResults: 最近の主要なレース結果3つ程度（例：24年有馬記念 1着）
      - pedigree: 血統情報（例：父 キタサンブラック、母父 キングカメハメハ）
      - jockeyCompatibility: この騎手との過去の相性やコンビ実績の簡潔な解説
    
    存在しない馬を捏造せず、できる限り正確な最新情報に基づいてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            venue: { type: Type.STRING },
            distance: { type: Type.NUMBER },
            weather: { type: Type.STRING },
            trackCondition: { type: Type.STRING },
            horses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  number: { type: Type.NUMBER },
                  jockey: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  lastPositions: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  avgTime: { type: Type.STRING },
                  odds: { type: Type.NUMBER },
                  pastResults: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pedigree: { type: Type.STRING },
                  jockeyCompatibility: { type: Type.STRING },
                },
                required: ["id", "name", "number", "jockey", "weight", "lastPositions", "avgTime", "odds", "pastResults", "pedigree", "jockeyCompatibility"]
              }
            }
          },
          required: ["name", "venue", "distance", "weather", "trackCondition", "horses"]
        },
      },
    });

    const result = JSON.parse(response.text);
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({
            title: chunk.web.title || "参照元",
            uri: chunk.web.uri
          });
        }
      });
    }

    return {
      ...result,
      id: `dynamic-${Date.now()}`,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Race Generation Error:", error);
    throw error;
  }
};

export const analyzePaddock = async (
  base64Image: string,
  horseName: string
): Promise<PaddockAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `この馬（名前：${horseName}）のパドックでの状態を分析してください。筋肉の張り、毛艶、気合、歩様のリズム、発汗などを評価してください。1から10のスコアと、専門的で簡潔な日本語の解説を提供してください。`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "1から10のコンディションスコア" },
            feedback: { type: Type.STRING, description: "馬の状態に関する簡潔な日本語のフィードバック" },
          },
          required: ["score", "feedback"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return {
      horseId: horseName,
      score: result.score,
      feedback: result.feedback,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const predictRaceOutcome = async (
  race: Race,
  paddockAnalyses: PaddockAnalysisResult[]
): Promise<PredictionReport> => {
  const prompt = `
    以下のレースデータと最新のパドック診断に基づき、プロの競馬予想家として詳細な分析レポートを作成してください。

    レース概要: ${race.name} (${race.venue} ${race.distance}m, 天候: ${race.weather}, 馬場状態: ${race.trackCondition})

    出走馬とパドック状態:
    ${race.horses.map(h => {
      const p = paddockAnalyses.find(pa => pa.horseId === h.id || pa.horseId === h.name);
      return `- ${h.name} (馬番:${h.number}): オッズ ${h.odds}, 直近成績: ${h.lastPositions.join(",")}, パドック評価: ${p ? p.score : '未評価（5として扱う）'} - ${p ? p.feedback : ''}`;
    }).join('\n')}

    以下の3点を分析し、指定のJSON形式で返してください：
    1. レース展開予想：どの馬が逃げ、どのようなペースになるか。
    2. 各馬の勝率と詳細な根拠：パドックの状態がどうプラス・マイナスに働いたかを含めること。
    3. 推奨買い目：単勝、馬連、3連複など、期待値の高い馬券構成とその戦術的理由。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            raceDevelopment: { type: Type.STRING, description: "レース展開の日本語解説" },
            paceWeight: { type: Type.STRING, enum: ["HIGH", "NORMAL", "SLOW"] },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  horseId: { type: Type.STRING },
                  winProbability: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                },
                required: ["horseId", "winProbability", "reasoning"]
              }
            },
            recommendedTickets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "馬券種別（例：馬連）" },
                  selection: { type: Type.STRING, description: "推奨番号（例：1-4,5）" },
                  logic: { type: Type.STRING, description: "この買い目を選んだ理由" }
                },
                required: ["type", "selection", "logic"]
              }
            }
          },
          required: ["raceDevelopment", "paceWeight", "predictions", "recommendedTickets"]
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Prediction Error:", error);
    throw error;
  }
};
