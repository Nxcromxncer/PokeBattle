import sqlite3
import json
from contextlib import contextmanager

DB_PATH = "pokemon_battle.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    finally:
        conn.close()

def init_db():
    with db_cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pokemon_cache (
                name TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS trainers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS trainer_pokemon (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainer_id INTEGER NOT NULL,
                pokemon_name TEXT NOT NULL,
                moves TEXT NOT NULL,
                slot INTEGER NOT NULL,
                FOREIGN KEY (trainer_id) REFERENCES trainers(id)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS battles (
                id TEXT PRIMARY KEY,
                state TEXT NOT NULL
            )
        """)

def cache_pokemon(name: str, data: dict):
    with db_cursor() as cur:
        cur.execute(
            "INSERT OR REPLACE INTO pokemon_cache (name, data) VALUES (?, ?)",
            (name, json.dumps(data))
        )

def get_cached_pokemon(name: str):
    with db_cursor() as cur:
        cur.execute("SELECT data FROM pokemon_cache WHERE name = ?", (name,))
        row = cur.fetchone()
        if row:
            return json.loads(row["data"])
    return None

def create_trainer(name: str):
    with db_cursor() as cur:
        cur.execute("INSERT INTO trainers (name) VALUES (?)", (name,))
        return cur.lastrowid

def get_trainer(trainer_id: int):
    with db_cursor() as cur:
        cur.execute("SELECT * FROM trainers WHERE id = ?", (trainer_id,))
        row = cur.fetchone()
        if not row:
            return None
        trainer = dict(row)
        cur.execute(
            "SELECT * FROM trainer_pokemon WHERE trainer_id = ? ORDER BY slot",
            (trainer_id,)
        )
        pokemon_rows = cur.fetchall()
        trainer["pokemon"] = [
            {**dict(p), "moves": json.loads(p["moves"])}
            for p in pokemon_rows
        ]
        return trainer

def get_all_trainers():
    with db_cursor() as cur:
        cur.execute("SELECT * FROM trainers")
        trainers = [dict(row) for row in cur.fetchall()]
        for t in trainers:
            cur.execute(
                "SELECT * FROM trainer_pokemon WHERE trainer_id = ? ORDER BY slot",
                (t["id"],)
            )
            pokemon_rows = cur.fetchall()
            t["pokemon"] = [
                {**dict(p), "moves": json.loads(p["moves"])}
                for p in pokemon_rows
            ]
        return trainers

def add_pokemon_to_trainer(trainer_id: int, pokemon_name: str, moves: list, slot: int):
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO trainer_pokemon (trainer_id, pokemon_name, moves, slot) VALUES (?, ?, ?, ?)",
            (trainer_id, pokemon_name, json.dumps(moves), slot)
        )
        return cur.lastrowid

def count_trainer_pokemon(trainer_id: int):
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM trainer_pokemon WHERE trainer_id = ?", (trainer_id,))
        row = cur.fetchone()
        return row["cnt"]

def save_battle(battle_id: str, state: dict):
    with db_cursor() as cur:
        cur.execute(
            "INSERT OR REPLACE INTO battles (id, state) VALUES (?, ?)",
            (battle_id, json.dumps(state))
        )

def get_battle(battle_id: str):
    with db_cursor() as cur:
        cur.execute("SELECT state FROM battles WHERE id = ?", (battle_id,))
        row = cur.fetchone()
        if row:
            return json.loads(row["state"])
    return None
