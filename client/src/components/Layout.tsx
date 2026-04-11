import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const navInvestor = [
  { to: '/market', label: 'Витрина' },
  { to: '/portfolio', label: 'Портфель' },
  { to: '/trades', label: 'Мои сделки' },
];

const navAdmin = [
  { to: '/market', label: 'Витрина' },
  { to: '/trades', label: 'Все сделки' },
  { to: '/admin', label: 'Управление' },
  { to: '/admin/balances', label: 'Остатки' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const nav = user?.role === 'admin' ? navAdmin : navInvestor;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/market" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">OTC Market</span>
              <span className="text-brand-100 text-xs font-medium hidden sm:block">ГЦБ Портал</span>
            </Link>
            <nav className="hidden sm:flex gap-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-brand-700 text-white'
                      : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-brand-200">{user?.role === 'admin' ? 'Администратор' : 'Инвестор'}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        © 2026 Государственный брокер КР — OTC Market Portal
      </footer>
    </div>
  );
}
