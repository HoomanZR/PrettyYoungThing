import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import MediaDetailPage from './pages/MediaDetailPage';
import MediaFormPage from './pages/MediaFormPage';
import { MediaListPage } from './pages/MediaListPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import { SearchPage } from './pages/SearchPage';
import { AdminPage } from './pages/AdminPage';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-vault-600/30" />
          <div className="text-zinc-500 text-sm">Loading MediaVault...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <AppRoutes />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [navigate]);

  return (
    <Routes>
      <Route element={<Layout onSearch={handleSearch} />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/movies" element={<MediaListPage />} />
        <Route path="/tv-shows" element={<MediaListPage />} />
        <Route path="/albums" element={<MediaListPage />} />
        <Route path="/songs" element={<MediaListPage />} />
        <Route path="/artists" element={<MediaListPage />} />
        <Route path="/media/new" element={<MediaFormPage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />
        <Route path="/media/:id/edit" element={<MediaFormPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collection/:id" element={<CollectionDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
