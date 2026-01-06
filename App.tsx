
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MOCK_RACE } from './constants';
import { Race, Horse, PaddockAnalysisResult, PredictionResult, GroundingSource, PredictionReport } from './types';
import { analyzePaddock, predictRaceOutcome, generateRaceData } from './services/geminiService';

const App: React.FC = () => {
  const [currentRace, setCurrentRace] = useState<Race>(MOCK_RACE);
  const [analyses, setAnalyses] = useState<Record<string, PaddockAnalysisResult>>({});
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isGeneratingRace, setIsGeneratingRace] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [inspectedHorse, setInspectedHorse] = useState<Horse | null>(null);
  const [mediaSource, setMediaSource] = useState<'camera' | 'file' | 'url' | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // カスタム指示用ステート
  const [paddockInstruction, setPaddockInstruction] = useState('');
  const [predictionInstruction, setPredictionInstruction] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 予測結果を勝率順にソート
  const sortedPredictions = useMemo(() => {
    if (!report) return [];
    return [...report.predictions].sort((a, b) => b.winProbability - a.winProbability);
  }, [report]);

  // 出馬表を馬番順にソート
  const sortedHorses = useMemo(() => {
    return [...currentRace.horses].sort((a, b) => a.number - b.number);
  }, [currentRace.horses]);

  const handleCreateRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsGeneratingRace(true);
    try {
      const newRace = await generateRaceData(searchQuery);
      setCurrentRace(newRace);
      setAnalyses({});
      setReport(null);
      setSelectedHorseId(null);
      setSearchQuery('');
    } catch (err) {
      alert("レースデータの生成に失敗しました。最新の情報を取得できない可能性があります。");
    } finally {
      setIsGeneratingRace(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMediaSource('camera');
        setFileType('video');
        setPreviewUrl(null);
        setShowUrlInput(false);
      }
    } catch (err) {
      alert("カメラへのアクセスを許可してください。");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaSource('file');
    setShowUrlInput(false);
    if (file.type.startsWith('image/')) setFileType('image');
    else if (file.type.startsWith('video/')) setFileType('video');
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;
    setPreviewUrl(videoUrlInput);
    setMediaSource('url');
    setFileType('video');
    setShowUrlInput(false);
  };

  const captureAndAnalyze = async () => {
    if (!selectedHorseId) return alert("解析対象の馬をリストから選択してください。");
    setIsAnalyzing(true);
    const horse = currentRace.horses.find(h => h.id === selectedHorseId);
    if (!horse) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    let base64Image = "";
    try {
      if (fileType === 'video' && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth || videoRef.current.clientWidth;
        canvasRef.current.height = videoRef.current.videoHeight || videoRef.current.clientHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
      } else if (fileType === 'image' && imageRef.current) {
        canvasRef.current.width = imageRef.current.naturalWidth;
        canvasRef.current.height = imageRef.current.naturalHeight;
        ctx.drawImage(imageRef.current, 0, 0);
        base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
      }
      if (base64Image) {
        const result = await analyzePaddock(base64Image, horse.name, paddockInstruction);
        setAnalyses(prev => ({ ...prev, [selectedHorseId]: { ...result, horseId: selectedHorseId } }));
      }
    } catch (err) {
      alert("AI解析に失敗しました。CORS制限を確認してください。");
    } finally { setIsAnalyzing(false); }
  };

  const runPrediction = async () => {
    setIsPredicting(true);
    try {
      const fullReport = await predictRaceOutcome(currentRace, Object.values(analyses), predictionInstruction);
      setReport(fullReport);
    } catch (err) { alert("予測に失敗しました。"); } finally { setIsPredicting(false); }
  };

  const getMark = (index: number) => ['◎', '○', '▲', '△', '×'][index] || '';
  const getHorseByIdOrName = (idOrName: string) => currentRace.horses.find(h => h.id === idOrName || h.name === idOrName);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg></div>
            <h1 className="text-xl font-bold tracking-tight text-white italic">UMA<span className="text-emerald-400">BASE</span> AI</h1>
          </div>

          <form onSubmit={handleCreateRace} className="flex-1 max-w-md w-full flex gap-2">
            <input type="text" placeholder="有馬記念 2025..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/>
            <button type="submit" disabled={isGeneratingRace} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50">
              {isGeneratingRace ? '検索中...' : '作成'}
            </button>
          </form>

          <div className="flex gap-2">
             <button onClick={runPrediction} disabled={isPredicting || currentRace.horses.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-full font-black transition-all shadow-lg text-sm tracking-widest uppercase">
              {isPredicting ? '計算中...' : '最終予想'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-200">
        <div className="lg:col-span-2 space-y-8">
          
          {/* 予想こだわり入力欄 */}
          <section className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700 shadow-xl">
             <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                予想のこだわり・条件を入力
             </h3>
             <textarea 
               placeholder="例：武豊騎手の馬は外したくない、3連単で高配当を狙いたい、6番の評価を重視してほしい...など"
               value={predictionInstruction}
               onChange={(e) => setPredictionInstruction(e.target.value)}
               className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-h-[80px] resize-none"
             />
             <p className="text-[10px] text-slate-500 mt-2 font-medium italic">※入力された内容は最終予想のロジックに反映されます。</p>
          </section>

          {report && (
            <section className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                  AI予想分析レポート
                </h3>
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pace:</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    report.paceWeight === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    report.paceWeight === 'SLOW' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {report.paceWeight}
                  </span>
                </div>
              </div>

              {/* レース展開予想 */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  レース展開シミュレーション
                </h4>
                <p className="text-sm leading-relaxed text-slate-300 italic">
                  {report.raceDevelopment}
                </p>
              </div>

              {/* 推奨馬券セクション */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.recommendedTickets.map((ticket, tIdx) => (
                  <div key={tIdx} className="bg-gradient-to-br from-emerald-600/20 to-teal-800/20 rounded-2xl p-5 border border-emerald-500/30">
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-emerald-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase">{ticket.type}</span>
                      <span className="text-xl font-black text-white tracking-tighter">{ticket.selection}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      <span className="text-emerald-400 font-bold mr-1">戦術:</span> {ticket.logic}
                    </p>
                  </div>
                ))}
              </div>

              {/* ランキングリスト */}
              <div className="grid grid-cols-1 gap-4">
                {sortedPredictions.map((p, idx) => {
                  const h = getHorseByIdOrName(p.horseId);
                  const isTop = idx === 0;
                  if (!h) return null;
                  const paddockScore = analyses[h.id]?.score;

                  return (
                    <div key={h.id} className={`relative group bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${isTop ? 'border-yellow-500/50 ring-2 ring-yellow-500/10 shadow-2xl' : 'border-slate-700 hover:border-slate-500 shadow-lg'}`}>
                      {isTop && <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 px-4 py-1 font-black text-[10px] rounded-bl-xl uppercase tracking-tighter z-10">AI 本命 / TOP PICK</div>}
                      <div className="flex flex-col md:flex-row md:items-stretch">
                        <div className={`flex flex-col items-center justify-center p-6 min-w-[120px] text-center gap-1 ${isTop ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700/50 text-white'}`}>
                          <span className="text-4xl font-black leading-none">{idx + 1}</span>
                          <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">RANK</span>
                          <div className="mt-2 w-full px-2">
                            <span className={`text-[11px] font-black block leading-tight truncate ${isTop ? 'text-slate-900' : 'text-emerald-400'}`}>{h.name}</span>
                          </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-bold text-emerald-400">{getMark(idx)}</span>
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-lg text-xl font-black text-white border border-slate-700">{h.number}</div>
                            <div>
                              <h4 className="text-2xl font-black text-white">{h.name}</h4>
                              <p className="text-xs text-slate-500 font-medium">{h.jockey} / {h.weight}kg</p>
                            </div>
                            {paddockScore && (
                              <div className="ml-auto flex flex-col items-end">
                                <span className="text-[8px] text-slate-500 uppercase font-bold">Paddock</span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded ${paddockScore >= 8 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
                                  S: {paddockScore}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
                            <span>オッズ: <span className="text-white font-bold">{h.odds.toFixed(1)}</span></span>
                            <span className="ml-auto text-emerald-400 font-black text-2xl">{(p.winProbability * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-4 w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isTop ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${p.winProbability * 100}%` }}/>
                          </div>
                          <div className="mt-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/50">
                            <p className="text-xs text-slate-300 leading-relaxed italic">
                              「{p.reasoning}」
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-inner">
            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeWidth="2"/></svg>
                  出馬表 <span className="text-slate-500 font-normal text-sm">{currentRace.name}</span>
                </h2>
                <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest">{currentRace.venue} • {currentRace.distance}M • {currentRace.trackCondition}馬場</p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedHorses.map((horse) => (
                <div key={horse.id} onClick={() => setSelectedHorseId(horse.id)} className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${selectedHorseId === horse.id ? 'bg-emerald-500/10 border-emerald-500 shadow-md scale-[1.01]' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}>
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-xs font-black text-white border border-slate-600 shadow-sm">{horse.number}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{horse.name}</h3>
                    <p className="text-[10px] text-slate-500">{horse.jockey} / {horse.weight}kg</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-xs font-bold text-emerald-400">{horse.odds.toFixed(1)}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setInspectedHorse(horse); }}
                      className="text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded border border-slate-600 transition-colors uppercase font-bold"
                    >
                      Details
                    </button>
                  </div>
                  <div className="w-20 flex justify-end items-center gap-2">{analyses[horse.id] ? <div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">S: {analyses[horse.id].score}</div> : <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>}</div>
                </div>
              ))}
            </div>
            
            {currentRace.sources && (
              <div className="mt-8 pt-4 border-t border-slate-700/50">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">参照ソース / GROUNDING SOURCES</h5>
                <div className="flex flex-wrap gap-2">
                  {currentRace.sources.map((src, idx) => (
                    <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full border border-slate-600 transition-all truncate max-w-[200px]">
                      {src.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 overflow-hidden shadow-xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 text-center border-b border-slate-700 pb-2">Paddock AI Analyst</h3>
              
              {/* パドック注目点入力欄 */}
              <div className="mb-4">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">注目ポイントを入力</label>
                 <textarea 
                   placeholder="例：歩様のリズム、筋肉の張り、気合の入り方など"
                   value={paddockInstruction}
                   onChange={(e) => setPaddockInstruction(e.target.value)}
                   className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all min-h-[60px] resize-none"
                 />
              </div>

              <div className="flex gap-2 mb-4 justify-center">
                <button onClick={startCamera} className={`p-2.5 rounded-xl text-white transition-all ${mediaSource === 'camera' ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-slate-700 hover:bg-slate-600'}`} title="カメラ起動">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-xl text-white transition-all ${mediaSource === 'file' ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-slate-700 hover:bg-slate-600'}`} title="ファイルアップロード">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </button>
                <button onClick={() => setShowUrlInput(!showUrlInput)} className={`p-2.5 rounded-xl text-white transition-all ${mediaSource === 'url' ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-slate-700 hover:bg-slate-600'}`} title="リンク">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
              </div>

              {showUrlInput && (
                <form onSubmit={handleUrlSubmit} className="mb-4 p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <div className="flex gap-2">
                    <input type="url" placeholder="動画URLを入力 (.mp4等)" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"/>
                    <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">ロード</button>
                  </div>
                </form>
              )}

              <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 mb-4 shadow-inner">
                {fileType === 'image' && previewUrl ? (
                  <img ref={imageRef} src={previewUrl} className="w-full h-full object-contain" alt="馬の画像" />
                ) : (
                  <video ref={videoRef} src={previewUrl || undefined} autoPlay playsInline controls={mediaSource !== 'camera'} crossOrigin="anonymous" className="w-full h-full object-contain" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={captureAndAnalyze} disabled={!selectedHorseId || isAnalyzing} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-4 border-emerald-500 shadow-2xl flex items-center justify-center z-20 active:scale-90 transition-transform disabled:opacity-50">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </button>
              </div>

              {selectedHorseId && analyses[selectedHorseId] ? (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-black text-emerald-400">{analyses[selectedHorseId].score}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Paddock Score</span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic leading-relaxed">「{analyses[selectedHorseId].feedback}」</p>
                </div>
              ) : isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">AI解析中...</p>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                  <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest leading-relaxed">馬を選んで<br/>パドックの状態をスキャン</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 馬詳細モーダル */}
      {inspectedHorse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
              <button onClick={() => setInspectedHorse(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-slate-700 rounded-xl text-2xl font-black text-white border border-slate-600 shadow-lg">{inspectedHorse.number}</div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{inspectedHorse.name}</h2>
                  <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Horse Profile</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <section>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">血統情報 / Pedigree</h4>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{inspectedHorse.pedigree || "データなし"}</p>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">過去の主要成績 / Major Results</h4>
                <div className="grid grid-cols-1 gap-2">
                  {inspectedHorse.pastResults?.map((res, i) => (
                    <div key={i} className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <p className="text-xs text-slate-300">{res}</p>
                    </div>
                  )) || <p className="text-xs text-slate-500 italic">データなし</p>}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">騎手との相性 / Jockey Insight</h4>
                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
                    <span className="text-xs font-bold text-white">{inspectedHorse.jockey}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">「{inspectedHorse.jockeyCompatibility || "データなし"}」</p>
                </div>
              </section>

              <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">想定タイム</span>
                  <span className="text-lg font-black text-white tracking-tighter">{inspectedHorse.avgTime}</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">想定オッズ</span>
                  <span className="text-lg font-black text-emerald-400 tracking-tighter">{inspectedHorse.odds.toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <button 
                onClick={() => setInspectedHorse(null)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 py-3 px-6 flex justify-around items-center text-slate-500 z-50">
        <div className="flex flex-col items-center gap-1 text-emerald-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
          <span className="text-[8px] uppercase font-bold">Races</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-[8px] uppercase font-bold">History</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          <span className="text-[8px] uppercase font-bold">Profile</span>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
