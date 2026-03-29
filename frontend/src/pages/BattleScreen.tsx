import { useState, useEffect, useRef } from "react";
import { getAllTrainers, startBattle, executeTurn } from "../api/client";
import type { Trainer, BattleState, BattleEvent, Move } from "../types";

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color =
    pct > 50 ? "var(--hp-high)" : pct > 20 ? "var(--hp-mid)" : "var(--hp-low)";
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        <span style={{ color: "var(--gray-4)" }}>HP</span>
        <span style={{ color }}>
          {current}/{max}
        </span>
      </div>
      <div className="hp-bar-wrap">
        <div
          className="hp-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function PokemonPanel({
  trainerState,
  isActive,
  side,
}: {
  trainerState: any;
  isActive: boolean;
  side: "left" | "right";
}) {
  const active = trainerState.team[trainerState.active_index];
  if (!active) return null;
  return (
    <div
      style={{
        background: isActive
          ? "rgba(255,203,5,0.08)"
          : "rgba(255,255,255,0.04)",
        border: `2px solid ${isActive ? "var(--yellow)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "var(--radius)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.6rem",
        minWidth: "170px",
        transition: "all 0.3s",
      }}
    >
      {isActive && (
        <div
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.45rem",
            color: "var(--yellow)",
            letterSpacing: "1px",
          }}
        >
          ▶ ACTIVE
        </div>
      )}
      <div
        style={{
          fontWeight: 900,
          fontSize: "0.85rem",
          color: "var(--gray-4)",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {trainerState.name}
      </div>
      {active.sprite ? (
        <img
          src={active.sprite}
          alt={active.name}
          style={{
            width: 90,
            height: 90,
            imageRendering: "pixelated",
            filter: active.fainted
              ? "grayscale(100%) opacity(0.4)"
              : "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            transform: side === "left" ? "scaleX(1)" : "scaleX(-1)",
          }}
        />
      ) : (
        <div
          style={{
            width: 90,
            height: 90,
            background: "var(--gray-2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          ⚫
        </div>
      )}
      <div
        style={{
          fontWeight: 900,
          fontSize: "1rem",
          textTransform: "capitalize",
        }}
      >
        {active.name.replace(/-/g, " ")}
      </div>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        {active.types.map((t: string) => (
          <span
            key={t}
            className="type-badge"
            style={{
              background: TYPE_COLORS[t] || "#888",
              color: [
                "electric",
                "ground",
                "normal",
                "ice",
                "steel",
                "fairy",
              ].includes(t)
                ? "#333"
                : "#fff",
              fontSize: "0.6rem",
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div style={{ width: "100%" }}>
        <HpBar current={active.current_hp} max={active.max_hp} />
      </div>
      {/* Team overview dots */}
      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem" }}>
        {trainerState.team.map((p: any, i: number) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: p.fainted
                ? "var(--gray-3)"
                : i === trainerState.active_index
                  ? "var(--yellow)"
                  : "var(--green)",
              border: "1px solid rgba(0,0,0,0.3)",
            }}
            title={p.name}
          />
        ))}
      </div>
    </div>
  );
}

export default function BattleScreen() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerX, setTrainerX] = useState<number | null>(null);
  const [trainerY, setTrainerY] = useState<number | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [narrations, setNarrations] = useState<string[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [actingTrainer, setActingTrainer] = useState<"trainer_x" | "trainer_y">(
    "trainer_x",
  );
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllTrainers()
      .then((d) => setTrainers(d.trainers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [narrations]);

  const handleStart = async () => {
    if (!trainerX || !trainerY) return;
    setLoading(true);
    setError("");
    setBattleState(null);
    setBattleId(null);
    setNarrations([]);
    setEvents([]);
    try {
      const result = await startBattle(trainerX, trainerY);
      setBattleId(result.battle_id);
      setBattleState(result.state);
      // First mover is decided by speed on the backend and stored in state
      const firstActing = (result.state as any).acting_trainer ?? "trainer_x";
      setActingTrainer(firstActing as "trainer_x" | "trainer_y");
      setNarrations([
        `⚔️ Battle started! ${result.state.trainer_x.name} vs ${result.state.trainer_y.name}!`,
      ]);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to start battle");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (moveName: string) => {
    if (!battleId || turnLoading || !battleState) return;
    setTurnLoading(true);
    try {
      const result = await executeTurn(battleId, moveName);
      setBattleState(result.state);
      setNarrations((prev) => [result.narration, ...prev]);
      setEvents((prev) => [result.event, ...prev]);
      // Backend alternates acting_trainer in state after every turn
      if (result.state.status === "ongoing") {
        setActingTrainer(result.acting_trainer as "trainer_x" | "trainer_y");
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to execute turn");
    } finally {
      setTurnLoading(false);
    }
  };

  const resetBattle = () => {
    setBattleState(null);
    setBattleId(null);
    setNarrations([]);
    setEvents([]);
    setError("");
  };

  // Get active pokemon moves for the acting trainer
  const activeMoves: Move[] = battleState
    ? (battleState[actingTrainer].team[battleState[actingTrainer].active_index]
        ?.moves ?? [])
    : [];

  const actingTrainerName = battleState ? battleState[actingTrainer].name : "";
  const isEnded = battleState?.status === "ended";

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.8rem",
          color: "var(--yellow)",
          marginBottom: "1.5rem",
          textShadow: "2px 2px 0 var(--yellow-dark)",
          letterSpacing: "1px",
        }}
      >
        ⚔️ BATTLE ARENA
      </h1>

      {/* Trainer Selection */}
      {!battleState && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div className="panel-title">SELECT TRAINERS</div>
          {trainers.length < 2 ? (
            <div className="alert alert-info">
              You need at least 2 trainers with Pokémon to battle. Go to Trainer
              Creation and Team Builder first!
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto",
                gap: "1rem",
                alignItems: "end",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    marginBottom: "0.4rem",
                    color: "var(--gray-4)",
                    textTransform: "uppercase",
                  }}
                >
                  Trainer 1 (X)
                </label>
                <select
                  className="input"
                  value={trainerX ?? ""}
                  onChange={(e) => setTrainerX(Number(e.target.value) || null)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="">Select trainer...</option>
                  {trainers
                    .filter((t) => t.pokemon.length > 0)
                    .map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={t.id === trainerY}
                      >
                        {t.name} ({t.pokemon.length} Pokémon)
                      </option>
                    ))}
                </select>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.7rem",
                  color: "var(--red)",
                  paddingBottom: "0.7rem",
                  textShadow: "1px 1px 0 var(--red-dark)",
                }}
              >
                VS
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    marginBottom: "0.4rem",
                    color: "var(--gray-4)",
                    textTransform: "uppercase",
                  }}
                >
                  Trainer 2 (Y)
                </label>
                <select
                  className="input"
                  value={trainerY ?? ""}
                  onChange={(e) => setTrainerY(Number(e.target.value) || null)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="">Select trainer...</option>
                  {trainers
                    .filter((t) => t.pokemon.length > 0)
                    .map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={t.id === trainerX}
                      >
                        {t.name} ({t.pokemon.length} Pokémon)
                      </option>
                    ))}
                </select>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleStart}
                disabled={
                  loading || !trainerX || !trainerY || trainerX === trainerY
                }
                style={{ paddingBottom: "0.7rem" }}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner"
                      style={{ width: 18, height: 18 }}
                    />{" "}
                    Starting...
                  </>
                ) : (
                  "⚔️ Start Battle!"
                )}
              </button>
            </div>
          )}
          {error && <div className="alert alert-error mt-2">{error}</div>}
        </div>
      )}

      {/* Battle UI */}
      {battleState && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Winner Banner */}
          {isEnded && battleState.winner && (
            <div className="winner-banner">
              <h2>🏆 {battleState.winner} WINS!</h2>
              <p style={{ fontWeight: 700, marginBottom: "1rem" }}>
                Battle Complete!
              </p>
              <button className="btn btn-blue" onClick={resetBattle}>
                🔄 New Battle
              </button>
            </div>
          )}

          {/* Arena */}
          <div className="battle-arena">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                position: "relative",
                zIndex: 1,
              }}
            >
              <PokemonPanel
                trainerState={battleState.trainer_x}
                isActive={actingTrainer === "trainer_x" && !isEnded}
                side="left"
              />
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.55rem",
                    color: "var(--red)",
                    textShadow: "1px 1px 0 var(--red-dark)",
                    marginBottom: "0.3rem",
                  }}
                >
                  VS
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.45rem",
                    color: "var(--gray-4)",
                  }}
                >
                  TURN {battleState.turn}
                </div>
                {!isEnded && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--yellow)",
                    }}
                  >
                    {actingTrainerName}'s turn
                  </div>
                )}
              </div>
              <PokemonPanel
                trainerState={battleState.trainer_y}
                isActive={actingTrainer === "trainer_y" && !isEnded}
                side="right"
              />
            </div>
          </div>

          {/* Move selector */}
          {!isEnded && (
            <div className="panel">
              <div className="panel-title">
                {actingTrainerName.toUpperCase()}'S MOVES —{" "}
                {battleState[actingTrainer].team[
                  battleState[actingTrainer].active_index
                ]?.name
                  .toUpperCase()
                  .replace(/-/g, " ")}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "0.5rem",
                }}
              >
                {activeMoves.map((move: Move) => {
                  const typeColor = TYPE_COLORS[move.type] || "#888";
                  const isLight = [
                    "electric",
                    "ground",
                    "normal",
                    "ice",
                    "steel",
                    "fairy",
                  ].includes(move.type);
                  return (
                    <button
                      key={move.name}
                      className="move-btn"
                      onClick={() => handleMove(move.name)}
                      disabled={turnLoading}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ textTransform: "capitalize" }}>
                          {move.name.replace(/-/g, " ")}
                        </span>
                        {turnLoading && (
                          <span
                            className="spinner"
                            style={{ width: 14, height: 14 }}
                          />
                        )}
                      </div>
                      <div className="move-btn-meta">
                        <span
                          style={{
                            background: typeColor,
                            color: isLight ? "#333" : "#fff",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "3px",
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          {move.type}
                        </span>
                        <span>{move.damage_class}</span>
                        {move.power > 0 && <span>⚡{move.power}</span>}
                        <span>🎯{move.accuracy}%</span>
                      </div>
                    </button>
                  );
                })}
                {activeMoves.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      color: "var(--gray-4)",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      padding: "1rem",
                    }}
                  >
                    No moves available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Narration + Log */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {/* Narration feed */}
            <div className="panel">
              <div className="panel-title">✨ BATTLE NARRATION</div>
              <div
                ref={logRef}
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {narrations.map((n, i) => (
                  <div
                    key={i}
                    className="narration-box"
                    style={{
                      fontSize: i === 0 ? "0.9rem" : "0.8rem",
                      opacity: i === 0 ? 1 : 0.65,
                      padding: i === 0 ? "1rem 1.25rem" : "0.6rem 1rem",
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>

            {/* Battle log */}
            <div className="panel">
              <div className="panel-title">BATTLE LOG</div>
              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                {events.length === 0 && (
                  <div style={{ color: "var(--gray-4)", fontSize: "0.8rem" }}>
                    Events will appear here...
                  </div>
                )}
                {[...events].map((ev, i) => {
                  let cls = "log-entry";
                  if (ev.critical) cls += " critical";
                  else if (ev.effectiveness_label === "super effective")
                    cls += " super";
                  else if (ev.fainted) cls += " faint";
                  return (
                    <div key={i} className={cls}>
                      <span
                        style={{
                          color: "var(--gray-3)",
                          marginRight: "0.4rem",
                        }}
                      >
                        T{ev.turn}
                      </span>
                      <span
                        style={{
                          textTransform: "capitalize",
                          color: "var(--white)",
                          fontWeight: 700,
                        }}
                      >
                        {ev.attacker}
                      </span>
                      {" used "}
                      <span
                        style={{
                          textTransform: "capitalize",
                          fontStyle: "italic",
                        }}
                      >
                        {ev.move.replace(/-/g, " ")}
                      </span>
                      {ev.missed && (
                        <span style={{ color: "var(--gray-4)" }}>
                          {" "}
                          — missed!
                        </span>
                      )}
                      {!ev.missed && ev.damage > 0 && (
                        <span style={{ color: "var(--yellow)" }}>
                          {" "}
                          (-{ev.damage} HP)
                        </span>
                      )}
                      {ev.critical && (
                        <span
                          style={{ color: "var(--yellow)", fontWeight: 800 }}
                        >
                          {" "}
                          ★CRIT!
                        </span>
                      )}
                      {ev.effectiveness_label === "super effective" && (
                        <span style={{ color: "var(--red)" }}> Super!</span>
                      )}
                      {ev.effectiveness_label === "not very effective" && (
                        <span style={{ color: "var(--gray-4)" }}> Weak.</span>
                      )}
                      {ev.fainted && (
                        <span
                          style={{
                            color: "var(--gray-3)",
                            display: "block",
                            textTransform: "capitalize",
                          }}
                        >
                          💀 {ev.defender} fainted!
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Team overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {(["trainer_x", "trainer_y"] as const).map((key) => (
              <div key={key} className="panel">
                <div className="panel-title">
                  {battleState[key].name.toUpperCase()}'S TEAM
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {battleState[key].team.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.45rem 0.6rem",
                        background:
                          i === battleState[key].active_index
                            ? "rgba(255,203,5,0.08)"
                            : "var(--gray-2)",
                        border: `1px solid ${i === battleState[key].active_index ? "var(--yellow)" : "var(--gray-3)"}`,
                        borderRadius: "4px",
                        opacity: p.fainted ? 0.45 : 1,
                      }}
                    >
                      {p.sprite && (
                        <img
                          src={p.sprite}
                          alt={p.name}
                          style={{
                            width: 28,
                            height: 28,
                            imageRendering: "pixelated",
                            filter: p.fainted ? "grayscale(100%)" : "",
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "0.78rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            marginTop: "0.15rem",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              background: "var(--gray-1)",
                              borderRadius: "3px",
                              height: "5px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${(p.current_hp / p.max_hp) * 100}%`,
                                background: p.fainted
                                  ? "var(--gray-3)"
                                  : p.current_hp / p.max_hp > 0.5
                                    ? "var(--hp-high)"
                                    : p.current_hp / p.max_hp > 0.2
                                      ? "var(--hp-mid)"
                                      : "var(--hp-low)",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--gray-4)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.current_hp}/{p.max_hp}
                          </span>
                        </div>
                      </div>
                      {p.fainted && (
                        <span
                          style={{ fontSize: "0.7rem", color: "var(--gray-4)" }}
                        >
                          💀
                        </span>
                      )}
                      {i === battleState[key].active_index && !p.fainted && (
                        <span style={{ fontSize: "0.7rem" }}>⚔️</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
