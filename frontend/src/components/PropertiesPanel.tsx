import React from 'react';
import { useStore } from '../store/useStore';
import { Database } from 'lucide-react';
import toast from 'react-hot-toast';

const PropertiesPanel = () => {
  const { nodes, edges, updateNodeData, updateEdgeData, addToLibrary, selectedLibraryItemId, library, updateLibraryItem, isLopaEnabled } = useStore();
  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected);
  const selectedLibraryItem = library.find(item => item.id === selectedLibraryItemId);

  const [localPfd, setLocalPfd] = React.useState<string>('0.1');

  const currentPfdValue = React.useMemo(() => {
    if (!selectedNode && !selectedLibraryItem) return undefined;
    const isLib = !selectedNode && !!selectedLibraryItem;
    const activeData = isLib ? selectedLibraryItem!.entityData : selectedNode!.data?.entityData;
    return activeData?.pfd;
  }, [selectedNode, selectedLibraryItem]);

  React.useEffect(() => {
    if (currentPfdValue !== undefined) {
      setLocalPfd(currentPfdValue.toString());
    } else {
      setLocalPfd('0.1');
    }
  }, [selectedNode?.id, selectedLibraryItemId, currentPfdValue]);

  if (!selectedNode && !selectedLibraryItem && !selectedEdge) {
    return (
      <aside className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center mt-10">點擊畫布上的節點/連線或左側資料庫項目來編輯屬性。</div>
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto flex flex-col gap-4 shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] dark:shadow-none text-slate-800 dark:text-slate-200">
        <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-2">
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">
            連線屬性 (Edge)
          </h2>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">失效機制 / 標籤 (Degradation Factor)</label>
          <input 
            type="text" 
            value={selectedEdge.label as string || ''} 
            onChange={(e) => updateEdgeData(selectedEdge.id, { label: e.target.value })} 
            className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
            placeholder="例如：人員疏忽、設備老化..."
          />
        </div>
      </aside>
    );
  }

  const isLibraryMode = !selectedNode && !!selectedLibraryItem;
  
  const data = isLibraryMode ? {
    label: selectedLibraryItem!.label,
    type: selectedLibraryItem!.type,
    entityId: selectedLibraryItem!.id,
    entityData: selectedLibraryItem!.entityData,
    fromLibraryId: null
  } : selectedNode!.data;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (isLibraryMode) {
      if (name === 'label') {
        updateLibraryItem(selectedLibraryItem!.id, { label: value });
      } else {
        updateLibraryItem(selectedLibraryItem!.id, {
          entityData: { ...selectedLibraryItem!.entityData, [name]: value }
        });
      }
    } else {
      if (name === 'label') {
        updateNodeData(selectedNode!.id, { label: value });
      } else {
        updateNodeData(selectedNode!.id, {
          entityData: { ...data.entityData, [name]: value }
        });
      }
    }
  };

  const handleSaveToLibrary = () => {
    if (data.fromLibraryId) {
      updateLibraryItem(data.fromLibraryId, {
        label: data.label,
        entityData: data.entityData || {}
      });
      toast.success(`已將 "${data.label}" 更新至資料庫！`);
    } else {
      if (data.entityData?.code) {
        const isDuplicate = library.some(item => item.entityData?.code === data.entityData?.code);
        if (isDuplicate) {
          toast.error(`資料庫已存在相同系統編號 (${data.entityData.code}) 的節點！`);
          return;
        }
      }

      const newId = addToLibrary({
        type: data.type,
        label: data.label,
        entityData: data.entityData || {}
      });
      if (selectedNode) {
        updateNodeData(selectedNode.id, { fromLibraryId: newId });
      }
      toast.success(`已將 "${data.label}" 儲存至資料庫！`);
    }
  };

  const entityData = data.entityData || {};

  const typeLabels: Record<string, string> = {
    hazard: '危害 (Hazard)',
    top_event: '頂端事件 (Top Event)',
    threat: '威脅 (Threat)',
    consequence: '後果 (Consequence)',
    preventive_barrier: '預防性屏障 (Preventive Barrier)',
    mitigative_barrier: '減緩性屏障 (Mitigative Barrier)'
  };

  return (
    <aside className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto flex flex-col gap-4 shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] dark:shadow-none text-slate-800 dark:text-slate-200">
      <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-2">
        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">
          {isLibraryMode ? '資料庫項目屬性' : typeLabels[data.type] || '節點屬性'}
        </h2>
        {!isLibraryMode && (
          <button 
            onClick={handleSaveToLibrary}
            className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 px-2 py-1 rounded font-semibold transition-colors shrink-0"
            title="將此節點設定儲存至全域資料庫，以便未來重複使用"
          >
            <Database size={12} /> 儲存
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">名稱 (Label)</label>
        <input 
          type="text" 
          name="label" 
          value={data.label} 
          onChange={handleChange} 
          className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">系統編號 (Code)</label>
        <input 
          type="text" 
          name="code" 
          value={entityData.code || ''} 
          onChange={handleChange} 
          className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800/50 dark:text-white"
          placeholder="自動產生或手動輸入..."
          disabled={!isLibraryMode && data.fromLibraryId != null}
          title={!isLibraryMode && data.fromLibraryId ? "已從資料庫連動，不可修改" : ""}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">詳細描述 (Description)</label>
        <textarea 
          name="description" 
          value={entityData.description || ''} 
          onChange={handleChange} 
          rows={4}
          className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all resize-none bg-white dark:bg-slate-800 dark:text-white"
          placeholder="輸入詳細說明..."
        />
      </div>

      {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">控制效力 (Effectiveness)</label>
            <select 
              name="effectiveness" 
              value={entityData.effectiveness || ''} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value="" disabled>請選擇效力...</option>
              <option value="very-good">非常好 (Very Good)</option>
              <option value="good">良好 (Good)</option>
              <option value="poor">不佳 (Poor)</option>
              <option value="very-poor">極差 (Very Poor)</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">屏障類型 (Barrier Type)</label>
            <select 
              name="barrier_type" 
              value={entityData.barrier_type || ''} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value="" disabled>請選擇類型...</option>
              <option value="behavioral">行為控制 (Behavioral)</option>
              <option value="socio-technical">社會技術 (Socio-technical)</option>
              <option value="active-hardware">主動硬體 (Active-hardware)</option>
              <option value="continuous-hardware">持續硬體 (Continuous-hardware)</option>
              <option value="passive-hardware">被動硬體 (Passive-hardware)</option>
              <option value="organizational">組織管理 (Organizational)</option>
              <option value="other">其他 (Other)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">負責人 / 單位 (Owner)</label>
            <input 
              type="text" 
              name="owner" 
              value={entityData.owner || ''} 
              onChange={handleChange} 
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
              placeholder="e.g., 工安部、維修課..."
            />
          </div>
        </>
      )}

      {isLopaEnabled && data.type === 'threat' && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex flex-col gap-3">
          <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">LOPA 起始事件設定</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">輸入模式 (Input Mode)</label>
            <select 
              name="input_mode" 
              value={entityData.input_mode || 'semi_quantitative'} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value="semi_quantitative">半定量 (Semi-Quantitative)</option>
              <option value="quantitative">定量 (Quantitative)</option>
            </select>
          </div>

          {entityData.input_mode === 'quantitative' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">起始事件年頻率 (F_IE / Year)</label>
              <input 
                type="number" 
                name="frequency_value" 
                step="any"
                value={entityData.frequency_value !== undefined ? entityData.frequency_value : 0.1} 
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  updateNodeData(selectedNode!.id, {
                    entityData: { 
                      ...entityData, 
                      frequency_value: val,
                      frequency_per_year: val
                    }
                  });
                }}
                className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
                placeholder="例如：0.01"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">可能性等級 (Likelihood Level)</label>
              <select 
                name="semi_quant_likelihood" 
                value={entityData.semi_quant_likelihood || 3} 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 3;
                  updateNodeData(selectedNode!.id, {
                    entityData: { 
                      ...entityData, 
                      semi_quant_likelihood: val
                    }
                  });
                }}
                className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
              >
                <option value={1}>{"等級 1 (極不可能 <= 10⁻⁵ / yr)"}</option>
                <option value={2}>{"等級 2 (不可能 ~ 10⁻⁴ / yr)"}</option>
                <option value={3}>{"等級 3 (可能 ~ 10⁻³ / yr)"}</option>
                <option value={4}>{"等級 4 (極可能 ~ 10⁻² / yr)"}</option>
                <option value={5}>{"等級 5 (幾乎確定 >= 10⁻¹ / yr)"}</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">數據來源 (Source)</label>
            <input 
              type="text" 
              name="source" 
              value={entityData.source || ''} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
              placeholder="e.g., OREDA, CCPS..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">數據置信度 (Confidence)</label>
            <select 
              name="confidence_level" 
              value={entityData.confidence_level || 'medium'} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value="high">高 (High)</option>
              <option value="medium">中 (Medium)</option>
              <option value="low">低 (Low)</option>
            </select>
          </div>
        </div>
      )}

      {isLopaEnabled && (data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex flex-col gap-3">
          <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">LOPA 安全保護層 (IPL) 設定</h3>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">獨立保護層 (IPL) 屬性</label>
            <button
              onClick={() => {
                updateNodeData(selectedNode!.id, {
                  entityData: { ...entityData, is_ipl: !entityData.is_ipl }
                });
              }}
              className={`px-3 py-1 text-xs rounded font-bold transition-colors ${entityData.is_ipl ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
            >
              {entityData.is_ipl ? '已啟用 IPL' : '未啟用 IPL'}
            </button>
          </div>

          {entityData.is_ipl && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">失效概率 (PFD / Probability of Failure)</label>
                <input 
                  type="number" 
                  name="pfd" 
                  step="0.01"
                  min="0"
                  max="1"
                  value={localPfd} 
                  onChange={(e) => {
                    const strVal = e.target.value;
                    setLocalPfd(strVal);
                    
                    const p = parseFloat(strVal);
                    if (!isNaN(p)) {
                      const validP = Math.max(0, Math.min(1, p));
                      const rrfVal = validP > 0 ? 1 / validP : 10;
                      
                      if (isLibraryMode) {
                        updateLibraryItem(selectedLibraryItem!.id, {
                          entityData: { ...selectedLibraryItem!.entityData, pfd: validP, rrf: rrfVal }
                        });
                      } else {
                        updateNodeData(selectedNode!.id, {
                          entityData: { ...entityData, pfd: validP, rrf: rrfVal }
                        });
                      }
                    }
                  }}
                  className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
                  placeholder="e.g., 0.01"
                />
                <span className="text-[10px] text-gray-500">
                  對應減險因子 RRF: {entityData.rrf ? Math.round(entityData.rrf) : (entityData.pfd ? Math.round(1 / entityData.pfd) : 10)}
                </span>
              </div>

              <div className="border border-gray-200 dark:border-slate-800 rounded p-2 bg-gray-50 dark:bg-slate-850/40 flex flex-col gap-2">
                <span className="text-[10px] font-semibold text-gray-500">IPL 合規性指標 (必須全為是)：</span>
                
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={entityData.is_independent !== false} 
                    onChange={(e) => {
                      updateNodeData(selectedNode!.id, {
                        entityData: { ...entityData, is_independent: e.target.checked }
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-750"
                  />
                  <span>具備獨立性 (Independent)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={entityData.is_effective !== false} 
                    onChange={(e) => {
                      updateNodeData(selectedNode!.id, {
                        entityData: { ...entityData, is_effective: e.target.checked }
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-750"
                  />
                  <span>具備有效性 (Effective)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={entityData.is_auditable !== false} 
                    onChange={(e) => {
                      updateNodeData(selectedNode!.id, {
                        entityData: { ...entityData, is_auditable: e.target.checked }
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-750"
                  />
                  <span>具備可審計性 (Auditable)</span>
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">PFD 數據依據 (PFD Basis)</label>
                <input 
                  type="text" 
                  name="pfd_basis" 
                  value={entityData.pfd_basis || ''} 
                  onChange={handleChange}
                  className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
                  placeholder="e.g., 廠商數據、IEC 61508..."
                />
              </div>
            </>
          )}
        </div>
      )}

      {isLopaEnabled && data.type === 'consequence' && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex flex-col gap-3">
          <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">LOPA 安全後果設定</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">安全後果類別 (TMEL Category)</label>
            <select 
              name="consequence_category" 
              value={entityData.consequence_category || 'fatality'} 
              onChange={handleChange}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value="fatality">人員死亡 (Fatality) [TMEL: 10⁻⁴]</option>
              <option value="serious_injury">人員重傷 (Serious Injury) [TMEL: 10⁻³]</option>
              <option value="minor_injury">人員輕傷 (Minor Injury) [TMEL: 10⁻²]</option>
              <option value="property_damage">重大財損 (Property Damage) [TMEL: 10⁻³]</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">嚴重度等級 (Severity Level)</label>
            <select 
              name="semi_quant_severity" 
              value={entityData.semi_quant_severity || 3} 
              onChange={(e) => {
                const val = parseInt(e.target.value) || 3;
                updateNodeData(selectedNode!.id, {
                  entityData: { ...entityData, semi_quant_severity: val }
                });
              }}
              className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 dark:text-white"
            >
              <option value={1}>等級 1 (可忽略，無受傷)</option>
              <option value={2}>等級 2 (輕微，小財損)</option>
              <option value={3}>等級 3 (中等，住院受傷)</option>
              <option value={4}>等級 4 (嚴重，重大財損)</option>
              <option value={5}>等級 5 (災難性，人員死亡)</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 break-all font-mono">
        節點 ID: {data.entityId}
        {data.fromLibraryId && <div className="mt-1 text-blue-500 dark:text-blue-400 font-bold">🔗 已連動至全域資料庫</div>}
      </div>
    </aside>
  );
};

export default PropertiesPanel;