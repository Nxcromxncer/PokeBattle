import { useState, useEffect, useRef } from 'react';
import { searchPokemon, getPokemon, getAllTrainers, addPokemonToTrainer, removePokemonFromTrainer } from '../api/client';
import type { Pokemon, Trainer, Move } from '../types';

const TYPE_COLORS: Record<string, string> = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC',
};
const TYPE_LIGHT = ['electric','ground','normal','ice','steel','fairy'];

function StatBar({ label, val }: { label: string; val: number }) {
  const pct = Math.min(100, (val / 255) * 100);
  const color = val >= 100 ? '#4caf50' : val >= 60 ? '#ff9800' : '#e3350d';
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-bg"><div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span className="stat-val">{val}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const bg = TYPE_COLORS[type] || '#888';
  const color = TYPE_LIGHT.includes(type) ? '#333' : '#fff';
  return (
    <span className="type-badge" style={{ background: bg, color, fontSize: '0.62rem' }}>{type}</span>
  );
}

export default function TeamBuilder() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [loadingPokemon, setLoadingPokemon] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchTrainers = async () => {
    try {
      const data = await getAllTrainers();
      setTrainers(data.trainers);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchTrainers(); }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    if (val.length < 2) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchPokemon(val);
        setResults(data.results);
      } finally { setSearching(false); }
    }, 400);
  };

  const handleSelectPokemon = async (name: string) => {
    setLoadingPokemon(true);
    setSelectedMoves([]);
    setMessage(null);
    setResults([]);
    setQuery(name);
    try {
      const p = await getPokemon(name);
      setSelectedPokemon(p);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load Pokémon data' });
    } finally { setLoadingPokemon(false); }
  };

  const toggleMove = (moveName: string) => {
    setSelectedMoves(prev =>
      prev.includes(moveName)
        ? prev.filter(m => m !== moveName)
        : prev.length < 4 ? [...prev, moveName] : prev
    );
  };

  const handleAdd = async () => {
    if (!selectedPokemon || !selectedTrainer) return;
    setAdding(true);
    setMessage(null);
    try {
      const moves = selectedMoves.length > 0 ? selectedMoves : selectedPokemon.moves.slice(0, 4).map(m => m.name);
      await addPokemonToTrainer(selectedTrainer, selectedPokemon.name, moves);
      const trainerName = trainers.find(t => t.id === selectedTrainer)?.name;
      setMessage({ type: 'success', text: `${selectedPokemon.name} added to ${trainerName}'s team!` });
      fetchTrainers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to add Pokémon' });
    } finally { setAdding(false); }
  };

  const handleRemovePokemon = async (trainerId: number, pokemonId: number) => {
    setRemovingId(pokemonId);
    setConfirmRemoveId(null);
    try {
      await removePokemonFromTrainer(trainerId, pokemonId);
      fetchTrainers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to remove Pokémon' });
    } finally { setRemovingId(null); }
  };

  const trainer = trainers.find(t => t.id === selectedTrainer);
  const canAdd = selectedPokemon && selectedTrainer && (trainer?.pokemon.length ?? 0) < 6;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--yellow)', marginBottom: '1.5rem', textShadow: '2px 2px 0 var(--yellow-dark)', letterSpacing: '1px' }}>
        🎒 TEAM BUILDER
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Search */}
          <div className="panel">
            <div className="panel-title">SEARCH POKÉMON</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name (e.g. pikachu)..."
              />
              {searching && <span className="spinner" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18 }} />}
            </div>
            {results.length > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--gray-2)', border: '2px solid var(--gray-3)', borderRadius: 'var(--radius)', maxHeight: '200px', overflowY: 'auto' }}>
                {results.map(r => (
                  <div key={r} onClick={() => handleSelectPokemon(r)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize', borderBottom: '1px solid var(--gray-1)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trainer select + team management */}
          <div className="panel">
            <div className="panel-title">SELECT TRAINER</div>
            {trainers.length === 0 ? (
              <div style={{ color: 'var(--gray-4)', fontSize: '0.85rem' }}>No trainers yet. Create one first!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {trainers.map(t => {
                  const full = t.pokemon.length >= 6;
                  const isSelected = selectedTrainer === t.id;
                  return (
                    <div key={t.id} style={{ border: `2px solid ${isSelected ? 'var(--yellow)' : 'var(--gray-3)'}`, borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                      {/* Trainer header */}
                      <div
                        onClick={() => setSelectedTrainer(t.id)}
                        style={{ padding: '0.65rem 0.75rem', background: isSelected ? 'rgba(255,203,5,0.08)' : 'var(--gray-2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>🧑‍💼 {t.name}</div>
                          <div style={{ fontSize: '0.7rem', color: full ? 'var(--red)' : 'var(--gray-4)', marginTop: '0.1rem' }}>
                            {t.pokemon.length}/6 {full ? '— Full!' : 'Pokémon'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gray-4)' }}>{isSelected ? '▲' : '▼'}</span>
                      </div>

                      {/* Team list — always visible when trainer is selected */}
                      {isSelected && (
                        <div style={{ background: 'var(--gray-1)', borderTop: '1px solid var(--gray-2)' }}>
                          {t.pokemon.length === 0 ? (
                            <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: 'var(--gray-4)', fontStyle: 'italic' }}>
                              No Pokémon yet — add one below!
                            </div>
                          ) : (
                            t.pokemon.map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--gray-2)' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize' }}>{p.pokemon_name}</span>

                                {confirmRemoveId === p.id ? (
                                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--red)', fontWeight: 700 }}>Remove?</span>
                                    <button className="btn btn-sm" onClick={() => handleRemovePokemon(t.id, p.id)} disabled={removingId === p.id}
                                      style={{ background: 'var(--red)', color: '#fff', border: '2px solid var(--red-dark)', boxShadow: '0 2px 0 var(--red-dark)', padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                                      Yes
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemoveId(null)}
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemoveId(p.id)} disabled={removingId === p.id}
                                    style={{ color: 'var(--red)', borderColor: 'rgba(227,53,13,0.3)', padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                                    title="Remove from team">
                                    {removingId === p.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✕ Remove'}
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feedback */}
          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          {/* Add button */}
          {selectedPokemon && selectedTrainer && (
            <button className="btn btn-primary btn-lg" onClick={handleAdd} disabled={adding || !canAdd} style={{ width: '100%', justifyContent: 'center' }}>
              {adding
                ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Adding...</>
                : canAdd
                  ? `+ Add ${selectedPokemon.name} to team`
                  : 'Team is full (6/6)'}
            </button>
          )}
        </div>

        {/* ── Right column: Pokémon details ───────────────────── */}
        <div>
          {loadingPokemon && (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <span className="spinner" style={{ width: 40, height: 40 }} />
              <div style={{ marginTop: '1rem', color: 'var(--gray-4)' }}>Loading Pokémon data...</div>
            </div>
          )}

          {!loadingPokemon && !selectedPokemon && (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-4)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.6rem', lineHeight: '2' }}>
                Search for a Pokémon<br />to view its details
              </div>
            </div>
          )}

          {!loadingPokemon && selectedPokemon && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Header card */}
              <div className="panel" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {selectedPokemon.sprite && (
                  <img src={selectedPokemon.sprite} alt={selectedPokemon.name} className="pokemon-sprite-lg" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.75rem', color: 'var(--gray-4)', marginBottom: '0.3rem' }}>
                    #{String(selectedPokemon.id).padStart(4, '0')}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                    {selectedPokemon.name.replace(/-/g, ' ')}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {selectedPokemon.types.map(t => <TypeBadge key={t} type={t} />)}
                  </div>
                  <StatBar label="HP"      val={selectedPokemon.stats.hp} />
                  <StatBar label="Attack"  val={selectedPokemon.stats.attack} />
                  <StatBar label="Defense" val={selectedPokemon.stats.defense} />
                  <StatBar label="Sp. Atk" val={selectedPokemon.stats['special-attack']} />
                  <StatBar label="Sp. Def" val={selectedPokemon.stats['special-defense']} />
                  <StatBar label="Speed"   val={selectedPokemon.stats.speed} />
                </div>
              </div>

              {/* Moves */}
              <div className="panel">
                <div className="panel-title">SELECT MOVES (choose up to 4)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-4)', marginBottom: '0.75rem' }}>
                  Selected: {selectedMoves.length}/4
                  {selectedMoves.length === 0 && ' — first 4 will be auto-selected'}
                  {selectedMoves.length > 0 && ` — ${selectedMoves.join(', ')}`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {selectedPokemon.moves.map((move: Move) => {
                    const isSelected = selectedMoves.includes(move.name);
                    const bg = TYPE_COLORS[move.type] || '#888';
                    const col = TYPE_LIGHT.includes(move.type) ? '#333' : '#fff';
                    return (
                      <div key={move.name} onClick={() => toggleMove(move.name)} style={{
                        background: isSelected ? 'rgba(255,203,5,0.1)' : 'var(--gray-2)',
                        border: `2px solid ${isSelected ? 'var(--yellow)' : 'var(--gray-3)'}`,
                        borderRadius: 'var(--radius)',
                        padding: '0.6rem 0.75rem',
                        cursor: selectedMoves.length >= 4 && !isSelected ? 'not-allowed' : 'pointer',
                        opacity: selectedMoves.length >= 4 && !isSelected ? 0.5 : 1,
                        transition: 'all 0.1s',
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                          {move.name.replace(/-/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: bg, color: col, fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase' }}>{move.type}</span>
                          <span className="tag">{move.damage_class}</span>
                          {move.power > 0 && <span className="tag">⚡ {move.power}</span>}
                          <span className="tag">🎯 {move.accuracy}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
