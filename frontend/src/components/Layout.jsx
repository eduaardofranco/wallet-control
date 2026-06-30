import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiPieChart, FiDollarSign, FiLogOut } from 'react-icons/fi';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Carteira</h2>
          <span className="user-name">{user?.name}</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end><FiHome /> Dashboard</NavLink>
          <NavLink to="/ativos"><FiPieChart /> Ativos</NavLink>
          <NavLink to="/dividendos"><FiDollarSign /> Dividendos</NavLink>
        </nav>
        <button className="logout-btn" onClick={logout}>
          <FiLogOut /> Sair
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
