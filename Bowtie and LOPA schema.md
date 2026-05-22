# Bowtie 半定量分析 Schema Document

**版本**：v0.1.0-mvp  
**對應專案版本**：bowtie-model-app `main` @ `100373f`  
**產出日期**：2026-05-22  
**狀態**：草稿，供 MVP 開發使用

***

## 1. 設計目標

本 schema 擴充既有的質化 Bowtie 資料模型，加入**半定量分析（Semi-Quantitative Analysis）**能力，遠期支援完整 LOPA 頻率計算。

**設計原則：**
- **非破壞性擴充**：所有新欄位均為選填（`optional`），不影響既有質化資料的讀寫
- **向後相容**：既有 `Project`、`BowtieNode`、`EntityData` 介面沿用，量化資料以獨立物件掛載
- **Local-First 優先**：所有量化資料同樣序列化至 `IndexedDB`（`localforage`），不依賴後端
- **Scenario-Path 導向**：以 `Threat → Top Event → Consequence` 組合作為量化的最小分析單元
- **MVP 先行**：標記 `[MVP]` 的欄位為第一版必要實作；標記 `[FUTURE]` 的欄位留待後續迭代

***

## 2. 資料模型概覽

```
Project
 └── nodes[] (BowtieNode — 既有)
 └── edges[] (Edge — 既有)
 └── analysisConfig?  (LopaAnalysisConfig — 新增，每個 Project 一份)
      └── riskCriteria (RiskCriteria)
      └── scenarioPaths[] (ScenarioPath)
           ├── threatRef → BowtieNode (type: 'threat')
           ├── topEventRef → BowtieNode (type: 'top_event')
           ├── consequenceRef → BowtieNode (type: 'consequence')
           ├── initiatingEvent (InitiatingEvent)
           ├── barriers[] (BarrierAnalysis — 對應既有 preventive/mitigative_barrier 節點)
           ├── conditionalModifiers[] (ConditionalModifier)
           └── calculationResult? (CalculationResult)

EntityData (既有，擴充欄位)
 └── ipl_data? (IplData — 附掛在 barrier 節點的 EntityData 上)
```

***

## 3. Core Entities 定義

***

### 3.1 `LopaAnalysisConfig`

掛載於 `Project` 的頂層量化設定物件，**每個 Project 至多一份**。

```typescript
interface LopaAnalysisConfig {
  id: string;                          // [MVP] uuid
  version: string;                     // [MVP] schema version, e.g. "0.1.0"
  created_at: number;                  // [MVP] timestamp ms
  updated_at: number;                  // [MVP] timestamp ms
  riskCriteria: RiskCriteria;          // [MVP] 組織風險準則設定
  scenarioPaths: ScenarioPath[];       // [MVP] 各分析路徑
  notes?: string;                      // [FUTURE] 分析備註
}
```

**掛載方式**（擴充 `Project` interface）：

```typescript
interface Project {
  // ... 既有欄位不變 ...
  analysisConfig?: LopaAnalysisConfig; // 新增，選填
}
```

***

### 3.2 `RiskCriteria`

組織層級的風險準則，作為各 ScenarioPath 判斷是否達標的基準。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | `string` | [MVP] | uuid |
| `name` | `string` | [MVP] | 準則名稱，如「公司 TMEL 準則 v2」 |
| `tmel_fatality` | `number \| null` | [MVP] | 致命事故目標頻率上限（次/年），如 `1e-4` |
| `tmel_serious_injury` | `number \| null` | [MVP] | 重傷目標頻率上限（次/年） |
| `tmel_minor_injury` | `number \| null` | [MVP] | 輕傷目標頻率上限（次/年） |
| `tmel_property_damage` | `number \| null` | [MVP] | 財損目標頻率上限（次/年） |
| `risk_matrix_config` | `RiskMatrixConfig` | [MVP] | 半定量風險矩陣設定 |
| `standard_reference` | `string` | [FUTURE] | 引用標準，如「ICAO SMM 4th Ed.」 |
| `notes` | `string` | [FUTURE] | 備註 |

```typescript
interface RiskCriteria {
  id: string;
  name: string;
  tmel_fatality: number | null;
  tmel_serious_injury: number | null;
  tmel_minor_injury: number | null;
  tmel_property_damage: number | null;
  risk_matrix_config: RiskMatrixConfig;
  standard_reference?: string;
  notes?: string;
}
```

***

### 3.3 `RiskMatrixConfig`

定義半定量風險矩陣的等級設定，可自訂軸向值。

```typescript
interface RiskMatrixConfig {
  severity_levels: SeverityLevel[];       // [MVP] 嚴重度等級定義
  likelihood_levels: LikelihoodLevel[];   // [MVP] 可能性等級定義
  acceptability_matrix: AcceptabilityCell[][]; // [MVP] 二維矩陣，[severity_index][likelihood_index]
}

interface SeverityLevel {
  level: 1 | 2 | 3 | 4 | 5;             // [MVP] 數值（1=最低）
  label: string;                          // [MVP] 如「可忽略」「輕微」「中等」「嚴重」「災難性」
  description?: string;                   // [MVP] 說明
  frequency_proxy?: number;              // [FUTURE] 對應頻率（次/年）作為 LOPA 輔助
}

interface LikelihoodLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;                          // 如「極不可能」「不可能」「可能」「極可能」「幾乎確定」
  description?: string;
  frequency_proxy?: number;              // [FUTURE] 如 1e-5, 1e-4, 1e-3, 1e-2, 1e-1
}

type AcceptabilityCell = 'acceptable' | 'alarp' | 'unacceptable';
```

***

### 3.4 `ScenarioPath`

**分析的核心單元**。一個 ScenarioPath 代表一條 `Threat → Top Event → Consequence` 路徑，是 LOPA 計算的最小單位。

> 一個 Top Event 可能有多個 Threats 與多個 Consequences，因此同一 Bowtie 圖可產生多條 ScenarioPath。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | `string` | [MVP] | uuid |
| `threat_node_id` | `string` | [MVP] | 對應 `BowtieNode.id`（type: `threat`） |
| `top_event_node_id` | `string` | [MVP] | 對應 `BowtieNode.id`（type: `top_event`） |
| `consequence_node_id` | `string` | [MVP] | 對應 `BowtieNode.id`（type: `consequence`） |
| `initiating_event` | `InitiatingEvent` | [MVP] | 威脅的起始事件頻率 |
| `barriers` | `BarrierAnalysis[]` | [MVP] | 路徑上的屏障分析（可含預防與緩解） |
| `conditional_modifiers` | `ConditionalModifier[]` | [MVP] | 條件修正因子 |
| `calculation_result` | `CalculationResult \| null` | [MVP] | 計算結果（可為 null 表示尚未計算） |
| `is_active` | `boolean` | [MVP] | 是否納入計算（可停用特定路徑） |
| `created_at` | `number` | [MVP] | timestamp ms |
| `updated_at` | `number` | [MVP] | timestamp ms |
| `notes` | `string` | [FUTURE] | 分析備註 |
| `audit_trail` | `AuditEntry[]` | [FUTURE] | 計算歷程記錄 |

```typescript
interface ScenarioPath {
  id: string;
  threat_node_id: string;
  top_event_node_id: string;
  consequence_node_id: string;
  initiating_event: InitiatingEvent;
  barriers: BarrierAnalysis[];
  conditional_modifiers: ConditionalModifier[];
  calculation_result: CalculationResult | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  notes?: string;
  audit_trail?: AuditEntry[];
}
```

***

### 3.5 `InitiatingEvent`

記錄威脅的初始事件頻率（Initiating Event Frequency, IEF），支援單位轉換與半定量分級。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `frequency_value` | `number` | [MVP] | 數值，與 `frequency_unit` 搭配 |
| `frequency_unit` | `FrequencyUnit` | [MVP] | 頻率單位 |
| `frequency_per_year` | `number` | [MVP] | **標準化後的年頻率**（自動換算），作為計算輸入 |
| `semi_quant_level` | `1\|2\|3\|4\|5 \| null` | [MVP] | 半定量等級（對應 `LikelihoodLevel`），與 `frequency_value` 二選一或並存 |
| `input_mode` | `'quantitative' \| 'semi_quantitative'` | [MVP] | 輸入模式，決定用哪個值計算 |
| `source` | `string` | [MVP] | 數值來源說明，如「歷史事故統計 2020-2025」 |
| `confidence_level` | `'low' \| 'medium' \| 'high'` | [MVP] | 數值可信度 |
| `reference` | `string` | [FUTURE] | 文獻/資料庫參考 |

```typescript
type FrequencyUnit = 'per_year' | 'per_month' | 'per_week' | 'per_day' | 'per_operation' | 'per_km';

// 單位轉換係數（to per_year）
const FREQUENCY_UNIT_TO_PER_YEAR: Record<FrequencyUnit, number> = {
  per_year: 1,
  per_month: 12,
  per_week: 52,
  per_day: 365,
  per_operation: null, // 需額外輸入 operations_per_year
  per_km: null,        // 需額外輸入 km_per_year
};

interface InitiatingEvent {
  frequency_value: number;
  frequency_unit: FrequencyUnit;
  frequency_per_year: number;           // derived, auto-calculated
  semi_quant_level: 1 | 2 | 3 | 4 | 5 | null;
  input_mode: 'quantitative' | 'semi_quantitative';
  source: string;
  confidence_level: 'low' | 'medium' | 'high';
  operations_per_year?: number;         // [MVP] 當 unit 為 per_operation 時必填
  km_per_year?: number;                 // [FUTURE] 鐵道里程相關
  reference?: string;
}
```

***

### 3.6 `BarrierAnalysis`

對應圖上既有的 `preventive_barrier` 或 `mitigative_barrier` 節點，附加量化分析資料。**注意：此物件不取代節點的 `entityData`，而是在 `ScenarioPath` 內獨立存在，因為同一個 barrier 節點可能在不同 ScenarioPath 有不同的 PFD 假設。**

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | `string` | [MVP] | uuid |
| `barrier_node_id` | `string` | [MVP] | 對應 `BowtieNode.id` |
| `barrier_role` | `'preventive' \| 'mitigative'` | [MVP] | 在此路徑的角色（通常與節點 type 一致，但允許手動覆寫） |
| `is_ipl` | `boolean` | [MVP] | 是否作為獨立保護層（IPL） |
| `pfd` | `number \| null` | [MVP] | Probability of Failure on Demand（0–1），LOPA 使用 |
| `rrf` | `number \| null` | [MVP] | Risk Reduction Factor = 1/PFD（自動計算） |
| `pfd_basis` | `string` | [MVP] | PFD 數值依據，如「CCPS LOPA Table 2.3」 |
| `is_independent` | `boolean` | [MVP] | IPL 獨立性：是否獨立於其他 IPL 和起始事件 |
| `is_auditable` | `boolean` | [MVP] | 可查核性：是否有定期檢驗/驗證紀錄 |
| `is_effective` | `boolean` | [MVP] | 有效性：目前是否實際發揮作用（非降級或缺失） |
| `deficiency` | `BarrierDeficiency \| null` | [MVP] | 缺失狀態 |
| `semi_quant_effectiveness` | `'high' \| 'medium' \| 'low' \| null` | [MVP] | 半定量有效性等級（當 pfd 未輸入時使用） |
| `order_in_path` | `number` | [MVP] | 在路徑中的順序（從 threat 側計算） |
| `notes` | `string` | [FUTURE] | 備註 |

```typescript
type BarrierEffectiveness = 'high' | 'medium' | 'low';

interface BarrierDeficiency {
  status: 'degraded' | 'missing' | 'inadequate';
  description: string;
  action_required?: string;
}

interface BarrierAnalysis {
  id: string;
  barrier_node_id: string;
  barrier_role: 'preventive' | 'mitigative';
  is_ipl: boolean;
  pfd: number | null;
  rrf: number | null;               // derived: 1 / pfd
  pfd_basis: string;
  is_independent: boolean;
  is_auditable: boolean;
  is_effective: boolean;
  deficiency: BarrierDeficiency | null;
  semi_quant_effectiveness: BarrierEffectiveness | null;
  order_in_path: number;
  notes?: string;
}
```

**IPL 資格判斷規則**（驗證用）：
- `is_ipl === true` → 必須同時滿足 `is_independent && is_auditable && is_effective`
- 若 `is_ipl === true` 但 `pfd === null`，則 `semi_quant_effectiveness` 不得為 `null`

***

### 3.7 `ConditionalModifier`

條件修正因子，用於調整特定情境的暴露機率，鐵道場景尤其需要此欄位。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | `string` | [MVP] | uuid |
| `type` | `ConditionalModifierType` | [MVP] | 修正因子類型 |
| `label` | `string` | [MVP] | 自訂標籤，如「夜間作業時段比例」 |
| `value` | `number` | [MVP] | 數值（通常為 0–1 之間的概率） |
| `basis` | `string` | [MVP] | 數值依據 |
| `is_active` | `boolean` | [MVP] | 是否納入此次計算 |
| `notes` | `string` | [FUTURE] | 備註 |

```typescript
type ConditionalModifierType =
  | 'personnel_presence_probability'  // 人員在場機率
  | 'train_occupancy_probability'     // 列車通過機率（鐵道專用）
  | 'operational_window_fraction'     // 作業時段佔比
  | 'operational_mode_factor'         // 操作模式修正（如維修模式 vs. 正常模式）
  | 'weather_condition_factor'        // 天候條件係數
  | 'ignition_probability'            // 點火機率（化工類）
  | 'custom';                         // 自訂

interface ConditionalModifier {
  id: string;
  type: ConditionalModifierType;
  label: string;
  value: number;                      // 0 < value <= 1（驗證規則見第 8 節）
  basis: string;
  is_active: boolean;
  notes?: string;
}
```

***

### 3.8 `CalculationResult`

儲存單一 ScenarioPath 的計算結果，由計算引擎填入，不允許手動編輯。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `calculated_at` | `number` | [MVP] | timestamp ms |
| `mitigated_event_frequency` | `number` | [MVP] | 通過所有預防屏障後的 Top Event 頻率（次/年） |
| `consequence_frequency` | `number` | [MVP] | 通過所有緩解屏障後的後果頻率（次/年） |
| `conditional_modified_frequency` | `number` | [MVP] | 套用 ConditionalModifiers 後的最終頻率 |
| `tmel` | `number \| null` | [MVP] | 套用的 TMEL 值（來自 RiskCriteria） |
| `meets_criteria` | `boolean \| null` | [MVP] | 是否符合目標準則（`null` 表示 TMEL 未設定） |
| `risk_gap` | `number \| null` | [MVP] | `conditional_modified_frequency / tmel`，> 1 表示不達標 |
| `required_additional_rrf` | `number \| null` | [MVP] | 若不達標，尚需的額外 RRF |
| `semi_quant_risk_score` | `SemiQuantRiskScore \| null` | [MVP] | 半定量風險評分結果 |
| `ipl_count` | `number` | [MVP] | 有效 IPL 數量 |
| `calculation_mode` | `'quantitative' \| 'semi_quantitative'` | [MVP] | 本次計算使用的模式 |
| `formula_snapshot` | `string` | [FUTURE] | 計算公式快照（供 Audit Trail 使用） |

```typescript
interface SemiQuantRiskScore {
  severity_level: 1 | 2 | 3 | 4 | 5;
  likelihood_level: 1 | 2 | 3 | 4 | 5;
  acceptability: 'acceptable' | 'alarp' | 'unacceptable';
}

interface CalculationResult {
  calculated_at: number;
  mitigated_event_frequency: number;
  consequence_frequency: number;
  conditional_modified_frequency: number;
  tmel: number | null;
  meets_criteria: boolean | null;
  risk_gap: number | null;
  required_additional_rrf: number | null;
  semi_quant_risk_score: SemiQuantRiskScore | null;
  ipl_count: number;
  calculation_mode: 'quantitative' | 'semi_quantitative';
  formula_snapshot?: string;
}
```

***

### 3.9 `AuditEntry` `[FUTURE]`

記錄每次量化值變更的稽核軌跡，MVP 可先留介面定義，不實際寫入。

```typescript
interface AuditEntry {
  id: string;
  timestamp: number;
  field_changed: string;               // 如 "barriers[0].pfd"
  old_value: unknown;
  new_value: unknown;
  changed_by: string;                  // MVP 可填 "user"（無帳號系統）
  reason?: string;                     // 變更原因
}
```

***

## 4. 計算流程與公式

### 4.1 LOPA 頻率計算（定量模式）

**Step 1：標準化起始頻率**
```
f_initiating = InitiatingEvent.frequency_per_year
             = frequency_value × FREQUENCY_UNIT_TO_PER_YEAR[frequency_unit]
```

**Step 2：套用預防屏障（Preventive Barriers）**
```
f_top_event = f_initiating × ∏ PFD_i    （i ∈ 預防屏障，is_effective = true）
```

**Step 3：套用緩解屏障（Mitigative Barriers）**
```
f_consequence = f_top_event × ∏ PFD_j   （j ∈ 緩解屏障，is_effective = true）
```

**Step 4：套用條件修正因子**
```
f_final = f_consequence × ∏ ConditionalModifier_k.value   （k ∈ is_active = true）
```

**Step 5：與 TMEL 比較**
```
risk_gap = f_final / TMEL
meets_criteria = (risk_gap <= 1.0)
required_additional_rrf = meets_criteria ? null : ceil(risk_gap)
```

### 4.2 半定量風險矩陣模式

當 `input_mode = 'semi_quantitative'` 時：

```
severity_level      = consequence 節點的 semi_quant_severity（見 4.3）
likelihood_level    = initiating_event.semi_quant_level
                      （可選：調整後 = max(1, semi_quant_level - IPL 數量）
acceptability       = RiskMatrixConfig.acceptability_matrix[severity-1][likelihood-1]
```

### 4.3 既有 `EntityData` 擴充欄位建議

在既有 `EntityData` 中新增以下**選填欄位**（不破壞現有結構）：

```typescript
interface EntityData {
  // ... 既有欄位不變 ...
  
  // Threat 節點專用
  semi_quant_likelihood?: 1 | 2 | 3 | 4 | 5;   // 半定量可能性等級

  // Consequence 節點專用
  semi_quant_severity?: 1 | 2 | 3 | 4 | 5;     // 半定量嚴重度等級
  consequence_category?: 'fatality' | 'serious_injury' | 'minor_injury' | 'property_damage' | 'service_disruption' | 'environmental';

  // Barrier 節點專用（全域預設值，ScenarioPath 內可覆寫）
  default_pfd?: number;
  default_is_ipl?: boolean;
}
```

***

## 5. Entity 關聯圖

```
Project (1) ──────────── (0..1) LopaAnalysisConfig
                                      │
                         (1) RiskCriteria
                                      │
                         (1) RiskMatrixConfig
                                      │
                         (N) ScenarioPath
                                ├── threat_node_id ──→ BowtieNode (threat)
                                ├── top_event_node_id → BowtieNode (top_event)
                                ├── consequence_node_id → BowtieNode (consequence)
                                ├── (1) InitiatingEvent
                                ├── (N) BarrierAnalysis
                                │         └── barrier_node_id ──→ BowtieNode (barrier)
                                ├── (N) ConditionalModifier
                                └── (0..1) CalculationResult
```

***

## 6. MVP 必要欄位 vs. 未來擴充

### MVP（第一版必須實作）

- `LopaAnalysisConfig`：`id`, `version`, `created_at`, `updated_at`, `riskCriteria`, `scenarioPaths`
- `RiskCriteria`：所有 TMEL 欄位、`risk_matrix_config`
- `ScenarioPath`：三個 node ref、`initiating_event`、`barriers`、`conditional_modifiers`、`calculation_result`、`is_active`
- `InitiatingEvent`：`frequency_value`, `frequency_unit`, `frequency_per_year`, `input_mode`, `source`, `confidence_level`
- `BarrierAnalysis`：`barrier_node_id`, `barrier_role`, `is_ipl`, `pfd`, `rrf`, `is_independent`, `is_auditable`, `is_effective`, `order_in_path`
- `CalculationResult`：所有核心計算欄位

### FUTURE（後續迭代）

- `AuditEntry` 完整實作
- `km_per_year` / `per_km` 鐵道里程換算
- `formula_snapshot` 公式快照
- AI 屏障推薦欄位
- 多準則（多個 RiskCriteria）比較

***

## 7. 資料驗證規則

```typescript
// 驗證清單（建議實作在 utils/lopaValidation.ts）

// R-01: PFD 範圍
assert(barrier.pfd === null || (barrier.pfd > 0 && barrier.pfd <= 1))

// R-02: IPL 資格
if (barrier.is_ipl) {
  assert(barrier.is_independent && barrier.is_auditable && barrier.is_effective,
    'IPL 必須同時滿足獨立性、可查核性、有效性')
}

// R-03: IPL 需有量化基礎
if (barrier.is_ipl) {
  assert(barrier.pfd !== null || barrier.semi_quant_effectiveness !== null,
    'IPL 必須有 PFD 或半定量效力等級')
}

// R-04: ScenarioPath 節點型別
assert(getNodeById(path.threat_node_id)?.data.type === 'threat')
assert(getNodeById(path.top_event_node_id)?.data.type === 'top_event')
assert(getNodeById(path.consequence_node_id)?.data.type === 'consequence')

// R-05: ConditionalModifier 值域
assert(modifier.value > 0 && modifier.value <= 1,
  'ConditionalModifier.value 必須在 (0, 1] 範圍內')

// R-06: 頻率計算正值
assert(initiatingEvent.frequency_per_year > 0)

// R-07: 同一路徑中屏障 order_in_path 不重複
const orders = path.barriers.map(b => b.order_in_path)
assert(new Set(orders).size === orders.length)

// R-08: 半定量等級範圍
assert([1,2,3,4,5].includes(level))
```

***

## 8. 建議新增的檔案結構

```
frontend/src/
├── types/
│   ├── index.ts          （既有，補充 EntityData 擴充欄位與 analysisConfig）
│   └── lopa.ts           （新增，本 schema 所有 LOPA 相關 interface）
├── utils/
│   ├── layout.ts         （既有）
│   ├── lopaEngine.ts     （新增，計算邏輯：步驟 4.1–4.2）
│   └── lopaValidation.ts （新增，第 7 節驗證規則）
└── store/
    └── useStore.ts       （既有，擴充：新增 analysisConfig CRUD actions）
```

***

## 9. 完整 TypeScript Interface 匯總

```typescript
// frontend/src/types/lopa.ts

export type FrequencyUnit = 
  | 'per_year' | 'per_month' | 'per_week' 
  | 'per_day' | 'per_operation' | 'per_km';

export type ConditionalModifierType =
  | 'personnel_presence_probability'
  | 'train_occupancy_probability'
  | 'operational_window_fraction'
  | 'operational_mode_factor'
  | 'weather_condition_factor'
  | 'ignition_probability'
  | 'custom';

export type BarrierEffectiveness = 'high' | 'medium' | 'low';
export type AcceptabilityRating = 'acceptable' | 'alarp' | 'unacceptable';
export type ConsequenceCategory = 
  | 'fatality' | 'serious_injury' | 'minor_injury' 
  | 'property_damage' | 'service_disruption' | 'environmental';

export interface SeverityLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description?: string;
  frequency_proxy?: number;
}

export interface LikelihoodLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description?: string;
  frequency_proxy?: number;
}

export interface RiskMatrixConfig {
  severity_levels: SeverityLevel[];
  likelihood_levels: LikelihoodLevel[];
  acceptability_matrix: AcceptabilityRating[][];
}

export interface RiskCriteria {
  id: string;
  name: string;
  tmel_fatality: number | null;
  tmel_serious_injury: number | null;
  tmel_minor_injury: number | null;
  tmel_property_damage: number | null;
  risk_matrix_config: RiskMatrixConfig;
  standard_reference?: string;
  notes?: string;
}

export interface InitiatingEvent {
  frequency_value: number;
  frequency_unit: FrequencyUnit;
  frequency_per_year: number;
  semi_quant_level: 1 | 2 | 3 | 4 | 5 | null;
  input_mode: 'quantitative' | 'semi_quantitative';
  source: string;
  confidence_level: 'low' | 'medium' | 'high';
  operations_per_year?: number;
  km_per_year?: number;
  reference?: string;
}

export interface BarrierDeficiency {
  status: 'degraded' | 'missing' | 'inadequate';
  description: string;
  action_required?: string;
}

export interface BarrierAnalysis {
  id: string;
  barrier_node_id: string;
  barrier_role: 'preventive' | 'mitigative';
  is_ipl: boolean;
  pfd: number | null;
  rrf: number | null;
  pfd_basis: string;
  is_independent: boolean;
  is_auditable: boolean;
  is_effective: boolean;
  deficiency: BarrierDeficiency | null;
  semi_quant_effectiveness: BarrierEffectiveness | null;
  order_in_path: number;
  notes?: string;
}

export interface ConditionalModifier {
  id: string;
  type: ConditionalModifierType;
  label: string;
  value: number;
  basis: string;
  is_active: boolean;
  notes?: string;
}

export interface SemiQuantRiskScore {
  severity_level: 1 | 2 | 3 | 4 | 5;
  likelihood_level: 1 | 2 | 3 | 4 | 5;
  acceptability: AcceptabilityRating;
}

export interface CalculationResult {
  calculated_at: number;
  mitigated_event_frequency: number;
  consequence_frequency: number;
  conditional_modified_frequency: number;
  tmel: number | null;
  meets_criteria: boolean | null;
  risk_gap: number | null;
  required_additional_rrf: number | null;
  semi_quant_risk_score: SemiQuantRiskScore | null;
  ipl_count: number;
  calculation_mode: 'quantitative' | 'semi_quantitative';
  formula_snapshot?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  field_changed: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string;
  reason?: string;
}

export interface ScenarioPath {
  id: string;
  threat_node_id: string;
  top_event_node_id: string;
  consequence_node_id: string;
  initiating_event: InitiatingEvent;
  barriers: BarrierAnalysis[];
  conditional_modifiers: ConditionalModifier[];
  calculation_result: CalculationResult | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  notes?: string;
  audit_trail?: AuditEntry[];
}

export interface LopaAnalysisConfig {
  id: string;
  version: string;
  created_at: number;
  updated_at: number;
  riskCriteria: RiskCriteria;
  scenarioPaths: ScenarioPath[];
  notes?: string;
}
```

