import { useState, useEffect, useRef } from 'react';
import { searchPokemon, getPokemon, getAllTrainers, addPokemonToTrainer } from '../api/client';
import type { Pokemon, Trainer, Move } from '../types';

const TYPE_COLORS: Record<string, string> = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC',
};

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getAllTrainers().then(d => setTrainers(d.trainers)).catch(() => {});
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    if (val.length < 2) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchPokemon(val);
        setResults(data.results);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectPokemon = async (name: string) => {
    setLoadingPokemon(true);
    setSelectedMoves([]);
    setMessage(null);
    try {
      const p = await getPokemon(name);
      setSelectedPokemon(p);
      setResults([]);
      setQuery(name);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load Pokémon data' });
    } finally {
      setLoadingPokemon(false);
    }
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
      const data = await getAllTrainers();
      setTrainers(data.trainers);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to add Pokémon' });
    } finally {
      setAdding(false);
    }
  };

  const trainer = trainers.find(t => t.id === selectedTrainer);
  const canAdd = selectedPokemon && selectedTrainer && (trainer?.pokemon.length ?? 0) < 6;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--yellow)', marginBottom: '1.5rem', textShadow: '2px 2px 0 var(--yellow-dark)', letterSpacing: '1px' }}>
        🎒 TEAM BUILDER
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Search + Trainer Select */}
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
              {searching && (
                <span className="spinner" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18 }} />
              )}
            </div>
            {results.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                background: 'var(--gray-2)',
                border: '2px solid var(--gray-3)',
                borderRadius: 'var(--radius)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {results.map(r => (
                  <div
                    key={r}
                    onClick={() => handleSelectPokemon(r)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      borderBottom: '1px solid var(--gray-1)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trainer select */}
          <div className="panel">
            <div className="panel-title">SELECT TRAINER</div>
            {trainers.length === 0 ? (
              <div style={{ color: 'var(--gray-4)', fontSize: '0.85rem' }}>No trainers yet. Create one first!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {trainers.map(t => {
                  const full = t.pokemon.length >= 6;
                  return (
                    <div
                      key={t.id}
                      onClick={() => !full && setSelectedTrainer(t.id)}
                      style={{
                        padding: '0.75rem',
                        background: selectedTrainer === t.id ? 'rgba(255,203,5,0.1)' : 'var(--gray-2)',
                        border: `2px solid ${selectedTrainer === t.id ? 'var(--yellow)' : 'var(--gray-3)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: full ? 'not-allowed' : 'pointer',
                        opacity: full ? 0.6 : 1,
                        transition: 'all 0.1s',
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>🧑‍💼 {t.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-4)', marginTop: '0.2rem' }}>
                        {t.pokemon.length}/6 Pokémon {full && '— Team Full!'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {t.pokemon.map(p => (
                          <span key={p.id} style={{ fontSize: '0.65rem', background: 'var(--gray-1)', border: '1px solid var(--gray-3)', borderRadius: '3px', padding: '0.1rem 0.35rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--gray-4)' }}>
                            {p.pokemon_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          {selectedPokemon && selectedTrainer && (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleAdd}
              disabled={adding || !canAdd}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {adding
                ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Adding...</>
                : canAdd
                  ? `+ Add ${selectedPokemon.name} to team`
                  : 'Team is full (6/6)'}
            </button>
          )}
        </div>

        {/* Right: Pokemon Details */}
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
              {/* Header Card */}
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
                    {selectedPokemon.types.map(t => (
                      <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] || '#888', color: ['electric','ground','normal','ice','steel','fairy'].includes(t) ? '#333' : '#fff' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div>
                    <StatBar label="HP" val={selectedPokemon.stats.hp} />
                    <StatBar label="Attack" val={selectedPokemon.stats.attack} />
                    <StatBar label="Defense" val={selectedPokemon.stats.defense} />
                    <StatBar label="Sp. Atk" val={selectedPokemon.stats['special-attack']} />
                    <StatBar label="Sp. Def" val={selectedPokemon.stats['special-defense']} />
                    <StatBar label="Speed" val={selectedPokemon.stats.speed} />
                  </div>
                </div>
              </div>

              {/* Moves */}
              <div className="panel">
                <div className="panel-title">SELECT MOVES (choose up to 4)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-4)', marginBottom: '0.75rem' }}>
                  Selected: {selectedMoves.length}/4 — {selectedMoves.length === 0 ? 'First 4 will be auto-selected' : selectedMoves.join(', ')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {selectedPokemon.moves.map((move: Move) => {
                    const isSelected = selectedMoves.includes(move.name);
                    const typeColor = TYPE_COLORS[move.type] || '#888';
                    return (
                      <div
                        key={move.name}
                        onClick={() => toggleMove(move.name)}
                        style={{
                          background: isSelected ? 'rgba(255,203,5,0.1)' : 'var(--gray-2)',
                          border: `2px solid ${isSelected ? 'var(--yellow)' : 'var(--gray-3)'}`,
                          borderRadius: 'var(--radius)',
                          padding: '0.6rem 0.75rem',
                          cursor: selectedMoves.length >= 4 && !isSelected ? 'not-allowed' : 'pointer',
                          opacity: selectedMoves.length >= 4 && !isSelected ? 0.5 : 1,
                          transition: 'all 0.1s',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                          {move.name.replace(/-/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ background: typeColor, color: ['electric','ground','normal','ice','steel','fairy'].includes(move.type) ? '#333' : '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                            {move.type}
                          </span>
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
