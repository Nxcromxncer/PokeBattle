from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from database import init_db
from routers import pokemon, trainer, battle

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Pokémon Battle Simulator", version="1.0.0", lifespan=lifespan)

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
    return {"message": "Pokémon Battle Simulator API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
