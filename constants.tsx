
import { Race } from './types';

export const MOCK_RACE: Race = {
  id: "r1",
  name: "ジャパンカップ (G1)",
  venue: "東京競馬場",
  distance: 2400,
  weather: "晴れ",
  trackCondition: "良",
  horses: [
    { 
      id: "h1", name: "イクイノックス", number: 1, jockey: "C.ルメール", weight: 58, lastPositions: [1, 1, 1], avgTime: "2:24.2", odds: 1.5,
      pastResults: ["23年天皇賞秋 1着", "23年宝塚記念 1着", "23年ドバイSC 1着"],
      pedigree: "父:キタサンブラック 母:シャトーブランシュ (母父:キングヘイロー)",
      jockeyCompatibility: "ルメール騎手とは全戦コンビを組み、勝率100%。最高の信頼関係。"
    },
    { 
      id: "h2", name: "リバティアイランド", number: 2, jockey: "川田 将雅", weight: 54, lastPositions: [1, 1, 2], avgTime: "2:24.5", odds: 3.2,
      pastResults: ["23年秋華賞 1着", "23年オークス 1着", "23年桜花賞 1着"],
      pedigree: "父:ドゥラメンテ 母:ヤンキーローズ (母父:All American)",
      jockeyCompatibility: "川田騎手とのコンビで牝馬三冠を達成。勝負どころの呼吸は完璧。"
    },
    { 
      id: "h3", name: "ドウデュース", number: 3, jockey: "武 豊", weight: 58, lastPositions: [4, 1, 7], avgTime: "2:24.8", odds: 8.5,
      pastResults: ["23年天皇賞秋 7着", "23年京都記念 1着", "22年日本ダービー 1着"],
      pedigree: "父:ハーツクライ 母:ダストアンドダイヤモンズ (母父:Vindication)",
      jockeyCompatibility: "武豊騎手とのコンビでダービー制覇。人馬一体の末脚を引き出す。"
    },
    { 
      id: "h4", name: "スターズオンアース", number: 4, jockey: "W.ビュイック", weight: 56, lastPositions: [3, 2, 3], avgTime: "2:24.9", odds: 12.0,
      pastResults: ["23年ヴィクトリアM 3着", "23年大阪杯 2着", "22年秋華賞 3着"],
      pedigree: "父:ドゥラメンテ 母:サザンスターズ (母父:Smart Strike)",
      jockeyCompatibility: "ビュイック騎手とは初コンビだが、追える騎手との相性は良さそう。"
    },
    { 
      id: "h5", name: "ダノンベルーガ", number: 5, jockey: "J.モレイラ", weight: 58, lastPositions: [4, 5, 2], avgTime: "2:25.1", odds: 18.0,
      pastResults: ["23年天皇賞秋 4着", "23年札幌記念 4着", "23年ドバイターフ 2着"],
      pedigree: "父:ハーツクライ 母:コーステッド (母父:Tizway)",
      jockeyCompatibility: "モレイラ騎手とはドバイでも好走。マジックを期待できる好相性。"
    },
  ]
};
