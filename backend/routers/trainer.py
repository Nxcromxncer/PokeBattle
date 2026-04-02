from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import database as db
from pokeapi_service import fetch_pokemon

router = APIRouter()

class CreateTrainerRequest(BaseModel):
    name: str

class AddPokemonRequest(BaseModel):
    pokemon_name: str
    moves: List[str]

@router.post("/create")
def create_trainer(req: CreateTrainerRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Trainer name cannot be empty")
    try:
        trainer_id = db.create_trainer(req.name.strip())
        return {"id": trainer_id, "name": req.name.strip(), "message": "Trainer created successfully"}
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=409, detail=f"Trainer '{req.name}' already exists")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all")
def get_all_trainers():
    trainers = db.get_all_trainers()
    return {"trainers": trainers}

@router.get("/{trainer_id}")
def get_trainer(trainer_id: int):
    trainer = db.get_trainer(trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer

@router.delete("/{trainer_id}")
def delete_trainer(trainer_id: int):
    trainer = db.get_trainer(trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    db.delete_trainer(trainer_id)
    return {"message": f"Trainer '{trainer['name']}' deleted"}

@router.post("/{trainer_id}/add-pokemon")
def add_pokemon(trainer_id: int, req: AddPokemonRequest):
    trainer = db.get_trainer(trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    current_count = db.count_trainer_pokemon(trainer_id)
    if current_count >= 6:
        raise HTTPException(status_code=400, detail="Trainer already has 6 Pokémon (maximum team size)")

    pokemon_data = fetch_pokemon(req.pokemon_name.lower())
    if not pokemon_data:
        raise HTTPException(status_code=404, detail=f"Pokémon '{req.pokemon_name}' not found")

    selected_moves = []
    for move_name in req.moves[:4]:
        matching = next((m for m in pokemon_data["moves"] if m["name"] == move_name), None)
        if matching:
            selected_moves.append(matching)

    if not selected_moves:
        selected_moves = pokemon_data["moves"][:4]

    slot = current_count + 1
    db.add_pokemon_to_trainer(trainer_id, req.pokemon_name.lower(), selected_moves, slot)

    return {
        "message": f"{req.pokemon_name} added to {trainer['name']}'s team",
        "slot": slot,
        "moves_assigned": [m["name"] for m in selected_moves],
    }

@router.delete("/{trainer_id}/pokemon/{pokemon_id}")
def remove_pokemon(trainer_id: int, pokemon_id: int):
    trainer = db.get_trainer(trainer_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    # Verify this pokemon belongs to this trainer
    owned = any(p["id"] == pokemon_id for p in trainer["pokemon"])
    if not owned:
        raise HTTPException(status_code=404, detail="Pokémon not found in this trainer's team")
    db.remove_pokemon_from_trainer(trainer_id, pokemon_id)
    return {"message": "Pokémon removed from team"}
