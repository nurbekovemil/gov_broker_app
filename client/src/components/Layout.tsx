import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <header className="border-b bg-slate-900 text-slate-50 shadow-md">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-10 min-h-[4.5rem] py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-10">
            <Link to="/market" className="flex items-center gap-3 shrink-0">
              <span className="text-xl font-bold tracking-tight sm:text-2xl">OTC Market</span>
              <span className="text-slate-400 text-sm font-medium hidden sm:block">ГЦБ Портал</span>
            </Link>
            <nav className="hidden sm:flex gap-1">
              {nav.map((item) => (
                <Button
                  key={item.to}
                  variant="ghost"
                  className={cn(
                    'text-base text-slate-200 hover:bg-slate-800 hover:text-white h-10 px-4',
                    location.pathname === item.to && 'bg-slate-800 text-white',
                  )}
                  asChild
                >
                  <Link to={item.to}>{item.label}</Link>
                </Button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-base font-medium leading-tight">{user?.fullName}</p>
              <p className="text-sm text-slate-400">{user?.role === 'admin' ? 'Администратор' : 'Инвестор'}</p>
            </div>
            <Button variant="secondary" className="h-10 px-5" onClick={handleLogout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-8 lg:px-10 py-10 lg:py-12">{children}</main>
      <footer className="border-t py-5 text-center text-sm text-muted-foreground">
        © 2026 Государственный брокер КР — OTC Market Portal
      </footer>
    </div>
  );
}
