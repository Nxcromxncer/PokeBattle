import random
import math
from typing import Dict, Any, Optional, List, Tuple

TYPE_CHART = {
    "normal":   {"rock": 0.5, "ghost": 0, "steel": 0.5},
    "fire":     {"fire": 0.5, "water": 0.5, "grass": 2, "ice": 2, "bug": 2, "rock": 0.5, "dragon": 0.5, "steel": 2},
    "water":    {"fire": 2, "water": 0.5, "grass": 0.5, "ground": 2, "rock": 2, "dragon": 0.5},
    "electric": {"water": 2, "electric": 0.5, "grass": 0.5, "ground": 0, "flying": 2, "dragon": 0.5},
    "grass":    {"fire": 0.5, "water": 2, "grass": 0.5, "poison": 0.5, "ground": 2, "flying": 0.5, "bug": 0.5, "rock": 2, "dragon": 0.5, "steel": 0.5},
    "ice":      {"water": 0.5, "grass": 2, "ice": 0.5, "ground": 2, "flying": 2, "dragon": 2, "steel": 0.5},
    "fighting": {"normal": 2, "ice": 2, "poison": 0.5, "flying": 0.5, "psychic": 0.5, "bug": 0.5, "rock": 2, "ghost": 0, "dark": 2, "steel": 2, "fairy": 0.5},
    "poison":   {"grass": 2, "poison": 0.5, "ground": 0.5, "rock": 0.5, "ghost": 0.5, "steel": 0, "fairy": 2},
    "ground":   {"fire": 2, "electric": 2, "grass": 0.5, "poison": 2, "flying": 0, "bug": 0.5, "rock": 2, "steel": 2},
    "flying":   {"electric": 0.5, "grass": 2, "fighting": 2, "bug": 2, "rock": 0.5, "steel": 0.5},
    "psychic":  {"fighting": 2, "poison": 2, "psychic": 0.5, "dark": 0, "steel": 0.5},
    "bug":      {"fire": 0.5, "grass": 2, "fighting": 0.5, "flying": 0.5, "psychic": 2, "ghost": 0.5, "dark": 2, "steel": 0.5, "fairy": 0.5},
    "rock":     {"fire": 2, "ice": 2, "fighting": 0.5, "ground": 0.5, "flying": 2, "bug": 2, "steel": 0.5},
    "ghost":    {"normal": 0, "psychic": 2, "ghost": 2, "dark": 0.5},
    "dragon":   {"dragon": 2, "steel": 0.5, "fairy": 0},
    "dark":     {"fighting": 0.5, "psychic": 2, "ghost": 2, "dark": 0.5, "fairy": 0.5},
    "steel":    {"fire": 0.5, "water": 0.5, "electric": 0.5, "ice": 2, "rock": 2, "steel": 0.5, "fairy": 2},
    "fairy":    {"fire": 0.5, "fighting": 2, "poison": 0.5, "dragon": 2, "dark": 2, "steel": 0.5},
}

def get_type_effectiveness(move_type: str, defender_types: list) -> float:
    effectiveness = 1.0
    move_chart = TYPE_CHART.get(move_type, {})
    for def_type in defender_types:
        effectiveness *= move_chart.get(def_type, 1.0)
    return effectiveness

def calculate_damage(attacker: Dict, defender: Dict, move: Dict, seed: Optional[int] = None) -> Dict:
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random

    if move["damage_class"] == "status":
        return {
            "damage": 0,
            "critical": False,
            "effectiveness": 1.0,
            "effectiveness_label": "normal",
            "missed": False,
        }

    # Accuracy check
    accuracy = move.get("accuracy", 100) or 100
    if rng.randint(1, 100) > accuracy:
        return {
            "damage": 0,
            "critical": False,
            "effectiveness": 1.0,
            "effectiveness_label": "normal",
            "missed": True,
        }

    power = move.get("power", 40) or 40
    damage_class = move.get("damage_class", "physical")

    if damage_class == "physical":
        atk = attacker["stats"].get("attack", 50)
        def_ = defender["stats"].get("defense", 50)
    else:
        atk = attacker["stats"].get("special-attack", 50)
        def_ = defender["stats"].get("special-defense", 50)

    # Critical hit: 1/16 chance (6.25%)
    critical = rng.randint(1, 16) == 1
    crit_modifier = 1.5 if critical else 1.0

    # Type effectiveness
    move_type = move.get("type", "normal")
    defender_types = defender.get("types", ["normal"])
    effectiveness = get_type_effectiveness(move_type, defender_types)

    # STAB (Same Type Attack Bonus)
    attacker_types = attacker.get("types", [])
    stab = 1.5 if move_type in attacker_types else 1.0

    # Random modifier [0.85, 1.00]
    random_mod = rng.uniform(0.85, 1.0)

    # Gen 5+ damage formula
    level = 50  # fixed level for all battles
    base_damage = (((2 * level / 5 + 2) * power * atk / def_) / 50 + 2)
    damage = base_damage * crit_modifier * effectiveness * stab * random_mod
    damage = max(1, int(damage))

    if effectiveness >= 2.0:
        eff_label = "super effective"
    elif effectiveness <= 0.5 and effectiveness > 0:
        eff_label = "not very effective"
    elif effectiveness == 0:
        eff_label = "no effect"
        damage = 0
    else:
        eff_label = "normal"

    return {
        "damage": damage,
        "critical": critical,
        "effectiveness": effectiveness,
        "effectiveness_label": eff_label,
        "missed": False,
    }

def build_battle_state(trainer_x: Dict, trainer_y: Dict, pokemon_cache: Dict) -> Dict:
    def build_team(trainer: Dict) -> List:
        team = []
        for tp in trainer["pokemon"]:
            pname = tp["pokemon_name"]
            pdata = pokemon_cache.get(pname, {})
            max_hp = pdata.get("stats", {}).get("hp", 100)
            team.append({
                "trainer_pokemon_id": tp["id"],
                "name": pname,
                "current_hp": max_hp,
                "max_hp": max_hp,
                "stats": pdata.get("stats", {}),
                "types": pdata.get("types", []),
                "sprite": pdata.get("sprite"),
                "moves": tp["moves"],
                "fainted": False,
            })
        return team

    team_x = build_team(trainer_x)
    team_y = build_team(trainer_y)

    # Speed decides who goes first; then turns alternate strictly
    spd_x = team_x[0]["stats"].get("speed", 50) if team_x else 0
    spd_y = team_y[0]["stats"].get("speed", 50) if team_y else 0
    first_acting = "trainer_x" if spd_x >= spd_y else "trainer_y"

    state = {
        "trainer_x": {
            "id": trainer_x["id"],
            "name": trainer_x["name"],
            "team": team_x,
            "active_index": 0,
        },
        "trainer_y": {
            "id": trainer_y["id"],
            "name": trainer_y["name"],
            "team": team_y,
            "active_index": 0,
        },
        "turn": 1,
        "acting_trainer": first_acting,
        "battle_log": [],
        "status": "ongoing",
        "winner": None,
    }
    return state

def get_active_pokemon(trainer_state: Dict) -> Optional[Dict]:
    idx = trainer_state["active_index"]
    team = trainer_state["team"]
    if 0 <= idx < len(team) and not team[idx]["fainted"]:
        return team[idx]
    return None

def advance_to_next_pokemon(trainer_state: Dict) -> Optional[Dict]:
    for i, p in enumerate(trainer_state["team"]):
        if not p["fainted"]:
            trainer_state["active_index"] = i
            return p
    return None

def is_team_wiped(trainer_state: Dict) -> bool:
    return all(p["fainted"] for p in trainer_state["team"])

def execute_turn(state: Dict, acting_trainer_key: str, move_name: str, turn_seed: int) -> Tuple[Dict, Optional[Dict]]:
    """Execute one attack turn. Returns updated state + event info."""
    if state["status"] != "ongoing":
        return state, None

    attacker_state = state[acting_trainer_key]
    defender_key = "trainer_y" if acting_trainer_key == "trainer_x" else "trainer_x"
    defender_state = state[defender_key]

    attacker_pokemon = get_active_pokemon(attacker_state)
    defender_pokemon = get_active_pokemon(defender_state)

    if not attacker_pokemon or not defender_pokemon:
        return state, None

    # Find move
    move = next((m for m in attacker_pokemon["moves"] if m["name"] == move_name), None)
    if not move:
        move = attacker_pokemon["moves"][0]

    result = calculate_damage(attacker_pokemon, defender_pokemon, move, seed=turn_seed)

    event = {
        "turn": state["turn"],
        "attacker_trainer": attacker_state["name"],
        "attacker": attacker_pokemon["name"],
        "defender_trainer": defender_state["name"],
        "defender": defender_pokemon["name"],
        "move": move_name,
        "damage": result["damage"],
        "critical": result["critical"],
        "effectiveness": result["effectiveness"],
        "effectiveness_label": result["effectiveness_label"],
        "missed": result["missed"],
        "fainted": False,
        "new_active": None,
        "battle_ended": False,
        "winner": None,
    }

    if not result["missed"]:
        # Find the defender in the team and reduce HP
        def_idx = defender_state["active_index"]
        defender_state["team"][def_idx]["current_hp"] = max(
            0, defender_state["team"][def_idx]["current_hp"] - result["damage"]
        )
        event["remaining_hp"] = defender_state["team"][def_idx]["current_hp"]
        event["defender_max_hp"] = defender_state["team"][def_idx]["max_hp"]

        if defender_state["team"][def_idx]["current_hp"] == 0:
            defender_state["team"][def_idx]["fainted"] = True
            event["fainted"] = True

            if is_team_wiped(defender_state):
                state["status"] = "ended"
                state["winner"] = attacker_state["name"]
                event["battle_ended"] = True
                event["winner"] = attacker_state["name"]
            else:
                new_pokemon = advance_to_next_pokemon(defender_state)
                event["new_active"] = new_pokemon["name"] if new_pokemon else None
    else:
        event["remaining_hp"] = defender_pokemon["current_hp"]
        event["defender_max_hp"] = defender_pokemon["max_hp"]

    state["turn"] += 1
    state["battle_log"].append(event)

    # Alternate acting trainer for next turn
    state["acting_trainer"] = "trainer_y" if acting_trainer_key == "trainer_x" else "trainer_x"

    return state, event

def determine_turn_order(state: Dict) -> str:
    """Return which trainer acts this turn — strict alternating, speed decides first mover."""
    return state.get("acting_trainer", "trainer_x")
