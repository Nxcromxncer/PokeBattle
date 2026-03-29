import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import TrainerCreation from './pages/TrainerCreation';
import TeamBuilder from './pages/TeamBuilder';
import BattleScreen from './pages/BattleScreen';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-icon">⚔️</span>
              <span className="logo-text">PokéBattle</span>
            </div>
            <nav className="nav">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                🧑‍💼 Trainers
              </NavLink>
              <NavLink to="/team" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                🎒 Team Builder
              </NavLink>
              <NavLink to="/battle" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                ⚔️ Battle
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<TrainerCreation />} />
            <Route path="/team" element={<TeamBuilder />} />
            <Route path="/battle" element={<BattleScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
