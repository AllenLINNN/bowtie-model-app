# Bowtie Web App Schema / PRD

## Project goal
Build a web app for creating, editing, and managing Bowtie risk models.
The app must support:
- Database management for Hazard, Top Event, Threat, Consequence, Barrier
- Visual drag-and-drop Bowtie diagram editor
- Linking database records to diagram nodes
- Storing preventive and mitigative barriers
- Laying the groundwork for future SPI generation

The bowtie model must follow this logic:
- Hazard is the source of harm
- Top Event is the moment control over the hazard is lost
- Threats are causes that may lead to the Top Event
- Consequences are outcomes after the Top Event
- Barriers on the left are preventive barriers
- Barriers on the right are mitigative/recovery barriers

---

## Tech stack
- Frontend: React + TypeScript
- UI: Tailwind CSS
- Diagram editor: React Flow
- State management: Zustand
- Local persistence: IndexedDB or local JSON export/import
- Future-ready API structure, but MVP can run fully client-side

---

## Core domain model

### 1. Hazard
Represents an energy source, operational hazard, or hazardous condition.

```ts
type Hazard = {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  system?: string
  subsystem?: string
  lifecycle_phase?: string
  source_reference?: string
  tags?: string[]
  created_at: string
  updated_at: string
}
```

### 2. Top Event
Represents the moment control over the hazard is lost.

```ts
type TopEvent = {
  id: string
  hazard_id: string
  code: string
  name: string
  description?: string
  loss_of_control_statement: string
  severity_note?: string
  assumptions?: string
  tags?: string[]
  created_at: string
  updated_at: string
}
```

### 3. Threat
Represents a cause or trigger that may lead to the Top Event.

```ts
type Threat = {
  id: string
  top_event_id: string
  code: string
  name: string
  description?: string
  threat_type?: 'human' | 'technical' | 'organizational' | 'environmental' | 'external' | 'other'
  initiating_factor?: string
  source_reference?: string
  tags?: string[]
  created_at: string
  updated_at: string
}
```

### 4. Consequence
Represents an outcome after the Top Event occurs.

```ts
type Consequence = {
  id: string
  top_event_id: string
  code: string
  name: string
  description?: string
  impact_type?: 'safety' | 'operations' | 'asset' | 'environment' | 'reputation' | 'other'
  severity_level?: number
  source_reference?: string
  tags?: string[]
  created_at: string
  updated_at: string
}
```

### 5. Barrier
Represents a control measure.
A barrier may be preventive (left side) or mitigative (right side).

```ts
type Barrier = {
  id: string
  code: string
  name: string
  description?: string
  barrier_side: 'preventive' | 'mitigative'
  barrier_type?: 'behavioral' | 'socio-technical' | 'active-hardware' | 'continuous-hardware' | 'passive-hardware' | 'organizational' | 'other'
  owner?: string
  criticality?: 'low' | 'medium' | 'high' | 'critical'
  effectiveness_rating?: 'very-poor' | 'poor' | 'good' | 'very-good'
  adequacy_score?: number
  reliability_score?: number
  evidence_source?: string
  review_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'ad-hoc'
  status?: 'active' | 'degraded' | 'inactive' | 'planned'
  source_reference?: string
  tags?: string[]
  created_at: string
  updated_at: string
}
```

---

## Relationship tables

A barrier should not be hardcoded to only one threat or one consequence.
Use many-to-many mapping so the same barrier can protect multiple scenarios.

### Threat to Barrier
```ts
type ThreatBarrierLink = {
  id: string
  threat_id: string
  barrier_id: string
  sequence_no?: number
  notes?: string
  created_at: string
}
```

### Consequence to Barrier
```ts
type ConsequenceBarrierLink = {
  id: string
  consequence_id: string
  barrier_id: string
  sequence_no?: number
  notes?: string
  created_at: string
}
```

---

## Optional future-ready entities

### Escalation Factor
Represents a condition that degrades barrier performance.

```ts
type EscalationFactor = {
  id: string
  barrier_id: string
  code: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}
```

### Escalation Factor Control
Represents a control for managing an escalation factor.

```ts
type EscalationFactorControl = {
  id: string
  escalation_factor_id: string
  code: string
  name: string
  description?: string
  owner?: string
  effectiveness_rating?: 'very-poor' | 'poor' | 'good' | 'very-good'
  created_at: string
  updated_at: string
}
```

### SPI Candidate
Future module for generating leading/lagging indicators from barriers.

```ts
type SPICandidate = {
  id: string
  related_entity_type: 'barrier' | 'threat' | 'consequence' | 'top_event'
  related_entity_id: string
  indicator_name: string
  indicator_type: 'leading' | 'lagging'
  measure_type: 'activity' | 'availability' | 'compliance' | 'outcome'
  definition: string
  numerator?: string
  denominator?: string
  data_source?: string
  unit?: string
  frequency?: string
  owner?: string
  target?: string
  threshold?: string
  created_at: string
  updated_at: string
}
```

---

## Diagram editor data model

The diagram editor must store layout separately from the core database.
One Bowtie Model is one editable visual representation around one Top Event.

### Bowtie Model
```ts
type BowtieModel = {
  id: string
  hazard_id: string
  top_event_id: string
  name: string
  description?: string
  version?: string
  status?: 'draft' | 'review' | 'approved'
  created_at: string
  updated_at: string
}
```

### Diagram Node
```ts
type DiagramNode = {
  id: string
  bowtie_model_id: string
  entity_type: 'hazard' | 'top_event' | 'threat' | 'consequence' | 'barrier'
  entity_id: string
  position_x: number
  position_y: number
  width?: number
  height?: number
  style_variant?: string
  created_at: string
  updated_at: string
}
```

### Diagram Edge
```ts
type DiagramEdge = {
  id: string
  bowtie_model_id: string
  source_node_id: string
  target_node_id: string
  edge_type?: 'threat_to_top_event' | 'top_event_to_consequence' | 'threat_to_barrier' | 'barrier_to_top_event' | 'top_event_to_barrier' | 'barrier_to_consequence'
  label?: string
  created_at: string
  updated_at: string
}
```

---

## Diagram layout rules

The Bowtie canvas must enforce bowtie semantics:
- Hazard appears above or near the Top Event
- Top Event is always centered
- Threats appear on the left
- Consequences appear on the right
- Preventive barriers appear between Threats and Top Event
- Mitigative barriers appear between Top Event and Consequences

The app should support:
- Drag nodes from sidebar to canvas
- Drag existing nodes to reposition
- Connect nodes with edges
- Prevent invalid connections where possible
- Snap to grid
- Auto-layout button for standard bowtie alignment
- Manual override after auto-layout
- Zoom, pan, fit view
- Node color coding by entity type

---

## Valid connection rules

Only allow these connections:

- Threat -> Preventive Barrier
- Preventive Barrier -> Top Event
- Top Event -> Mitigative Barrier
- Mitigative Barrier -> Consequence
- Threat -> Top Event (optional direct path if no barrier yet)
- Top Event -> Consequence (optional direct path if no barrier yet)

Do NOT allow:
- Consequence -> Threat
- Barrier -> unrelated side
- Threat -> Consequence
- Consequence -> Top Event
- Mitigative Barrier on left side
- Preventive Barrier on right side

Validation should run both in UI and in data save logic.

---

## Main screens

### 1. Dashboard
- List bowtie models
- Search by hazard, top event, tag, owner
- Show status counts

### 2. Hazard Library
- Create, edit, delete hazard records
- Filter by category, system, lifecycle phase

### 3. Top Event Library
- Linked to hazard
- Create and manage top events

### 4. Threat Library
- Linked to top event
- Create and manage threat records

### 5. Consequence Library
- Linked to top event
- Create and manage consequence records

### 6. Barrier Library
- Create and manage barriers
- Filter by barrier_side, barrier_type, effectiveness_rating, owner, status

### 7. Bowtie Editor
- Left sidebar: entity palette and existing library items
- Center canvas: drag-and-drop bowtie drawing area
- Right sidebar: selected node properties and relationship editor

### 8. Model Detail Page
- Show associated hazard, top event, threats, consequences, barriers
- Show metadata and audit history
- Export JSON / PNG / PDF later

---

## UX requirements for drag-and-drop bowtie editor

- Sidebar contains draggable node templates:
  - Hazard
  - Top Event
  - Threat
  - Consequence
  - Preventive Barrier
  - Mitigative Barrier

- User can drag a template onto canvas to create a new node
- User can also drag an existing library item onto canvas
- On drop:
  - open quick-create modal if it is a new item
  - or link to existing entity if selected from library

- When a Threat is added:
  - default position = left side
- When a Consequence is added:
  - default position = right side
- When a Preventive Barrier is added:
  - default position = between selected Threat and Top Event
- When a Mitigative Barrier is added:
  - default position = between Top Event and selected Consequence

- When connecting nodes:
  - validate bowtie relationship rules
  - show error toast on invalid connection
  - auto-create relationship table entries when valid

---

## UI color suggestions

Use consistent node styles:
- Hazard: dark blue
- Top Event: orange or red center node
- Threat: blue left-side node
- Consequence: red right-side node
- Preventive Barrier: gray box with blue metadata strip
- Mitigative Barrier: gray box with green metadata strip

Barrier card footer should show:
- barrier_type
- effectiveness_rating
- owner or status badge

Example:
`SOCIO-TECHNICAL | POOR`
`ACTIVE HARDWARE | VERY GOOD`

---

## Sample JSON object

```json
{
  "hazard": {
    "id": "haz-001",
    "code": "HZ-001",
    "name": "Running train movement",
    "description": "Train movement in operational track area",
    "created_at": "2026-04-28T00:00:00Z",
    "updated_at": "2026-04-28T00:00:00Z"
  },
  "top_event": {
    "id": "te-001",
    "hazard_id": "haz-001",
    "code": "TE-001",
    "name": "Uncontrolled train overspeed",
    "loss_of_control_statement": "Train exceeds safe operating speed without effective control",
    "created_at": "2026-04-28T00:00:00Z",
    "updated_at": "2026-04-28T00:00:00Z"
  },
  "threats": [
    {
      "id": "thr-001",
      "top_event_id": "te-001",
      "code": "THR-001",
      "name": "Driver overspeed behavior",
      "threat_type": "human",
      "created_at": "2026-04-28T00:00:00Z",
      "updated_at": "2026-04-28T00:00:00Z"
    }
  ],
  "consequences": [
    {
      "id": "con-001",
      "top_event_id": "te-001",
      "code": "CON-001",
      "name": "Derailment",
      "impact_type": "safety",
      "severity_level": 5,
      "created_at": "2026-04-28T00:00:00Z",
      "updated_at": "2026-04-28T00:00:00Z"
    }
  ],
  "barriers": [
    {
      "id": "bar-001",
      "code": "BAR-001",
      "name": "ATP overspeed warning and emergency brake",
      "barrier_side": "preventive",
      "barrier_type": "active-hardware",
      "effectiveness_rating": "very-good",
      "adequacy_score": 90,
      "reliability_score": 95,
      "status": "active",
      "created_at": "2026-04-28T00:00:00Z",
      "updated_at": "2026-04-28T00:00:00Z"
    }
  ]
}
```

---

## Functional requirements

### CRUD
The app must support full create/read/update/delete for:
- Hazard
- Top Event
- Threat
- Consequence
- Barrier
- Bowtie Model

### Diagram interactions
The app must support:
- drag from sidebar
- drop on canvas
- click to edit node
- connect nodes
- delete nodes and edges
- multi-select nodes
- move nodes
- save diagram layout
- load saved diagram

### Validation
The app must:
- prevent orphan Top Event without Hazard
- prevent Threat without Top Event
- prevent Consequence without Top Event
- require barrier_side on each barrier
- validate left/right barrier usage
- prevent invalid node connection types

### Search and filters
The app must support:
- search by code, name, keyword
- filter barriers by type, side, rating, status
- filter models by hazard and top event

### Export / import
MVP should support:
- export all data as JSON
- import JSON backup
- export current bowtie canvas as PNG

---

## Non-functional requirements

- Responsive layout
- Clean desktop-first editor UI
- Keyboard shortcuts for delete, duplicate, save
- Type-safe codebase with TypeScript
- Reusable domain model
- Future extension for:
  - SPI generation
  - barrier assurance workflow
  - audit trail
  - role-based access control
  - collaboration
  - evidence attachments

---

## Suggested folder structure

```txt
src/
  app/
  components/
    bowtie/
    library/
    forms/
    layout/
  features/
    hazards/
    top-events/
    threats/
    consequences/
    barriers/
    bowtie-models/
  store/
  types/
  utils/
```

---

## Implementation note for Gemini CLI
Please scaffold a working MVP web app with:
1. React + TypeScript
2. Tailwind CSS
3. React Flow drag-and-drop editor
4. Sidebar with draggable node types
5. CRUD pages for all core entities
6. Local mock storage
7. Sample seed data
8. Basic validation for allowed bowtie connections

The first milestone is:
- Create libraries for Hazard, Top Event, Threat, Consequence, Barrier
- Build Bowtie Editor page
- Support drag-and-drop creation and edge connection
- Save and reload one model locally