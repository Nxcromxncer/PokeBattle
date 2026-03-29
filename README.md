# Pokémon Battle Simulator

A full-stack, trainer-based battle simulator built with FastAPI and React. Uses live data from PokéAPI, deterministic combat mechanics faithful to the mainline games, and AI-generated narration powered by Groq.

> **Disclaimer:** This is an unofficial fan project created for educational and portfolio purposes. Pokémon, all character names, and all related indicia are trademarks of Nintendo, Game Freak, and The Pokémon Company. This project is not affiliated with, endorsed by, or sponsored by any of those entities. No copyright infringement is intended. All Pokémon data is sourced from the community-maintained [PokéAPI](https://pokeapi.co).

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [How to Play](#how-to-play)
- [Battle Mechanics](#battle-mechanics)
- [API Reference](#api-reference)
- [Features](#features)
- [License](#license)

---

## Overview

This simulator lets you create custom trainers, assemble teams from Generation 1–9 Pokémon, and run turn-based battles between two trainers. Every battle event is narrated in real time by an LLM (Groq's Llama 3.3), while all damage calculations remain fully deterministic on the backend.

The project is split into two independent services:

- **Backend** — handles all game logic, Pokémon data fetching, caching, and narration requests
- **Frontend** — a display and input layer only; no game logic runs in the browser

---

## Tech Stack

| Layer     | Technology                                     |
|-----------|------------------------------------------------|
| Backend   | Python 3.11+, FastAPI, SQLite                  |
| Data      | PokéAPI (`https://pokeapi.co`)                 |
| AI        | Groq API — `llama-3.3-70b-versatile`           |
| Frontend  | React 18, Vite, TypeScript, Axios              |
| Fonts     | Press Start 2P, Nunito (Google Fonts)          |

---

## Project Structure

```
pokemon-battle/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── database.py              # SQLite schema and query helpers
│   ├── pokeapi_service.py       # PokéAPI client with local caching
│   ├── battle_engine.py         # Deterministic damage and turn logic
│   ├── narration_service.py     # Groq LLM integration with fallback
│   ├── routers/
│   │   ├── pokemon.py           # /pokemon endpoints
│   │   ├── trainer.py           # /trainer endpoints
│   │   └── battle.py           # /battle endpoints
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── TrainerCreation.tsx
    │   │   ├── TeamBuilder.tsx
    │   │   └── BattleScreen.tsx
    │   ├── api/client.ts        # Axios API client
    │   ├── types/index.ts       # Shared TypeScript types
    │   ├── styles/global.css
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- npm

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (see Configuration below)
cp .env.example .env

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs are served at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Configuration

All configuration is managed via environment variables in `backend/.env`.

| Variable       | Required | Description                                                    |
|----------------|----------|----------------------------------------------------------------|
| `GROQ_API_KEY` | Optional | API key from [console.groq.com](https://console.groq.com). If omitted, the system falls back to built-in narration automatically. |

```env
GROQ_API_KEY=gsk_your_key_here
```

---

## How to Play

1. **Create Trainers** — Navigate to the Trainers page and create at least two trainers.
2. **Build Teams** — Go to Team Builder, search for a Pokémon by name, review its stats and moves, select up to 4 moves, and add it to a trainer. Each trainer can hold a maximum of 6 Pokémon.
3. **Battle** — Go to Battle Arena, select two trainers, start the battle, and click a move each turn to attack.

---

## Battle Mechanics

### Damage Formula

Based on the Generation 5+ damage formula:

```
damage = (((2 × Level / 5 + 2) × Power × Atk / Def) / 50 + 2)
       × CriticalModifier × TypeEffectiveness × STAB × RandomModifier
```

| Factor              | Value                                            |
|---------------------|--------------------------------------------------|
| Level               | Fixed at 50 for all Pokémon                      |
| STAB                | 1.5× when move type matches the attacker's type  |
| Critical Hit        | 6.25% chance; applies a 1.5× damage multiplier  |
| Random Modifier     | Uniformly sampled from [0.85, 1.00]             |
| Type Effectiveness  | Full 18-type chart (Gen 1–9)                     |

> The LLM is never involved in damage calculations. All math is handled server-side.

### Turn Order

The faster Pokémon (by base Speed stat) always attacks first each turn.

### Fainting and Switching

When a Pokémon's HP reaches zero it faints, and the next available team member is automatically sent out. A trainer loses when all six of their Pokémon have fainted.

### Status Moves

Status moves deal zero damage. They are valid selections and the narration reflects what happened.

---

## API Reference

### Pokémon

| Method | Endpoint                  | Description                            |
|--------|---------------------------|----------------------------------------|
| GET    | `/pokemon/search?q={query}` | Search Pokémon by name (min 2 chars) |
| GET    | `/pokemon/{name}`         | Fetch Pokémon data (cached after first call) |

### Trainers

| Method | Endpoint                        | Body                              | Description                  |
|--------|---------------------------------|-----------------------------------|------------------------------|
| POST   | `/trainer/create`               | `{ "name": string }`              | Create a new trainer         |
| GET    | `/trainer/all`                  | —                                 | List all trainers             |
| GET    | `/trainer/{id}`                 | —                                 | Get trainer and their team   |
| POST   | `/trainer/{id}/add-pokemon`     | `{ "pokemon_name": string, "moves": string[] }` | Add Pokémon to team (max 6) |

### Battle

| Method | Endpoint                                    | Body                                    | Description                        |
|--------|---------------------------------------------|-----------------------------------------|------------------------------------|
| POST   | `/battle/start/{trainer_x_id}/{trainer_y_id}` | —                                     | Start a new battle                 |
| POST   | `/battle/turn`                              | `{ "battle_id": string, "move_name": string }` | Execute one attack turn     |
| GET    | `/battle/{battle_id}`                       | —                                       | Get current battle state           |
| GET    | `/battle/{battle_id}/active-moves`          | —                                       | Get available moves for this turn  |

---

## Features

- Generations 1–9 Pokémon, base forms only
- Excludes Mega Evolutions, Gigantamax forms, and regional battle-only variants
- Live PokéAPI data with SQLite caching after first fetch
- Full 18-type effectiveness chart
- STAB, critical hits, accuracy checks, and random damage variance
- Automatic faint detection and team switching
- AI-generated narration via Groq Llama 3.3 with deterministic fallback
- Up to 6 Pokémon per trainer, 4 moves per Pokémon
- Retro pixel-art UI with live HP bars, type badges, and team overview

---

## License

This project is released for educational and portfolio use only. It is not licensed for commercial distribution. See the disclaimer at the top of this file regarding third-party intellectual property.
