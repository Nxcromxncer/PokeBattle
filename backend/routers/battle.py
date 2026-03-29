from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import time

import database as db
from pokeapi_service import fetch_pokemon
from battle_engine import (
    build_battle_state, execute_turn, determine_turn_order,
    get_active_pokemon, is_team_wiped
)
from narration_service import generate_narration

router = APIRouter()

class StartBattleResponse(BaseModel):
    battle_id: str
    state: dict

class TurnRequest(BaseModel):
    battle_id: str
    move_name: str

@router.post("/start/{trainer_x_id}/{trainer_y_id}")
def start_battle(trainer_x_id: int, trainer_y_id: int):
    if trainer_x_id == trainer_y_id:
        raise HTTPException(status_code=400, detail="A trainer cannot battle themselves")

    trainer_x = db.get_trainer(trainer_x_id)
    trainer_y = db.get_trainer(trainer_y_id)

    if not trainer_x:
        raise HTTPException(status_code=404, detail=f"Trainer {trainer_x_id} not found")
    if not trainer_y:
        raise HTTPException(status_code=404, detail=f"Trainer {trainer_y_id} not found")

    if not trainer_x["pokemon"]:
        raise HTTPException(status_code=400, detail=f"{trainer_x['name']} has no Pokémon")
    if not trainer_y["pokemon"]:
        raise HTTPException(status_code=400, detail=f"{trainer_y['name']} has no Pokémon")

    # Fetch all pokemon data for both teams
    pokemon_cache = {}
    for tp in trainer_x["pokemon"] + trainer_y["pokemon"]:
        pname = tp["pokemon_name"]
        if pname not in pokemon_cache:
            data = fetch_pokemon(pname)
            if data:
                pokemon_cache[pname] = data

    state = build_battle_state(trainer_x, trainer_y, pokemon_cache)

    battle_id = str(uuid.uuid4())
    db.save_battle(battle_id, state)

    return {
        "battle_id": battle_id,
        "state": state,
        "message": f"Battle started: {trainer_x['name']} vs {trainer_y['name']}!"
    }

@router.post("/turn")
def execute_battle_turn(req: TurnRequest):
    state = db.get_battle(req.battle_id)
    if not state:
        raise HTTPException(status_code=404, detail="Battle not found")

    if state["status"] != "ongoing":
        raise HTTPException(status_code=400, detail="Battle has already ended")

    # Determine which trainer attacks this turn
    acting_trainer_key = determine_turn_order(state)

    # Use timestamp as seed for deterministic randomness per turn
    turn_seed = int(time.time() * 1000) % (2**31)

    updated_state, event = execute_turn(state, acting_trainer_key, req.move_name, turn_seed)

    if event is None:
        raise HTTPException(status_code=400, detail="Could not execute turn")

    # Generate LLM narration
    narration = generate_narration(event)

    db.save_battle(req.battle_id, updated_state)

    # Next acting trainer is already stored in state by execute_turn
    next_acting = updated_state.get("acting_trainer", acting_trainer_key)

    return {
        "state": updated_state,
        "event": event,
        "narration": narration,
        "acting_trainer": next_acting,
    }

@router.get("/{battle_id}")
def get_battle_state(battle_id: str):
    state = db.get_battle(battle_id)
    if not state:
        raise HTTPException(status_code=404, detail="Battle not found")
    return state

@router.get("/{battle_id}/active-moves")
def get_active_moves(battle_id: str):
    """Get available moves for the currently acting trainer's active pokemon"""
    state = db.get_battle(battle_id)
    if not state:
        raise HTTPException(status_code=404, detail="Battle not found")

    if state["status"] != "ongoing":
        return {"moves": [], "acting_trainer": None, "status": state["status"]}

    acting_key = determine_turn_order(state)
    active_poke = get_active_pokemon(state[acting_key])

    if not active_poke:
        return {"moves": [], "acting_trainer": acting_key}

    return {
        "moves": active_poke["moves"],
        "acting_trainer": acting_key,
        "acting_trainer_name": state[acting_key]["name"],
        "active_pokemon": active_poke["name"],
    }
