import axios from 'axios';
import type { Pokemon, Trainer, BattleState, TurnResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Pokemon
export const searchPokemon = (q: string) =>
  api.get<{ results: string[] }>(`/pokemon/search?q=${encodeURIComponent(q)}`).then(r => r.data);

export const getPokemon = (name: string) =>
  api.get<Pokemon>(`/pokemon/${name}`).then(r => r.data);

// Trainers
export const createTrainer = (name: string) =>
  api.post<{ id: number; name: string }>('/trainer/create', { name }).then(r => r.data);

export const getAllTrainers = () =>
  api.get<{ trainers: Trainer[] }>('/trainer/all').then(r => r.data);

export const getTrainer = (id: number) =>
  api.get<Trainer>(`/trainer/${id}`).then(r => r.data);

export const deleteTrainer = (id: number) =>
  api.delete(`/trainer/${id}`).then(r => r.data);

export const addPokemonToTrainer = (trainerId: number, pokemonName: string, moves: string[]) =>
  api.post(`/trainer/${trainerId}/add-pokemon`, { pokemon_name: pokemonName, moves }).then(r => r.data);

export const removePokemonFromTrainer = (trainerId: number, pokemonId: number) =>
  api.delete(`/trainer/${trainerId}/pokemon/${pokemonId}`).then(r => r.data);

// Battle
export const startBattle = (trainerXId: number, trainerYId: number) =>
  api.post<{ battle_id: string; state: BattleState; message: string }>(
    `/battle/start/${trainerXId}/${trainerYId}`
  ).then(r => r.data);

export const executeTurn = (battleId: string, moveName: string) =>
  api.post<TurnResult>('/battle/turn', { battle_id: battleId, move_name: moveName }).then(r => r.data);

export const getBattleState = (battleId: string) =>
  api.get<BattleState>(`/battle/${battleId}`).then(r => r.data);

export const getActiveMoves = (battleId: string) =>
  api.get<{ moves: any[]; acting_trainer: string; acting_trainer_name: string; active_pokemon: string }>(
    `/battle/${battleId}/active-moves`
  ).then(r => r.data);
