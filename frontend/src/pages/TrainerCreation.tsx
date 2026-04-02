import { useState, useEffect } from 'react';
import { createTrainer, getAllTrainers, deleteTrainer } from '../api/client';
import type { Trainer } from '../types';

export default function TrainerCreation() {
  const [name, setName] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTrainers = async () => {
    try {
      const data = await getAllTrainers();
      setTrainers(data.trainers);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchTrainers(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await createTrainer(name.trim());
      setSuccess(`Trainer "${name.trim()}" created!`);
      setName('');
      fetchTrainers();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create trainer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async (id: number) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteTrainer(id);
      fetchTrainers();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to delete trainer');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--yellow)', marginBottom: '1.5rem', textShadow: '2px 2px 0 var(--yellow-dark)', letterSpacing: '1px' }}>
        🧑‍💼 TRAINER CREATION
      </h1>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Create Form */}
        <div className="panel">
          <div className="panel-title">NEW TRAINER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Trainer Name
              </label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Enter trainer name..."
                maxLength={30}
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating...</> : '+ Create Trainer'}
            </button>
          </div>

          <div className="mt-3" style={{ borderTop: '2px solid var(--gray-2)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-4)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💡 Tips
            </div>
            <ul style={{ color: 'var(--gray-4)', fontSize: '0.82rem', lineHeight: '1.8', paddingLeft: '1.2rem' }}>
              <li>Create at least <b style={{ color: 'var(--white)' }}>2 trainers</b> to battle</li>
              <li>Each trainer can hold up to <b style={{ color: 'var(--white)' }}>6 Pokémon</b></li>
              <li>Head to <b style={{ color: 'var(--yellow)' }}>Team Builder</b> to add or remove Pokémon</li>
              <li>Battle trainers in the <b style={{ color: 'var(--red)' }}>Battle Arena</b></li>
            </ul>
          </div>
        </div>

        {/* Trainers List */}
        <div className="panel">
          <div className="panel-title">REGISTERED TRAINERS ({trainers.length})</div>
          {trainers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gray-4)', padding: '2rem', fontSize: '0.9rem' }}>
              No trainers yet. Create your first trainer!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trainers.map(t => (
                <div key={t.id} style={{
                  background: 'var(--gray-2)',
                  border: `2px solid ${confirmDeleteId === t.id ? 'var(--red)' : 'var(--gray-3)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '0.85rem 1rem',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1rem' }}>🧑‍💼 {t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-4)', marginTop: '0.15rem' }}>
                        {t.pokemon.length === 0 ? 'No Pokémon yet' : `${t.pokemon.length}/6 Pokémon`}
                      </div>
                    </div>

                    {/* Delete controls */}
                    {confirmDeleteId === t.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--red)', fontWeight: 700 }}>Delete?</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDeleteConfirm(t.id)}
                          disabled={deletingId === t.id}
                          style={{ background: 'var(--red)', borderColor: 'var(--red-dark)', boxShadow: '0 2px 0 var(--red-dark)' }}
                        >
                          Yes
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteClick(t.id)}
                        disabled={deletingId === t.id}
                        style={{ color: 'var(--red)', borderColor: 'rgba(227,53,13,0.3)' }}
                        title="Delete trainer"
                      >
                        {deletingId === t.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🗑 Delete'}
                      </button>
                    )}
                  </div>

                  {/* Pokemon chips */}
                  {t.pokemon.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {t.pokemon.map(p => (
                        <span key={p.id} style={{
                          fontSize: '0.65rem',
                          background: 'var(--gray-1)',
                          border: '1px solid var(--gray-3)',
                          borderRadius: '3px',
                          padding: '0.15rem 0.4rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: 'var(--gray-4)',
                        }}>
                          {p.pokemon_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
