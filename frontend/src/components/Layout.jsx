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
          <img src="/wallet-logo.png" alt="My Wallet" className="sidebar-logo" />
          <span className="user-name">{user?.name}</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end><FiHome /> Overview</NavLink>
          <NavLink to="/transactions"><FiPieChart /> Transactions</NavLink>
          <NavLink to="/dividends"><FiDollarSign /> Dividends</NavLink>
        </nav>
        <button className="logout-btn" onClick={logout}>
          <FiLogOut /> Log Out
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
