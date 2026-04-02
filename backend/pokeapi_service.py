"""
Pokemon service — reads entirely from local poketypes.db.
No HTTP calls to PokéAPI at runtime.
Sprites are served from the PokeAPI GitHub sprites CDN.
"""
from database import poke_cursor

# Base sprite URL from https://github.com/PokeAPI/sprites
SPRITE_BASE = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"
)
SPRITE_FALLBACK = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"
)

# Gen 1–9 national dex ranges (base forms only, no mega/gmax)
VALID_GEN_RANGES = [
    (1,   151),   # Gen 1
    (152, 251),   # Gen 2
    (252, 386),   # Gen 3
    (387, 493),   # Gen 4
    (494, 649),   # Gen 5
    (650, 721),   # Gen 6
    (722, 809),   # Gen 7
    (810, 898),   # Gen 8
    (899, 1010),  # Gen 9
]

# Type ID → name mapping (matches poketypes.db types table)
TYPE_ID_TO_NAME = {
    1: "normal", 2: "fire", 3: "fighting", 4: "water", 5: "flying",
    6: "grass", 7: "poison", 8: "electric", 9: "ground", 10: "psychic",
    11: "rock", 12: "ice", 13: "bug", 14: "dragon", 15: "ghost",
    16: "dark", 17: "steel", 18: "fairy",
}


def _sprite_url(pokemon_id: int) -> str:
    return f"{SPRITE_BASE}/{pokemon_id}.png"


def _is_valid_id(pokemon_id: int) -> bool:
    for start, end in VALID_GEN_RANGES:
        if start <= pokemon_id <= end:
            return True
    return False


def _type_name(type_id) -> str:
    if type_id is None:
        return None
    try:
        return TYPE_ID_TO_NAME.get(int(type_id), "normal")
    except (ValueError, TypeError):
        return "normal"


def fetch_pokemon(name: str) -> dict | None:
    name_clean = name.strip().lower()
    with poke_cursor() as cur:
        # Lookup pokemon row (case-insensitive)
        cur.execute(
            "SELECT _id, name, real_id, type_a, type_b FROM pokemon WHERE LOWER(name) = ?",
            (name_clean,)
        )
        row = cur.fetchone()
        if not row:
            return None

        poke_id = row["_id"]
        real_id = row["real_id"] or poke_id

        if not _is_valid_id(real_id):
            return None

        # Base stats — prefer basestats_sumo which covers gens 1–9
        cur.execute(
            "SELECT hp, atk, def, spatk, spdef, speed FROM basestats_sumo WHERE poke_id = ?",
            (poke_id,)
        )
        stats_row = cur.fetchone()
        if not stats_row:
            # Fallback to basestats
            cur.execute(
                "SELECT hp, atk, def, spatk, spdef, speed FROM basestats WHERE poke_id = ?",
                (poke_id,)
            )
            stats_row = cur.fetchone()

        if not stats_row:
            return None

        stats = {
            "hp":              stats_row["hp"],
            "attack":          stats_row["atk"],
            "defense":         stats_row["def"],
            "special-attack":  stats_row["spatk"],
            "special-defense": stats_row["spdef"],
            "speed":           stats_row["speed"],
        }

        # Types
        types = [t for t in [_type_name(row["type_a"]), _type_name(row["type_b"])] if t]

        # Moves: learnset_sumo + machines_sumo, damaging preferred, limit 12
        cur.execute("""
            SELECT DISTINCT m._id, m.move, m.type, m.category, m.power, m.accuracy
            FROM (
                SELECT moveid FROM learnset_sumo WHERE poke_id = ?
                UNION
                SELECT moveid FROM machines_sumo WHERE poke_id = ?
            ) lm
            JOIN moves m ON m._id = lm.moveid
            WHERE m.category IN ('Physical','Special','Status')
              AND (m.power >= 30 OR m.category = 'Status')
              AND m.accuracy > 0
            ORDER BY
              CASE m.category WHEN 'Physical' THEN 0 WHEN 'Special' THEN 1 ELSE 2 END,
              m.power DESC
            LIMIT 12
        """, (poke_id, poke_id))
        move_rows = cur.fetchall()

        moves = []
        for mr in move_rows:
            moves.append({
                "name":         mr["move"],
                "power":        mr["power"] or 0,
                "accuracy":     mr["accuracy"] or 100,
                "type":         _type_name(mr["type"]),
                "damage_class": mr["category"].lower() if mr["category"] else "physical",
                "effect":       "",
            })

        return {
            "id":     real_id,
            "name":   row["name"],
            "stats":  stats,
            "types":  types,
            "moves":  moves,
            "sprite": _sprite_url(real_id),
        }


def search_pokemon(query: str) -> list[str]:
    """Search base-form Pokémon by name prefix/substring, gens 1–9 only."""
    q = f"%{query.strip().lower()}%"
    with poke_cursor() as cur:
        cur.execute("""
            SELECT name, real_id FROM pokemon
            WHERE LOWER(name) LIKE ?
              AND real_id BETWEEN 1 AND 1010
              AND _id = real_id
            ORDER BY real_id
            LIMIT 20
        """, (q,))
        return [row["name"] for row in cur.fetchall()]
