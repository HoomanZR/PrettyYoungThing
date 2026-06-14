import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  Vault,
  LayoutDashboard,
  Film,
  Tv,
  Disc3,
  Music,
  User,
  FolderOpen,
  Heart,
  Shield,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  onSearch: (query: string) => void;
}

const SIDEBAR_LINKS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Film, label: 'Movies', path: '/movies' },
  { icon: Tv, label: 'TV Shows', path: '/tv-shows' },
  { icon: Disc3, label: 'Albums', path: '/albums' },
  { icon: Music, label: 'Songs', path: '/songs' },
  { icon: User, label: 'Artists', path: '/artists' },
  { icon: FolderOpen, label: 'Collections', path: '/collections' },
  { icon: Heart, label: 'Favorites', path: '/favorites' },
];

export function Layout({ onSearch }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const location = useLocation();

  // Handle search debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      onSearch(value);
    }, 300);

    setSearchTimeout(newTimeout);
  }, [searchTimeout, onSearch]);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const sidebarLinks = profile?.role === 'admin'
    ? [...SIDEBAR_LINKS, { icon: Shield, label: 'Admin panel', path: '/admin' }]
    : SIDEBAR_LINKS;

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-60 bg-zinc-900 border-r border-zinc-800 transition-transform duration-300 z-40 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo section */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-vault-600/20 rounded-lg">
              <Vault className="w-5 h-5 text-vault-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">MediaVault</h1>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sidebarLinks.map((link) => {
              const IconComponent = link.icon;

              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-vault-600/20 text-vault-400 border-l-2 border-vault-400'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`
                  }
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-sm font-medium">{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-zinc-900 border-b border-zinc-800 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left section: hamburger + search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              {/* Search bar */}
              <div className="relative flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-vault-500 focus:bg-zinc-800/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Right section: user info + sign out */}
            <div className="flex items-center gap-4">
              {profile && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {profile.display_name || 'User'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-vault-600/20 border border-vault-500 flex items-center justify-center">
                    <span className="text-xs font-semibold text-vault-400">
                      {(profile.display_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={signOut}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5 text-zinc-400 hover:text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
