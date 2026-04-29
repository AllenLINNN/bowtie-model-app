# Bowtie Web App

This project aims to build a web application for creating, editing, and managing Bowtie risk models. It features a visual drag-and-drop editor and a robust database management system for various risk entities.

## Project Overview

- **Purpose:** Provide a tool for risk management professionals to visualize and manage hazards, top events, threats, consequences, and barriers.
- **Core Methodology:** Follows the Bowtie model logic where:
  - **Hazard:** Source of harm.
  - **Top Event:** Moment control over the hazard is lost.
  - **Threats:** Causes leading to the Top Event.
  - **Consequences:** Outcomes after the Top Event.
  - **Barriers:** Control measures (preventive on the left, mitigative on the right).
- **Tech Stack:**
  - **Frontend:** React + TypeScript
  - **UI:** Tailwind CSS
  - **Diagram Editor:** React Flow
  - **State Management:** Zustand
  - **Persistence:** IndexedDB or local JSON export/import (MVP focus)

## Building and Running

*Note: The project is currently in the initial design phase. No code has been scaffolded yet.*

- **Install Dependencies:** `npm install` (TODO: verify when project is initialized)
- **Run Development Server:** `npm start` or `npm run dev` (TODO: verify)
- **Build for Production:** `npm run build` (TODO: verify)
- **Run Tests:** `npm test` (TODO: verify)

## Development Conventions

- **Type Safety:** Use TypeScript for all core domain models and application logic.
- **Architecture:** Follow a feature-based folder structure:
  - `src/features/`: Entity-specific logic (hazards, threats, etc.)
  - `src/components/`: Reusable UI components.
  - `src/store/`: Zustand state management.
- **Validation:** Enforce bowtie semantics (e.g., valid connection rules) both in the UI and data layer.
- **Visuals:** Use consistent node styles and color coding (Hazard: dark blue, Top Event: orange/red, etc.).

## Key Files

- `Bowtie app schema.md`: Comprehensive PRD and technical specification, including data models and functional requirements.
- `GEMINI.md`: This file, providing instructional context for AI interactions.

## Language
- 回覆與語言以繁體中文為主，專有名詞除外。