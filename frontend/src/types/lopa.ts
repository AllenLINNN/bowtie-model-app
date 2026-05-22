// C:\Users\2342\Desktop\Side Projects\Bowtie app\frontend\src\types\lopa.ts

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
