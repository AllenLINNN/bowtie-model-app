import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Compass, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const RiskMatrixDashboard = () => {
  const { 
    analysisConfig, 
    nodes, 
    setActiveTab, 
    setNodes, 
    togglePropertiesPanel, 
    isPropertiesPanelOpen 
  } = useStore();

  const scenarioPaths = analysisConfig?.scenarioPaths || [];
  const riskCriteria = analysisConfig?.riskCriteria;
  const matrix = riskCriteria?.risk_matrix_config.acceptability_matrix || [
    ['R1', 'R1', 'R2', 'R3', 'R4'],
    ['R1', 'R2', 'R3', 'R4', 'R5'],
    ['R2', 'R3', 'R4', 'R5', 'R5'],
    ['R4', 'R5', 'R5', 'R5', 'R5'],
    ['R5', 'R5', 'R5', 'R5', 'R5']
  ];

  const severityLevels = riskCriteria?.risk_matrix_config.severity_levels || [
    { level: 1, label: '虛驚' },
    { level: 2, label: '延誤行車' },
    { level: 3, label: '財損' },
    { level: 4, label: '受傷' },
    { level: 5, label: '死亡' }
  ];

  const likelihoodLevels = riskCriteria?.risk_matrix_config.likelihood_levels || [
    { level: 1, label: '幾乎不可能' },
    { level: 2, label: '不太可能' },
    { level: 3, label: '可能' },
    { level: 4, label: '極可能' },
    { level: 5, label: '幾乎可確定' }
  ];

  // 篩選狀態：null 代表顯示全部，或者是 { severity, likelihood } 代表選中的格子
  const [selectedCell, setSelectedCell] = useState<{ severity: number; likelihood: number } | null>(null);

  // 跳轉至畫布並聚焦該節點
  const handleJumpToCanvas = (threatNodeId: string) => {
    setNodes(
      nodes.map(n => 
        n.id === threatNodeId 
          ? { ...n, selected: true } 
          : { ...n, selected: false }
      )
    );
    setActiveTab('canvas');
    if (!isPropertiesPanelOpen) {
      togglePropertiesPanel();
    }
    toast.success('已跳轉至畫布並選中對應威脅節點');
  };

  // 取得特定格子的場景清單
  const getScenariosInCell = (severity: number, likelihood: number) => {
    return scenarioPaths.filter(path => {
      const result = path.calculation_result;
      if (!result?.semi_quant_risk_score) return false;
      return (
        result.semi_quant_risk_score.severity_level === severity &&
        result.semi_quant_risk_score.likelihood_level === likelihood
      );
    });
  };

  // 根據 acceptability 取得背景樣式與文字
  const getAcceptabilityStyle = (acceptability: string, isSelected: boolean) => {
    const activeBorder = isSelected ? 'ring-2 ring-blue-600 dark:ring-blue-400 scale-[1.02] z-10 shadow-md border-blue-500' : 'border-gray-200 dark:border-slate-800';
    
    if (acceptability === 'R1' || acceptability === 'R2' || acceptability === 'acceptable') {
      return {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
        border: activeBorder,
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        label: `可接受風險 (${acceptability})`
      };
    } else {
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
        border: activeBorder,
        badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        label: `不可接受風險 (${acceptability})`
      };
    }
  };

  const filteredScenarios = selectedCell
    ? getScenariosInCell(selectedCell.severity, selectedCell.likelihood)
    : scenarioPaths;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 頂部說明區塊 */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md shadow-sm rounded-xl p-6 transition-all">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          5x5 風險矩陣與安全評估 Dashboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          本矩陣基於半定量評估，預設保全對象為<span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">鐵路營運安全</span>，結合威脅的可能性等級 (Likelihood) 與後果的嚴重度等級 (Severity)，落入紅、綠雙色風險判定區域。
          您可<span className="font-semibold text-blue-600 dark:text-blue-400">點擊矩陣格子</span>來篩選與聚焦對應的風險場景。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側與中間：5x5 矩陣 */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Layers size={18} />
              5x5 鐵路安全風險判定熱圖
            </h3>
            {selectedCell && (
              <button
                onClick={() => setSelectedCell(null)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded transition-all"
              >
                <RefreshCw size={13} />
                顯示全部場景
              </button>
            )}
          </div>

          <div className="flex flex-row items-stretch">
            {/* 縱軸 Likelihood 標題 */}
            <div className="w-12 flex flex-col justify-around items-center select-none mr-2">
              <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap">
                可能性 (Likelihood)
              </span>
            </div>

            <div className="flex-grow flex flex-col">
              {/* 5x5 熱圖網格 */}
              <div className="grid grid-rows-5 gap-1.5 aspect-square max-h-[440px] w-full">
                {/* 縱軸從 5 遞減到 1 */}
                {[5, 4, 3, 2, 1].map((likelihoodVal) => {
                  return (
                    <div key={likelihoodVal} className="grid grid-cols-5 gap-1.5 items-stretch">
                      {/* 橫軸從 1 遞增到 5 */}
                      {[1, 2, 3, 4, 5].map((severityVal) => {
                        const acceptability = matrix[severityVal - 1][likelihoodVal - 1] || 'R1';
                        const count = getScenariosInCell(severityVal, likelihoodVal).length;
                        const isSelected = selectedCell?.severity === severityVal && selectedCell?.likelihood === likelihoodVal;
                        const style = getAcceptabilityStyle(acceptability, isSelected);

                        return (
                          <button
                            key={`${severityVal}-${likelihoodVal}`}
                            onClick={() => setSelectedCell({ severity: severityVal, likelihood: likelihoodVal })}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-300 relative group cursor-pointer ${style.bg} ${style.border}`}
                            title={`嚴重度 Level ${severityVal} ✕ 可能性 Level ${likelihoodVal}\n判定: ${style.label}\n落入場景數: ${count}`}
                          >
                            {/* 左上角標記風險等級 R1-R5 */}
                            <span className="absolute top-1 left-1.5 text-[10px] font-bold opacity-60">
                              {acceptability}
                            </span>
                            
                            <span className="text-3xl font-black">{count > 0 ? count : ''}</span>
                            {count > 0 && (
                              <span className="text-[10px] font-semibold opacity-70 mt-0.5">場景</span>
                            )}
                            
                            {/* 格子懸浮提示 */}
                            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* 橫軸 Severity 等級標示 */}
              <div className="grid grid-cols-5 gap-1.5 mt-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 select-none">
                {severityLevels.map(s => (
                  <div key={s.level} className="truncate px-1" title={`Level ${s.level}: ${s.label}`}>
                    L-{s.level} {s.label}
                  </div>
                ))}
              </div>

              <div className="text-center mt-3 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none">
                嚴重度 (Severity)
              </div>
            </div>
            
            {/* 縱軸 Likelihood 等級提示 */}
            <div className="w-24 flex flex-col justify-around text-right text-sm font-semibold text-gray-500 dark:text-gray-400 select-none pl-2">
              {[5, 4, 3, 2, 1].map(lVal => {
                const lLevel = likelihoodLevels.find(l => l.level === lVal);
                return (
                  <div key={lVal} className="truncate" title={`Level ${lVal}: ${lLevel?.label}`}>
                    L-{lVal} {lLevel?.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右側：判定說明 */}
        <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm flex flex-col space-y-5">
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
            風險判定標準說明
          </h3>

          <div className="space-y-4 text-sm">
            <div className="p-4 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg">
              <div className="flex items-center gap-2 font-bold text-base text-rose-700 dark:text-rose-400">
                <XCircle size={18} />
                <span>不可接受風險 (R3 - R5)</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                在鐵路營運安全體系中屬於**未達安全容許界限**之高風險區域。必須立即實施有效之獨立保護層 (IPL) 進行減險控制，或透過技術與管理手段降低危害發生之頻率，直到其風險等級降至可接受區域為止。
              </p>
            </div>

            <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={18} />
                <span>可接受風險 (R1 - R2)</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                屬於鐵路營運**符合安全標準**之低風險區域。目前的防護體系與營運控制措施已合規且足夠，只需進行例行設備維護保養與定期合規性稽核，確保現有屏障功能完整與有效性即可。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 下方：場景清單 */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md rounded-xl shadow-sm p-6 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {selectedCell 
                ? `篩選場景：嚴重度 L-${selectedCell.severity} ✕ 可能性 L-${selectedCell.likelihood}`
                : '所有風險場景路徑'
              }
              <span className="ml-2 font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full font-bold">
                {filteredScenarios.length}
              </span>
            </h3>
            {selectedCell && (
              <p className="text-xs text-gray-450 dark:text-gray-400 mt-1">
                判定：{getAcceptabilityStyle(matrix[selectedCell.severity - 1][selectedCell.likelihood - 1], false).label}
              </p>
            )}
          </div>
        </div>

        {filteredScenarios.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg">
            此格子區塊內目前無任何場景路徑落入。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((path) => {
              const threatNode = nodes.find(n => n.id === path.threat_node_id);
              const consequenceNode = nodes.find(n => n.id === path.consequence_node_id);
              const result = path.calculation_result;
              const acceptability = result?.semi_quant_risk_score?.acceptability || 'R1';
              const style = getAcceptabilityStyle(acceptability, false);

              const tCode = threatNode?.data?.entityData?.code || 'T';
              const cCode = consequenceNode?.data?.entityData?.code || 'C';
              const isAcceptable = acceptability === 'R1' || acceptability === 'R2' || acceptability === 'acceptable';

              return (
                <div 
                  key={path.id} 
                  className="bg-white/40 dark:bg-slate-800/20 border border-gray-150 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold text-xs">
                          {tCode}
                        </span>
                        <span className="text-gray-400 text-xs">➔</span>
                        <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold text-xs">
                          {cCode}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                        {isAcceptable ? '可接受' : '不可接受'}
                      </span>
                    </div>

                    <div className="text-sm leading-relaxed space-y-1">
                      <div className="font-bold text-gray-800 dark:text-gray-200">
                        威脅：{threatNode?.data?.label || '未命名威脅'}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 mt-0.5">
                        後果：{consequenceNode?.data?.label || '未命名後果'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-800/80 pt-2 text-xs">
                    <div className="text-gray-400 dark:text-gray-500">
                      IPL 數量:{' '}
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {result?.ipl_count || 0}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleJumpToCanvas(path.threat_node_id)}
                      className="inline-flex items-center gap-1 bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-700/60 transition-all font-semibold text-xs"
                    >
                      <Compass size={12} />
                      <span>定位畫布</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskMatrixDashboard;
