import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Download, Compass, AlertTriangle, CheckCircle, XCircle, Info, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LopaTable = () => {
  const { 
    analysisConfig, 
    nodes, 
    setActiveTab, 
    setNodes, 
    togglePropertiesPanel, 
    isPropertiesPanelOpen 
  } = useStore();

  // 雙檢視切換狀態：初始風險 (僅既有措施) / 殘餘風險 (既有+新增)
  const [viewMode, setViewMode] = useState<'initial' | 'residual'>('residual');

  const scenarioPaths = analysisConfig?.scenarioPaths || [];

  // 跳轉至畫布並聚焦該節點
  const handleJumpToCanvas = (threatNodeId: string) => {
    // 選中該威脅節點，並取消選中其他節點
    setNodes(
      nodes.map(n => 
        n.id === threatNodeId 
          ? { ...n, selected: true } 
          : { ...n, selected: false }
      )
    );
    // 切換 Tab 到畫布
    setActiveTab('canvas');
    // 如果屬性面板沒開，自動開啟
    if (!isPropertiesPanelOpen) {
      togglePropertiesPanel();
    }
    toast.success('已跳轉至畫布並選中對應威脅節點');
  };

  // CSV 離線導出 (支援 Excel BOM 繁體中文，且完整輸出初始與殘餘風險)
  const exportToCSV = () => {
    if (scenarioPaths.length === 0) {
      toast.error('無場景路徑資料可供導出');
      return;
    }

    const headers = [
      '場景ID', 
      '威脅 (IE) 描述', 
      'IE 年頻率 (次/年)', 
      '預防性 IPLs (PFD 與控制措施)', 
      '緩和性 IPLs (PFD 與控制措施)', 
      'Modifiers', 
      '後果描述', 
      '安全目標頻率 (TMEL)', 
      '初始後果頻率 (僅既有措施)', 
      '初始是否符合安全目標', 
      '殘餘後果頻率 (既有+新增)', 
      '殘餘是否符合安全目標', 
      '殘餘 Risk Gap (倍數)'
    ];
    
    const rows = scenarioPaths.map(path => {
      const threatNode = nodes.find(n => n.id === path.threat_node_id);
      const consequenceNode = nodes.find(n => n.id === path.consequence_node_id);
      const result = path.calculation_result;
      
      const pbIPLs = path.barriers
        .filter(b => b.barrier_role === 'preventive' && b.is_ipl)
        .map(b => {
          const node = nodes.find(n => n.id === b.barrier_node_id);
          const name = node?.data?.label || b.barrier_node_id;
          const controlLabel = b.control_type === 'new' ? '新增' : b.control_type === 'other' ? '其他' : '既有';
          const valid = b.is_independent && b.is_effective && b.is_auditable;
          return `${name} [${controlLabel}] (PFD: ${valid ? b.pfd : 1.0}${valid ? '' : ' - 不合規'})`;
        }).join('; ');

      const mbIPLs = path.barriers
        .filter(b => b.barrier_role === 'mitigative' && b.is_ipl)
        .map(b => {
          const node = nodes.find(n => n.id === b.barrier_node_id);
          const name = node?.data?.label || b.barrier_node_id;
          const controlLabel = b.control_type === 'new' ? '新增' : b.control_type === 'other' ? '其他' : '既有';
          const valid = b.is_independent && b.is_effective && b.is_auditable;
          return `${name} [${controlLabel}] (PFD: ${valid ? b.pfd : 1.0}${valid ? '' : ' - 不合規'})`;
        }).join('; ');

      const ieFreq = result?.calculation_mode === 'semi_quantitative' 
        ? `L-${path.initiating_event.semi_quant_level} (${result.mitigated_event_frequency / (pbIPLs ? 0.1 : 1.0)})` // fallback approximate
        : path.initiating_event.frequency_per_year;

      const initialFreq = result?.initial_frequency;
      const residualFreq = result?.residual_frequency;
      const initialMeets = result?.meets_criteria_initial ? '符合' : '不符合';
      const residualMeets = result?.meets_criteria ? '符合' : '不符合';
      const riskGapVal = result?.meets_criteria ? 'OK' : (result?.risk_gap?.toFixed(1) || '0');

      return [
        path.id,
        threatNode?.data?.label || '未命名威脅',
        ieFreq,
        pbIPLs || '無',
        mbIPLs || '無',
        path.conditional_modifiers.filter(m => m.is_active).map(m => `${m.label}: ${m.value}`).join('; ') || '無',
        consequenceNode?.data?.label || '未命名後果',
        result?.tmel?.toExponential(2) || '無限制',
        initialFreq !== undefined ? initialFreq.toExponential(2) : '',
        initialMeets,
        residualFreq !== undefined ? residualFreq.toExponential(2) : '',
        residualMeets,
        riskGapVal
      ];
    });

    const csvContent = "\ufeff" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bowtie_lopa_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('LOPA 雙階段分析報表導出成功！');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 頂部標題與工具欄 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 backdrop-blur-md shadow-sm rounded-xl p-6 transition-all duration-300">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            LOPA 安全保護層與風險總覽報表
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            本專案共有 <span className="font-semibold text-blue-600 dark:text-blue-400">{scenarioPaths.length}</span> 個失效場景路徑。系統會根據您在畫布及屬性面板中定義的 PFD 與嚴重度指標，自動進行半定量/定量評估。
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto flex-wrap">
          {/* 藥丸形雙層風險檢視切換開關 */}
          <div className="flex items-center bg-gray-150/70 dark:bg-slate-800/80 p-0.5 rounded-lg border border-gray-200/60 dark:border-slate-700/60 shadow-inner shrink-0">
            <button
              onClick={() => setViewMode('initial')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'initial'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-450 shadow-sm border border-gray-200/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              初始風險 (僅既有措施)
            </button>
            <button
              onClick={() => setViewMode('residual')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'residual'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-450 shadow-sm border border-gray-200/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              殘餘風險 (既有+新增)
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
          >
            <Download size={14} />
            導出 CSV 報表
          </button>
        </div>
      </div>

      {scenarioPaths.length === 0 ? (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl p-12 text-center backdrop-blur-md">
          <HelpCircle size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">目前尚無分析路徑</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            請回到「畫布編輯」，在畫布上建立完整的連接關係（Threat ➔ Preventive Barrier ➔ Top Event ➔ Mitigative Barrier ➔ Consequence），系統將會自動辨識並生成 LOPA 場景。
          </p>
          <button
            onClick={() => setActiveTab('canvas')}
            className="mt-6 inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Compass size={14} />
            前往畫布編輯
          </button>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden backdrop-blur-md transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 text-sm font-semibold border-b border-gray-200 dark:border-slate-800">
                  <th className="py-4 px-4 w-24">編號</th>
                  <th className="py-4 px-4 min-w-[200px]">場景路徑拓撲</th>
                  <th className="py-4 px-4 w-32">IE 年頻率</th>
                  <th className="py-4 px-4 min-w-[180px]">預防性 IPLs</th>
                  <th className="py-4 px-4 min-w-[180px]">緩和性 IPLs</th>
                  <th className="py-4 px-4 w-36 text-right">目標 (TMEL)</th>
                  <th className="py-4 px-4 w-36 text-right">
                    {viewMode === 'initial' ? '初始後果頻率' : '殘餘後果頻率'}
                  </th>
                  <th className="py-4 px-4 w-28 text-center">符合指標</th>
                  <th className="py-4 px-4 w-32 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-sm">
                {scenarioPaths.map((path, idx) => {
                  const threatNode = nodes.find(n => n.id === path.threat_node_id);
                  const consequenceNode = nodes.find(n => n.id === path.consequence_node_id);
                  const result = path.calculation_result;
                  
                  // 計算威脅編號及後果編號
                  const tCode = threatNode?.data?.entityData?.code || `T-${(idx + 1).toString().padStart(3, '0')}`;
                  const cCode = consequenceNode?.data?.entityData?.code || `C-${(idx + 1).toString().padStart(3, '0')}`;

                  // 篩選預防與緩和 IPL
                  const prevIPLs = path.barriers.filter(b => b.barrier_role === 'preventive');
                  const mitgIPLs = path.barriers.filter(b => b.barrier_role === 'mitigative');

                  // 依據檢視模式讀取對應計算數值
                  const isInitial = viewMode === 'initial';
                  const currentFreq = isInitial ? (result?.initial_frequency ?? 0) : (result?.residual_frequency ?? 0);
                  const isMeetsTarget = isInitial ? result?.meets_criteria_initial : result?.meets_criteria;
                  const currentFormula = isInitial ? result?.initial_formula_snapshot : result?.formula_snapshot;
                  
                  const targetTmel = result?.tmel;
                  const currentRiskGap = targetTmel !== null && targetTmel !== undefined && targetTmel > 0 && currentFreq > targetTmel
                    ? currentFreq / targetTmel
                    : null;

                  // 渲染 IPL 標籤與合規狀態 (連動雙檢視與控制措施類型)
                  const renderIPLCell = (barriers: typeof path.barriers) => {
                    const ipls = barriers.filter(b => b.is_ipl);
                    if (ipls.length === 0) {
                      return <span className="text-gray-400 dark:text-gray-500 italic text-xs">無獨立保護層</span>;
                    }
                    return (
                      <div className="flex flex-col gap-1.5">
                        {ipls.map(b => {
                          const node = nodes.find(n => n.id === b.barrier_node_id);
                          const name = node?.data?.label || '未命名保護層';
                          const code = node?.data?.entityData?.code || 'PB';
                          
                          // 讀取控制措施類型，預設為既有 existing
                          const controlType = b.control_type || 'existing';
                          const isNew = controlType === 'new';
                          const isOther = controlType === 'other';
                          
                          // 初始檢視下，排除新增或其他的控制措施 (其 PFD 強制為 1.0)
                          const isExcludedInInitial = isInitial && (isNew || isOther);
                          
                          const isCompliant = b.is_independent && b.is_effective && b.is_auditable;
                          const activeCompliance = isExcludedInInitial ? false : isCompliant;
                          const displayedPfd = isExcludedInInitial ? '1.0' : (isCompliant ? b.pfd : '1.0');

                          // 設定 Badge 樣式
                          let badgeBg = 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
                          let badgeLabel = '既有';
                          if (isNew) {
                            badgeBg = 'bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
                            badgeLabel = '新增';
                          } else if (isOther) {
                            badgeBg = 'bg-gray-100/80 dark:bg-slate-800 text-gray-700 dark:text-gray-300';
                            badgeLabel = '其他';
                          }
                          
                          return (
                            <div 
                              key={b.id} 
                              className={`p-2 rounded-lg border text-xs transition-all duration-300 ${
                                isExcludedInInitial
                                  ? 'opacity-40 bg-gray-50/50 dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                                  : activeCompliance 
                                    ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20' 
                                    : 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="font-semibold text-gray-750 dark:text-gray-300 truncate max-w-[130px]" title={`${code}: ${name}`}>
                                    {code}: {name}
                                  </span>
                                  <span className={`inline-block self-start text-[9px] px-1 rounded font-bold ${badgeBg}`}>
                                    {badgeLabel}
                                  </span>
                                </div>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isExcludedInInitial
                                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                    : activeCompliance 
                                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' 
                                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                }`}>
                                  PFD: {displayedPfd}
                                </span>
                              </div>
                              {isExcludedInInitial && (
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5 mt-1">
                                  <Info size={10} />
                                  <span>初始評估排除 (不減險)</span>
                                </div>
                              )}
                              {!isExcludedInInitial && !isCompliant && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-1" title="缺乏獨立性、有效性或可審核性，PFD 作為 1.0 (不減險) 計算">
                                  <AlertTriangle size={11} />
                                  <span>未合規 IPL (不減險)</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  };

                  return (
                    <tr 
                      key={path.id} 
                      className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      {/* 編號 */}
                      <td className="py-4 px-4 font-mono font-medium text-gray-500 dark:text-gray-400">
                        {idx + 1}
                      </td>

                      {/* 場景路徑拓撲 */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold text-xs">
                              {tCode}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 text-xs">➔</span>
                            <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold text-xs">
                              {cCode}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                            <strong className="text-gray-700 dark:text-gray-300 text-xs">{threatNode?.data?.label || '未命名威脅'}</strong>
                            <br />
                            導致 ➔ <span className="italic">{consequenceNode?.data?.label || '未命名後果'}</span>
                          </div>
                        </div>
                      </td>

                      {/* IE 年頻率 */}
                      <td className="py-4 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {path.initiating_event.input_mode === 'semi_quantitative' ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">L-{path.initiating_event.semi_quant_level}</span>
                            <span className="text-xs text-gray-450 dark:text-gray-500 mt-0.5">
                              (半定量模式)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm">
                              {path.initiating_event.frequency_per_year.toExponential(1)}
                            </span>
                            <span className="text-xs text-gray-450 dark:text-gray-500">
                              次/年
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 預防性 IPLs */}
                      <td className="py-4 px-4">
                        {renderIPLCell(prevIPLs)}
                      </td>

                      {/* 緩和性 IPLs */}
                      <td className="py-4 px-4">
                        {renderIPLCell(mitgIPLs)}
                      </td>

                      {/* TMEL 目標 */}
                      <td className="py-4 px-4 text-right font-mono font-medium text-gray-600 dark:text-gray-400">
                        {targetTmel ? targetTmel.toExponential(1) : '無限制'}
                      </td>

                      {/* 最終頻率 */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-gray-800 dark:text-gray-200 relative group cursor-help text-sm">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{currentFreq.toExponential(2)}</span>
                          <span className="text-xs text-blue-500 dark:text-blue-400 border-b border-dashed border-blue-300 dark:border-blue-700">
                            檢視公式
                          </span>
                        </div>
                        
                        {/* 公式氣泡 Tooltip */}
                        {currentFormula && (
                          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-20 w-80 bg-slate-950 text-slate-100 border border-slate-800 shadow-xl rounded-lg p-3 text-xs leading-relaxed backdrop-blur-md">
                            <div className="font-semibold text-blue-400 border-b border-slate-800 pb-1 mb-1.5 flex items-center gap-1 text-xs">
                              <Info size={12} />
                              <span>LOPA 計算公式快照 ({isInitial ? '初始評估' : '殘餘評估'})</span>
                            </div>
                            <code className="block bg-slate-900 p-1.5 rounded text-amber-300 break-all whitespace-pre-wrap font-mono text-xs">
                              {currentFormula}
                            </code>
                            <div className="mt-2 text-slate-400 text-xs">
                              {isInitial ? '初始評估已排除「新增」與「其他」控制措施之減險效益。' : '殘餘評估包含所有「既有」與「新增」措施的綜合效益。'}
                              <br />
                              IPL 合規驗證：PFD = 1.0 (若不合規)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 符合安全目標 */}
                      <td className="py-4 px-4 text-center">
                        {isMeetsTarget ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold text-xs">
                            <CheckCircle size={12} />
                            <span>合規</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full font-bold text-xs">
                              <XCircle size={12} />
                              <span>超標</span>
                            </div>
                            {currentRiskGap && (
                              <span className="text-xs text-red-500 dark:text-red-400 font-bold">
                                差 {currentRiskGap.toFixed(1)} 倍
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleJumpToCanvas(path.threat_node_id)}
                          className="inline-flex items-center gap-1 bg-gray-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700/60 transition-all font-semibold"
                          title="跳轉定位到畫布編輯此場景"
                        >
                          <Compass size={12} />
                          <span>跳轉定位</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LopaTable;
