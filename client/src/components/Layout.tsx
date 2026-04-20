import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, LayoutDashboard, ListChecks, LogOut, Settings2, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navInvestor = [
  { to: '/market', label: 'Витрина', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Портфель', icon: Briefcase },
  { to: '/trades', label: 'Мои сделки', icon: ListChecks },
];

const navAdmin = [
  { to: '/market', label: 'Витрина', icon: LayoutDashboard },
  { to: '/trades', label: 'Все сделки', icon: ListChecks },
  { to: '/admin', label: 'Управление', icon: Settings2 },
  { to: '/admin/balances', label: 'Остатки', icon: Wallet },
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
      <header className="sticky top-0 z-40 border-b border-sky-200/45 bg-sky-100/70 backdrop-blur-xl shadow-material-sm">
        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[3.5rem] py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-5 lg:gap-8">
            <Link to="/market" className="flex items-center gap-2.5 shrink-0">
              <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Gov Broker Market</span>
              {/* <span className="text-muted-foreground text-xs sm:text-sm font-medium hidden sm:block">ГЦБ Портал</span> */}
            </Link>
          </div>
          <nav className="hidden sm:flex gap-1.5 absolute left-1/2 -translate-x-1/2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.to}
                  variant="ghost"
                  className={cn(
                    'text-sm text-muted-foreground hover:bg-white/75 hover:text-foreground h-9 px-4',
                    location.pathname === item.to &&
                      'bg-white text-primary shadow-material-sm hover:bg-white hover:text-primary font-semibold',
                  )}
                  asChild
                >
                  <Link to={item.to}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? 'Администратор' : 'Инвестор'}</p>
            </div>
            <Button variant="secondary" className="h-9 px-5 text-sm shadow-material-sm bg-white/90" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-7 lg:py-9">{children}</main>
      <footer className="border-t border-border/50 py-4 text-center text-sm text-muted-foreground">
        © 2026 Государственный брокер КР — Gov Broker Market
      </footer>
    </div>
  );
}
