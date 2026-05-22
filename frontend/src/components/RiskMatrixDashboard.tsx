import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Compass, AlertTriangle, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react';
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
    ['acceptable', 'acceptable', 'acceptable', 'acceptable', 'alarp'],
    ['acceptable', 'acceptable', 'acceptable', 'alarp', 'unacceptable'],
    ['acceptable', 'acceptable', 'alarp', 'unacceptable', 'unacceptable'],
    ['acceptable', 'alarp', 'unacceptable', 'unacceptable', 'unacceptable'],
    ['alarp', 'unacceptable', 'unacceptable', 'unacceptable', 'unacceptable']
  ];

  const severityLevels = riskCriteria?.risk_matrix_config.severity_levels || [
    { level: 1, label: '可忽略' },
    { level: 2, label: '輕微' },
    { level: 3, label: '中等' },
    { level: 4, label: '嚴重' },
    { level: 5, label: '災難性' }
  ];

  const likelihoodLevels = riskCriteria?.risk_matrix_config.likelihood_levels || [
    { level: 1, label: '極不可能' },
    { level: 2, label: '不可能' },
    { level: 3, label: '可能' },
    { level: 4, label: '極可能' },
    { level: 5, label: '幾乎確定' }
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
    
    if (acceptability === 'acceptable') {
      return {
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
        border: activeBorder,
        badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        label: '可接受 (Acceptable)'
      };
    } else if (acceptability === 'alarp') {
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
        border: activeBorder,
        badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        label: 'ALARP (儘可能降低)'
      };
    } else {
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
        border: activeBorder,
        badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
        label: '不可接受 (Unacceptable)'
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          本矩陣基於半定量評估，結合威脅的可能性等級 (Likelihood) 與後果的嚴重度等級 (Severity)，落入紅、黃、綠三色區域。
          您可<span className="font-semibold text-blue-600 dark:text-blue-400">點擊矩陣格子</span>來篩選與聚焦對應的風險場景。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側與中間：5x5 矩陣 */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Layers size={16} />
              5x5 風險判定熱圖
            </h3>
            {selectedCell && (
              <button
                onClick={() => setSelectedCell(null)}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded transition-all"
              >
                <RefreshCw size={10} />
                顯示全部場景
              </button>
            )}
          </div>

          <div className="flex flex-row items-stretch">
            {/* 縱軸 Likelihood 標題 */}
            <div className="w-10 flex flex-col justify-around items-center select-none mr-2">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap">
                可能性 (Likelihood)
              </span>
            </div>

            <div className="flex-grow flex flex-col">
              {/* 5x5 熱圖網格 */}
              <div className="grid grid-rows-5 gap-1.5 aspect-square max-h-[420px] w-full">
                {/* 縱軸從 5 遞減到 1 */}
                {[5, 4, 3, 2, 1].map((likelihoodVal) => {
                  return (
                    <div key={likelihoodVal} className="grid grid-cols-5 gap-1.5 items-stretch">
                      {/* 橫軸從 1 遞增到 5 */}
                      {[1, 2, 3, 4, 5].map((severityVal) => {
                        const acceptability = matrix[severityVal - 1][likelihoodVal - 1] || 'alarp';
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
                            <span className="text-xl font-black">{count > 0 ? count : ''}</span>
                            {count > 0 && (
                              <span className="text-[9px] font-semibold opacity-60 mt-0.5">場景</span>
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

              {/* 橫軸 Severity 標題 */}
              <div className="grid grid-cols-5 gap-1.5 mt-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 select-none">
                {severityLevels.map(s => (
                  <div key={s.level} className="truncate px-1" title={`Level ${s.level}: ${s.label}`}>
                    L-{s.level} {s.label}
                  </div>
                ))}
              </div>

              <div className="text-center mt-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none">
                嚴重度 (Severity)
              </div>
            </div>
            
            {/* 縱軸 Likelihood 等級提示 */}
            <div className="w-20 flex flex-col justify-around text-right text-[10px] font-bold text-gray-500 dark:text-gray-400 select-none pl-2">
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
        <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md rounded-xl p-6 shadow-sm flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            風險判定區域說明
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                <XCircle size={14} />
                <span>不可接受 (Unacceptable)</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                高風險紅色區域。必須立即增加獨立保護層 (IPL) 或降低危害源的頻率，直到將風險降至可接受或 ALARP 區域。
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} />
                <span>ALARP 儘可能合理降低</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                中風險黃色區域 (As Low As Reasonably Practicable)。在工程及經濟合理可行範圍內，應儘量採取額外安全措施以進一步削減風險。
              </p>
            </div>

            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={14} />
                <span>可接受 (Acceptable)</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                低風險綠色區域。目前的防護體系合規且足夠，只需進行例行保養與合規性稽核，維持保護層的功能即可。
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
              <p className="text-[11px] text-gray-400 mt-1">
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
              const acceptability = result?.semi_quant_risk_score?.acceptability || 'alarp';
              const style = getAcceptabilityStyle(acceptability, false);

              const tCode = threatNode?.data?.entityData?.code || 'T';
              const cCode = consequenceNode?.data?.entityData?.code || 'C';

              return (
                <div 
                  key={path.id} 
                  className="bg-white/40 dark:bg-slate-800/20 border border-gray-150 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          {tCode}
                        </span>
                        <span className="text-gray-400 text-[10px]">➔</span>
                        <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          {cCode}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                        {acceptability === 'acceptable' ? '可接受' : acceptability === 'alarp' ? 'ALARP' : '不可接受'}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed">
                      <div className="font-semibold text-gray-700 dark:text-gray-300">
                        威脅：{threatNode?.data?.label || '未命名威脅'}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                        後果：{consequenceNode?.data?.label || '未命名後果'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 dark:border-slate-800/80 pt-2 text-[10px]">
                    <div className="text-gray-400 dark:text-gray-500">
                      IPL 數量:{' '}
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {result?.ipl_count || 0}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleJumpToCanvas(path.threat_node_id)}
                      className="inline-flex items-center gap-1 bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-700/60 transition-all font-semibold"
                    >
                      <Compass size={10} />
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
