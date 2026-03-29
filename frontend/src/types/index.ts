export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  'special-attack': number;
  'special-defense': number;
  speed: number;
}

export interface Move {
  name: string;
  power: number;
  accuracy: number;
  type: string;
  damage_class: string;
  effect?: string;
}

export interface Pokemon {
  id: number;
  name: string;
  stats: PokemonStats;
  types: string[];
  moves: Move[];
  sprite?: string;
}

export interface TrainerPokemon {
  id: number;
  trainer_id: number;
  pokemon_name: string;
  moves: Move[];
  slot: number;
}

export interface Trainer {
  id: number;
  name: string;
  pokemon: TrainerPokemon[];
}

export interface BattlePokemon {
  name: string;
  current_hp: number;
  max_hp: number;
  stats: PokemonStats;
  types: string[];
  sprite?: string;
  moves: Move[];
  fainted: boolean;
}

export interface TrainerBattleState {
  id: number;
  name: string;
  team: BattlePokemon[];
  active_index: number;
}

export interface BattleState {
  trainer_x: TrainerBattleState;
  trainer_y: TrainerBattleState;
  turn: number;
  battle_log: BattleEvent[];
  status: 'ongoing' | 'ended';
  winner: string | null;
}

export interface BattleEvent {
  turn: number;
  attacker_trainer: string;
  attacker: string;
  defender_trainer: string;
  defender: string;
  move: string;
  damage: number;
  critical: boolean;
  effectiveness: number;
  effectiveness_label: string;
  missed: boolean;
  fainted: boolean;
  new_active: string | null;
  battle_ended: boolean;
  winner: string | null;
  remaining_hp: number;
  defender_max_hp: number;
}

export interface TurnResult {
  state: BattleState;
  event: BattleEvent;
  narration: string;
  acting_trainer: string;
}
