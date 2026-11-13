import { NodeType } from '../types';

/**
 * 六種 Bowtie 節點的名稱與配色，畫布節點、左側範本、資料庫與專案卡片共用這一份。
 * 配色規則：淡色底 + 彩色左邊框；範本預覽與拖到畫布上的節點外觀一致。
 */
export interface NodeTypeMeta {
  type: NodeType;
  label: string;       // 完整名稱（面板標題、範本）
  shortLabel: string;  // 簡稱（統計標籤）
  card: string;        // 節點與範本卡片：底色 + 左邊框 + 文字色
  dot: string;         // 類別圓點
  chip: string;        // 統計標籤
}

export const NODE_TYPES: NodeTypeMeta[] = [
  {
    type: 'hazard',
    label: '危害 (Hazard)',
    shortLabel: '危害',
    card: 'bg-amber-50 dark:bg-amber-950/30 border-l-amber-500 dark:border-l-amber-400 text-slate-800 dark:text-amber-100',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  },
  {
    type: 'top_event',
    label: '頂端事件 (Top Event)',
    shortLabel: '頂端事件',
    card: 'bg-red-50 dark:bg-red-950/30 border-l-red-600 dark:border-l-red-400 text-slate-800 dark:text-red-100',
    dot: 'bg-red-600',
    chip: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
  },
  {
    type: 'threat',
    label: '威脅 (Threat)',
    shortLabel: '威脅',
    card: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-600 dark:border-l-blue-400 text-slate-800 dark:text-blue-100',
    dot: 'bg-blue-600',
    chip: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  },
  {
    type: 'preventive_barrier',
    label: '預防性屏障 (Preventive Barrier)',
    shortLabel: '預防性屏障',
    card: 'bg-emerald-50 dark:bg-emerald-950/30 border-l-emerald-600 dark:border-l-emerald-400 text-slate-800 dark:text-emerald-100',
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  },
  {
    type: 'mitigative_barrier',
    label: '減緩性屏障 (Mitigative Barrier)',
    shortLabel: '減緩性屏障',
    card: 'bg-purple-50 dark:bg-purple-950/30 border-l-purple-600 dark:border-l-purple-400 text-slate-800 dark:text-purple-100',
    dot: 'bg-purple-600',
    chip: 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  },
  {
    type: 'consequence',
    label: '後果 (Consequence)',
    shortLabel: '後果',
    card: 'bg-orange-50 dark:bg-orange-950/30 border-l-orange-500 dark:border-l-orange-400 text-slate-800 dark:text-orange-100',
    dot: 'bg-orange-500',
    chip: 'bg-orange-50 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  },
];

export const getNodeTypeMeta = (type: NodeType | string | undefined): NodeTypeMeta =>
  NODE_TYPES.find((t) => t.type === type) ?? NODE_TYPES[3];
