import requests
from database import cache_pokemon, get_cached_pokemon

POKEAPI_BASE = "https://pokeapi.co/api/v2"

# Generation 1-9 national dex ranges
VALID_GEN_RANGES = [
    (1, 151),    # Gen 1
    (152, 251),  # Gen 2
    (252, 386),  # Gen 3
    (387, 493),  # Gen 4
    (494, 649),  # Gen 5
    (650, 721),  # Gen 6
    (722, 809),  # Gen 7
    (810, 898),  # Gen 8
    (899, 1010), # Gen 9
]

# Excluded form keywords
EXCLUDED_KEYWORDS = [
    "mega", "gmax", "gigantamax", "alola", "galar", "hisui",
    "totem", "ash-", "battle-bond", "power-construct",
    "school", "eternal", "starter", "zen", "dusk", "midnight",
    "original", "confined", "complete", "10", "50",
    "pirouette", "resolute"
]

def is_valid_pokemon(name: str, pokemon_id: int) -> bool:
    name_lower = name.lower()
    for keyword in EXCLUDED_KEYWORDS:
        if keyword in name_lower:
            return False
    for start, end in VALID_GEN_RANGES:
        if start <= pokemon_id <= end:
            return True
    return False

def fetch_pokemon(name: str) -> dict:
    cached = get_cached_pokemon(name.lower())
    if cached:
        return cached

    url = f"{POKEAPI_BASE}/pokemon/{name.lower()}"
    resp = requests.get(url, timeout=10)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    raw = resp.json()

    pokemon_id = raw["id"]
    pokemon_name = raw["name"]

    if not is_valid_pokemon(pokemon_name, pokemon_id):
        return None

    stats = {}
    for s in raw["stats"]:
        stat_name = s["stat"]["name"]
        stats[stat_name] = s["base_stat"]

    types = [t["type"]["name"] for t in raw["types"]]

    # Fetch moves: filter to only level-up or TM moves with power
    all_moves = []
    for move_entry in raw["moves"]:
        for vgd in move_entry["version_group_details"]:
            if vgd["move_learn_method"]["name"] in ("level-up", "machine", "tutor"):
                move_name = move_entry["move"]["name"]
                if move_name not in [m["name"] for m in all_moves]:
                    all_moves.append({
                        "name": move_name,
                        "url": move_entry["move"]["url"]
                    })
                break

    # Fetch move details for first 20 candidates to find usable moves
    usable_moves = []
    checked = 0
    for m in all_moves:
        if checked >= 30 or len(usable_moves) >= 12:
            break
        try:
            move_data = fetch_move_details(m["name"])
            if move_data:
                usable_moves.append(move_data)
        except Exception:
            pass
        checked += 1

    sprites = raw.get("sprites", {})
    sprite_url = (
        sprites.get("other", {}).get("official-artwork", {}).get("front_default")
        or sprites.get("front_default")
    )

    pokemon_data = {
        "id": pokemon_id,
        "name": pokemon_name,
        "stats": stats,
        "types": types,
        "moves": usable_moves[:12],
        "sprite": sprite_url,
    }

    cache_pokemon(pokemon_name, pokemon_data)
    return pokemon_data

def fetch_move_details(move_name: str) -> dict:
    url = f"{POKEAPI_BASE}/move/{move_name}"
    resp = requests.get(url, timeout=10)
    if resp.status_code != 200:
        return None
    raw = resp.json()

    # Only include moves with power (damaging) or status moves with effect
    power = raw.get("power")
    accuracy = raw.get("accuracy")
    damage_class = raw.get("damage_class", {}).get("name", "")
    move_type = raw.get("type", {}).get("name", "normal")

    # Include status moves and moves with power >= 30
    if damage_class == "status":
        effect_entries = raw.get("effect_entries", [])
        effect = effect_entries[0]["effect"] if effect_entries else "Status move"
        return {
            "name": move_name,
            "power": 0,
            "accuracy": accuracy or 100,
            "type": move_type,
            "damage_class": "status",
            "effect": effect[:100],
        }
    elif power and power >= 30:
        return {
            "name": move_name,
            "power": power,
            "accuracy": accuracy or 100,
            "type": move_type,
            "damage_class": damage_class,
            "effect": "",
        }
    return None

def search_pokemon(query: str) -> list:
    """Search pokemon by name prefix"""
    url = f"{POKEAPI_BASE}/pokemon?limit=2000"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        all_pokemon = resp.json()["results"]
        query_lower = query.lower()
        matches = [
            p["name"] for p in all_pokemon
            if query_lower in p["name"]
            and not any(kw in p["name"] for kw in EXCLUDED_KEYWORDS)
        ]
        return matches[:20]
    except Exception:
        return []
