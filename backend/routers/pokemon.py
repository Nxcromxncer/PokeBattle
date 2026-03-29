from fastapi import APIRouter, HTTPException, Query
from pokeapi_service import fetch_pokemon, search_pokemon

router = APIRouter()

@router.get("/search")
def search(q: str = Query(..., min_length=2)):
    results = search_pokemon(q)
    return {"results": results}

@router.get("/{name}")
def get_pokemon(name: str):
    data = fetch_pokemon(name.lower())
    if not data:
        raise HTTPException(status_code=404, detail=f"Pokémon '{name}' not found or not available")
    return data
