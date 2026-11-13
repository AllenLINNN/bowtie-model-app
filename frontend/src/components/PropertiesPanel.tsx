import React from 'react';
import { useStore } from '../store/useStore';
import { Database, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { EntityData } from '../types';
import { getNodeTypeMeta } from '../utils/nodeTypes';
import { Field, Switch, inputClass } from './ui';

const asideClass =
  'w-80 border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto flex flex-col gap-4 shrink-0 z-10 text-slate-800 dark:text-slate-200';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400">{children}</h3>
);

const SEVERITY_TO_CATEGORY: Record<number, string> = {
  5: 'fatality',
  4: 'serious_injury',
  3: 'property_damage',
  2: 'minor_injury',
  1: 'none',
};

const PropertiesPanel = () => {
  const { nodes, edges, updateNodeData, updateEdgeData, addToLibrary, selectedLibraryItemId, library, updateLibraryItem, isLopaEnabled } = useStore();
  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected);
  const selectedLibraryItem = library.find(item => item.id === selectedLibraryItemId);

  const [localPfd, setLocalPfd] = React.useState<string>('0.1');

  const currentPfdValue = React.useMemo(() => {
    if (!selectedNode && !selectedLibraryItem) return undefined;
    const activeData = selectedNode ? selectedNode.data?.entityData : selectedLibraryItem!.entityData;
    return activeData?.pfd;
  }, [selectedNode, selectedLibraryItem]);

  React.useEffect(() => {
    setLocalPfd(currentPfdValue !== undefined ? currentPfdValue.toString() : '0.1');
  }, [selectedNode?.id, selectedLibraryItemId, currentPfdValue]);

  if (!selectedNode && !selectedLibraryItem && !selectedEdge) {
    return (
      <aside aria-label="屬性面板" className={asideClass}>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-10 leading-relaxed">
          點選畫布上的節點、連線，或左側資料庫的項目，即可在這裡編輯屬性。
        </p>
      </aside>
    );
  }

  if (selectedEdge && !selectedNode) {
    return (
      <aside aria-label="屬性面板" className={asideClass}>
        <div className="border-b border-gray-200 dark:border-slate-800 pb-2">
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">連線屬性</h2>
        </div>
        <Field label="失效機制／標籤 (Degradation Factor)">
          {(id) => (
            <input
              id={id}
              type="text"
              value={(selectedEdge.label as string) || ''}
              onChange={(e) => updateEdgeData(selectedEdge.id, { label: e.target.value })}
              className={inputClass}
              placeholder="例如：人員疏忽、設備老化…"
            />
          )}
        </Field>
      </aside>
    );
  }

  const isLibraryMode = !selectedNode && !!selectedLibraryItem;

  const data = isLibraryMode ? {
    label: selectedLibraryItem!.label,
    type: selectedLibraryItem!.type,
    entityId: selectedLibraryItem!.id,
    entityData: selectedLibraryItem!.entityData,
    fromLibraryId: null as string | null | undefined
  } : selectedNode!.data;

  const entityData: EntityData = data.entityData || {};

  /** 節點模式寫回畫布節點，資料庫模式寫回資料庫項目；所有欄位都經過這裡 */
  const patchEntity = (patch: Partial<EntityData>) => {
    if (isLibraryMode) {
      updateLibraryItem(selectedLibraryItem!.id, { entityData: { ...selectedLibraryItem!.entityData, ...patch } });
    } else {
      updateNodeData(selectedNode!.id, { entityData: { ...entityData, ...patch } });
    }
  };

  const patchLabel = (label: string) => {
    if (isLibraryMode) updateLibraryItem(selectedLibraryItem!.id, { label });
    else updateNodeData(selectedNode!.id, { label });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'label') patchLabel(value);
    else patchEntity({ [name]: value });
  };

  const handleSaveToLibrary = () => {
    if (data.fromLibraryId) {
      updateLibraryItem(data.fromLibraryId, {
        label: data.label,
        entityData: data.entityData || {}
      });
      toast.success(`已更新資料庫中的「${data.label}」`);
      return;
    }

    if (data.entityData?.code) {
      const isDuplicate = library.some(item => item.entityData?.code === data.entityData?.code);
      if (isDuplicate) {
        toast.error(`資料庫已有相同系統編號（${data.entityData.code}）的項目`);
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
    toast.success(`已將「${data.label}」儲存到資料庫`);
  };

  const isBarrier = data.type === 'preventive_barrier' || data.type === 'mitigative_barrier';
  const codeLocked = !isLibraryMode && data.fromLibraryId != null;
  const rrf = entityData.rrf ? Math.round(entityData.rrf) : (entityData.pfd ? Math.round(1 / entityData.pfd) : 10);

  return (
    <aside aria-label="屬性面板" className={asideClass}>
      <div className="flex justify-between items-start gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
        <div>
          {isLibraryMode && <p className="text-xs font-medium text-gray-500 dark:text-gray-400">資料庫項目</p>}
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">{getNodeTypeMeta(data.type).label}</h2>
        </div>
        {!isLibraryMode && (
          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 px-2 py-1.5 rounded-md font-semibold transition-colors shrink-0"
            title="把這個節點的設定存到全域資料庫，之後可在其他專案重複使用"
          >
            <Database size={12} aria-hidden="true" /> {data.fromLibraryId ? '更新資料庫' : '儲存到資料庫'}
          </button>
        )}
      </div>

      <Field label="名稱 (Label)">
        {(id) => <input id={id} type="text" name="label" value={data.label} onChange={handleChange} className={inputClass} />}
      </Field>

      <Field label="系統編號 (Code)" hint={codeLocked ? '已連動資料庫，編號不可修改。' : undefined}>
        {(id, hintId) => (
          <input
            id={id}
            type="text"
            name="code"
            value={entityData.code || ''}
            onChange={handleChange}
            className={`${inputClass} font-mono`}
            placeholder="自動產生或手動輸入…"
            disabled={codeLocked}
            aria-describedby={hintId}
          />
        )}
      </Field>

      <Field label="詳細描述 (Description)">
        {(id) => (
          <textarea
            id={id}
            name="description"
            value={entityData.description || ''}
            onChange={handleChange}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="輸入詳細說明…"
          />
        )}
      </Field>

      {isBarrier && (
        <>
          <Field label="控制效力 (Effectiveness)">
            {(id) => (
              <select id={id} name="effectiveness" value={entityData.effectiveness || ''} onChange={handleChange} className={inputClass}>
                <option value="" disabled>請選擇效力…</option>
                <option value="very-good">非常好 (Very Good)</option>
                <option value="good">良好 (Good)</option>
                <option value="poor">不佳 (Poor)</option>
                <option value="very-poor">極差 (Very Poor)</option>
              </select>
            )}
          </Field>

          <Field label="屏障類型 (Barrier Type)">
            {(id) => (
              <select id={id} name="barrier_type" value={entityData.barrier_type || ''} onChange={handleChange} className={inputClass}>
                <option value="" disabled>請選擇類型…</option>
                <option value="behavioral">行為控制 (Behavioral)</option>
                <option value="socio-technical">社會技術 (Socio-technical)</option>
                <option value="active-hardware">主動硬體 (Active-hardware)</option>
                <option value="continuous-hardware">持續硬體 (Continuous-hardware)</option>
                <option value="passive-hardware">被動硬體 (Passive-hardware)</option>
                <option value="organizational">組織管理 (Organizational)</option>
                <option value="other">其他 (Other)</option>
              </select>
            )}
          </Field>

          <Field label="控制措施類型 (Control Type)">
            {(id) => (
              <select id={id} name="control_type" value={entityData.control_type || 'existing'} onChange={handleChange} className={inputClass}>
                <option value="existing">既有控制措施 (Existing)</option>
                <option value="new">新增控制措施 (New)</option>
                <option value="other">其他 (Other)</option>
              </select>
            )}
          </Field>

          <Field label="負責人／單位 (Owner)">
            {(id) => (
              <input id={id} type="text" name="owner" value={entityData.owner || ''} onChange={handleChange} className={inputClass} placeholder="例如：工安部、維修課…" />
            )}
          </Field>
        </>
      )}

      {isLopaEnabled && data.type === 'threat' && (
        <section className="border-t border-gray-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
          <SectionTitle>LOPA 起始事件設定</SectionTitle>

          <Field label="輸入模式 (Input Mode)">
            {(id) => (
              <select id={id} name="input_mode" value={entityData.input_mode || 'semi_quantitative'} onChange={handleChange} className={inputClass}>
                <option value="semi_quantitative">半定量 (Semi-Quantitative)</option>
                <option value="quantitative">定量 (Quantitative)</option>
              </select>
            )}
          </Field>

          {entityData.input_mode === 'quantitative' ? (
            <Field label="起始事件年頻率 (F_IE，次/年)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={entityData.frequency_value !== undefined ? entityData.frequency_value : 0.1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    patchEntity({ frequency_value: val, frequency_per_year: val });
                  }}
                  className={`${inputClass} font-mono`}
                  placeholder="例如：0.01"
                />
              )}
            </Field>
          ) : (
            <Field label="可能性等級 (Likelihood Level)">
              {(id) => (
                <select
                  id={id}
                  value={entityData.semi_quant_likelihood || 3}
                  onChange={(e) => patchEntity({ semi_quant_likelihood: (parseInt(e.target.value) || 3) as EntityData['semi_quant_likelihood'] })}
                  className={inputClass}
                >
                  <option value={1}>{'等級 1（極不可能 ≤ 10⁻⁵／年）'}</option>
                  <option value={2}>{'等級 2（不可能 ~ 10⁻⁴／年）'}</option>
                  <option value={3}>{'等級 3（可能 ~ 10⁻³／年）'}</option>
                  <option value={4}>{'等級 4（極可能 ~ 10⁻²／年）'}</option>
                  <option value={5}>{'等級 5（幾乎確定 ≥ 10⁻¹／年）'}</option>
                </select>
              )}
            </Field>
          )}

          <Field label="資料來源 (Source)">
            {(id) => (
              <input id={id} type="text" name="source" value={entityData.source || ''} onChange={handleChange} className={inputClass} placeholder="例如：OREDA、CCPS…" />
            )}
          </Field>

          <Field label="資料信賴度 (Confidence)">
            {(id) => (
              <select id={id} name="confidence_level" value={entityData.confidence_level || 'medium'} onChange={handleChange} className={inputClass}>
                <option value="high">高 (High)</option>
                <option value="medium">中 (Medium)</option>
                <option value="low">低 (Low)</option>
              </select>
            )}
          </Field>
        </section>
      )}

      {isLopaEnabled && isBarrier && (
        <section className="border-t border-gray-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
          <SectionTitle>LOPA 獨立保護層 (IPL) 設定</SectionTitle>

          <div className="flex items-center justify-between">
            <Switch checked={!!entityData.is_ipl} onChange={(v) => patchEntity({ is_ipl: v })} label="列為獨立保護層 (IPL)" />
          </div>

          {entityData.is_ipl && (
            <>
              <Field label="失效機率 (PFD)" hint={`對應減險因子 RRF：${rrf}`}>
                {(id, hintId) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    name="pfd"
                    step="0.01"
                    min="0"
                    max="1"
                    value={localPfd}
                    aria-describedby={hintId}
                    onChange={(e) => {
                      const strVal = e.target.value;
                      setLocalPfd(strVal);
                      const p = parseFloat(strVal);
                      if (!isNaN(p)) {
                        const validP = Math.max(0, Math.min(1, p));
                        patchEntity({ pfd: validP, rrf: validP > 0 ? 1 / validP : 10 });
                      }
                    }}
                    className={`${inputClass} font-mono`}
                    placeholder="例如：0.01"
                  />
                )}
              </Field>

              <fieldset className="border border-gray-200 dark:border-slate-700 rounded-md p-3 bg-gray-50 dark:bg-slate-800/40 flex flex-col gap-2">
                <legend className="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">IPL 合規性（三項都要符合）</legend>
                {([
                  ['is_independent', '具備獨立性 (Independent)'],
                  ['is_effective', '具備有效性 (Effective)'],
                  ['is_auditable', '具備可稽核性 (Auditable)'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={entityData[key] !== false}
                      onChange={(e) => patchEntity({ [key]: e.target.checked })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>

              <Field label="PFD 資料依據 (PFD Basis)">
                {(id) => (
                  <input id={id} type="text" name="pfd_basis" value={entityData.pfd_basis || ''} onChange={handleChange} className={inputClass} placeholder="例如：廠商資料、IEC 61508…" />
                )}
              </Field>
            </>
          )}
        </section>
      )}

      {isLopaEnabled && data.type === 'consequence' && (
        <section className="border-t border-gray-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
          <SectionTitle>LOPA 安全後果設定</SectionTitle>
          <Field label="嚴重度等級 (Severity Level)" hint="系統依嚴重度自動判定後果類別與對應的安全目標頻率 (TMEL)。">
            {(id, hintId) => (
              <select
                id={id}
                aria-describedby={hintId}
                value={entityData.semi_quant_severity || 3}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 3;
                  patchEntity({
                    semi_quant_severity: val as EntityData['semi_quant_severity'],
                    consequence_category: SEVERITY_TO_CATEGORY[val] as EntityData['consequence_category'],
                  });
                }}
                className={inputClass}
              >
                <option value={1}>等級 1（虛驚）</option>
                <option value={2}>等級 2（延誤行車）</option>
                <option value={3}>等級 3（財損）</option>
                <option value={4}>等級 4（受傷）</option>
                <option value={5}>等級 5（死亡）</option>
              </select>
            )}
          </Field>
        </section>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 break-all font-mono">
        節點 ID：{data.entityId}
        {data.fromLibraryId && (
          <div className="mt-1 flex items-center gap-1 font-sans font-semibold text-blue-600 dark:text-blue-400">
            <Link2 size={12} aria-hidden="true" /> 已連動全域資料庫
          </div>
        )}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
