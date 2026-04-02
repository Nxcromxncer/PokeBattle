import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db
from routers import pokemon, trainer, battle

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify poketypes.db exists before starting
    pokedb = os.getenv("POKEDB_PATH", "poketypes.db")
    if not os.path.exists(pokedb):
        print(f"\n❌  ERROR: '{pokedb}' not found.")
        print("   Copy poketypes.db into the backend/ folder, then restart.\n")
        sys.exit(1)
    init_db()
    print(f"✅  Loaded Pokémon database: {pokedb}")
    yield

app = FastAPI(title="Pokémon Battle Simulator", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pokemon.router, prefix="/pokemon", tags=["Pokemon"])
app.include_router(trainer.router, prefix="/trainer", tags=["Trainer"])
app.include_router(battle.router, prefix="/battle", tags=["Battle"])

@app.get("/")
def root():
    return {"message": "Pokémon Battle Simulator API v2 — DB edition"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
