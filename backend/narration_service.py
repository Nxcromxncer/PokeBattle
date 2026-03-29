import os
import requests
import json

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are an official Pokémon anime battle narrator.

STYLE:
- Write like a real Pokémon anime or Pokémon Stadium commentator.
- Energetic, cinematic, and emotionally engaging.
- Present tense narration.
- Focus on action, impact, and reactions.
- Mention Pokémon names naturally.
- Occasionally reference trainer tension or momentum.
- Feel like a live arena broadcast or anime episode.

RULES:
- 2–3 sentences ONLY.
- Short, punchy, vivid lines.
- DO NOT calculate damage or invent mechanics.
- Use ONLY facts from the event data.
- Never output JSON, explanations, or formatting.
- Narration text only.

TONE GUIDELINES:
- Critical hits feel explosive or shocking.
- Super effective hits feel powerful and decisive.
- Misses feel tense or narrowly avoided.
- Fainting feels dramatic but heroic.
- Battle endings feel triumphant and final.

AVOID:
- Technical/statistical language.
- Repeating numeric values excessively.
- Overly long descriptions.

Your goal:
Make the battle feel like a real Pokémon anime moment.
"""

def generate_narration(event: dict) -> str:
    if not GROQ_API_KEY:
        return _fallback_narration(event)

    prompt = f"""
Create anime-style battle narration for this Pokémon battle moment.

Battle Event Data:
{json.dumps(event, indent=2)}

Narration Requirements:
- Describe the action visually.
- Emphasize motion, impact, and emotion.
- React to effectiveness and critical hits naturally.
- If a Pokémon faints, make it dramatic but concise.
- If a new Pokémon appears, introduce it like an anime entrance.
- If the battle ends, deliver a decisive closing line.

Key Facts:
Attacker: {event['attacker']} (Trainer: {event['attacker_trainer']})
Move: {event['move']}
Defender: {event['defender']} (Trainer: {event['defender_trainer']})
Damage: {event['damage']}
Critical Hit: {event['critical']}
Effectiveness: {event['effectiveness_label']}
Missed: {event['missed']}
Fainted: {event.get('fainted', False)}
Remaining HP: {event.get('remaining_hp', '?')}/{event.get('defender_max_hp', '?')}
{f"Winner: {event['winner']}" if event.get('battle_ended') else ""}
{f"Next Pokémon: {event['new_active']}" if event.get('new_active') else ""}

Output ONLY the narration text.
"""

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
