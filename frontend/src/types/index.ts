import { Edge, Node } from '@xyflow/react';

export type NodeType = 'hazard' | 'top_event' | 'threat' | 'consequence' | 'preventive_barrier' | 'mitigative_barrier';

export interface BaseEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Any additional specific fields per entity type
export interface EntityData {
  code?: string;
  description?: string;
  effectiveness?: string;
  owner?: string;
  barrier_type?: 'behavioral' | 'socio-technical' | 'active-hardware' | 'continuous-hardware' | 'passive-hardware' | 'organizational' | 'other';
  [key: string]: any;
}

export interface LibraryItem {
  id: string;
  type: NodeType;
  label: string;
  entityData: EntityData;
  created_at: number;
}

export interface DiagramNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  entityId?: string;
  entityData?: EntityData;
  fromLibraryId?: string; // If it was dragged from library
}

export type BowtieNode = Node<DiagramNodeData>;

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  last_modified: number;
  nodes: BowtieNode[];
  edges: Edge[];
  archived?: boolean;
}
