# Bowtie Web App

This project is a React-based web application for creating, editing, and managing Bowtie risk models. It features a visual drag-and-drop editor (React Flow) and a local-first database management system.

## Schema vs. Prototype Implementation

The `Bowtie app schema.md` contains the comprehensive, future-ready relational database design (with strict tables, foreign keys, and extensive metadata fields like `category`, `lifecycle_phase`, etc.). 

**Current Prototype Status:**
To achieve a fully offline, serverless experience that can be hosted on GitHub Pages, the current prototype implements a **Local-First NoSQL-like approach** using `IndexedDB` (via `localforage`) and `Zustand`. 
- **Data Model:** Instead of strict relational tables, the app uses a flexible `DiagramNodeData` interface where specific entity properties (like `code`, `owner`, `effectiveness`) are stored in an `entityData` dictionary.
- **Relationships:** The "many-to-many" relationships defined in the schema (e.g., `ThreatBarrierLink`) are handled intrinsically by the graphical `edges` drawn in React Flow, rather than explicit linking tables.
- **Global Library:** Entities can be saved from individual project canvases into a global `library`, allowing them to be reused across different Bowtie diagrams.

## Core Rules & Conventions

1. **Local-First Security:** The app MUST remain fully functional offline. Do not introduce server-side API calls for core CRUD operations. All state MUST be persisted to `IndexedDB`.
2. **Auto-Numbering (Critical Rule):**
   - When a node is dragged from "Templates" to the canvas, it receives a **preview** code via `peekNextCode()`.
   - The global counter is **ONLY incremented** when the user clicks "Save" in the Properties Panel to store the node in the Global Library. This prevents sequence gaps.
3. **Bowtie Rules Validation:** Nodes can only be connected in specific logical sequences (e.g., Threat -> Preventive Barrier -> Top Event). Preventive barriers can connect to other preventive barriers. Mitigative barriers can connect to mitigative barriers.
4. **Node Styling:**
   - Hazard: Dark Blue (`bg-blue-900`)
   - Top Event: Red (`bg-red-600`)
   - Threat: Blue (`bg-blue-500`)
   - Consequence: Red (`bg-red-500`)
   - Barriers: Light Gray (`bg-gray-200`)
5. **Deployment:** The project is deployed to GitHub Pages using a GitHub Actions workflow (`.github/workflows/deploy.yml`). It uses `base: '/bowtie-model-app/'` for a standard repository deployment.

## Key Files
- `src/store/useStore.ts`: The central nervous system handling state, persistence, library management, and auto-coding logic.
- `src/components/BowtieEditor.tsx`: The React Flow canvas where node dropping, connection validation, and visual rendering happen.
- `src/types/index.ts`: Shared TypeScript interfaces.

## Language
- 回覆與語言以繁體中文為主，專有名詞除外。