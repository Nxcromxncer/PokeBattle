import os
import requests
import json

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an epic Pokémon battle narrator. Your job is to generate SHORT, DRAMATIC, 
exciting narration for battle events. Keep it to 2-3 sentences maximum. 
Be vivid, energetic, and capture the excitement of Pokémon battles.
Never calculate damage yourself — only narrate what happened based on the JSON event data provided."""

def generate_narration(event: dict) -> str:
    if not GROQ_API_KEY:
        return _fallback_narration(event)

    prompt = f"""Narrate this Pokémon battle event dramatically in 2-3 sentences:
{json.dumps(event, indent=2)}

Key facts to narrate:
- Attacker: {event['attacker']} (trainer: {event['attacker_trainer']})
- Move used: {event['move']}
- Target: {event['defender']} (trainer: {event['defender_trainer']})
- Damage dealt: {event['damage']}
- Critical hit: {event['critical']}
- Type effectiveness: {event['effectiveness_label']}
- Missed: {event['missed']}
- Target fainted: {event.get('fainted', False)}
- Remaining HP: {event.get('remaining_hp', '?')}/{event.get('defender_max_hp', '?')}
{f"- Battle winner: {event['winner']}" if event.get('battle_ended') else ''}
{f"- Next Pokémon sent out: {event['new_active']}" if event.get('new_active') else ''}

Generate ONLY the narration text, nothing else."""

    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 200,
            "temperature": 0.8,
        }
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Groq API error: {e}")
        return _fallback_narration(event)

def _fallback_narration(event: dict) -> str:
    attacker = event["attacker"].replace("-", " ").title()
    defender = event["defender"].replace("-", " ").title()
    move = event["move"].replace("-", " ").title()

    if event.get("missed"):
        return f"{attacker} used {move}, but it missed! {defender} dodged narrowly, living to fight another day."

    parts = [f"{attacker} used {move}!"]

    if event.get("critical"):
        parts.append("A critical hit!")

    eff = event.get("effectiveness_label", "normal")
    if eff == "super effective":
        parts.append(f"It's super effective! {defender} took {event['damage']} damage!")
    elif eff == "not very effective":
        parts.append(f"It's not very effective... {defender} only took {event['damage']} damage.")
    elif eff == "no effect":
        parts.append(f"It had no effect on {defender}!")
    else:
        parts.append(f"{defender} took {event['damage']} damage!")

    if event.get("fainted"):
        parts.append(f"{defender} fainted!")
        if event.get("new_active"):
            new = event["new_active"].replace("-", " ").title()
            trainer = event["defender_trainer"]
            parts.append(f"{trainer} sends out {new}!")
    if event.get("battle_ended"):
        winner = event.get("winner", "")
        parts.append(f"{winner} wins the battle!")

    return " ".join(parts)
