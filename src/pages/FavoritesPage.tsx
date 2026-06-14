import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import {
  supabase,
  MEDIA_TYPE_LABELS,
  type Favorite,
  type MediaType,
  type MediaItem,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface FavoriteWithMedia extends Favorite {
  media_items: MediaItem;
}

const MEDIA_TYPES: Array<{ value: MediaType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv_show', label: 'TV Shows' },
  { value: 'album', label: 'Albums' },
  { value: 'song', label: 'Songs' },
  { value: 'artist', label: 'Artists' },
];

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="aspect-[2/3] rounded-lg bg-zinc-800 mb-3" />
    <div className="h-4 bg-zinc-800 rounded mb-2" />
    <div className="h-3 bg-zinc-800 rounded w-2/3" />
  </div>
);

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteWithMedia[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [favorites, selectedType, searchQuery]);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('*, media_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data as FavoriteWithMedia[] || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...favorites];

    if (selectedType !== 'all') {
      filtered = filtered.filter((fav) => fav.media_items.type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((fav) =>
        fav.media_items.title.toLowerCase().includes(query)
      );
    }

    setFilteredFavorites(filtered);
  };

  const handleRemoveFavorite = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) return;

    try {
      setRemovingId(mediaId);
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('media_id', mediaId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites((prev) => prev.filter((fav) => fav.media_items.id !== mediaId));
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert('Failed to remove favorite');
    } finally {
      setRemovingId(null);
    }
  };

  const getGradientColor = (type: MediaType) => {
    switch (type) {
      case 'movie':
        return 'from-blue-600 to-blue-800';
      case 'tv_show':
        return 'from-purple-600 to-purple-800';
      case 'album':
        return 'from-emerald-600 to-emerald-800';
      case 'song':
        return 'from-amber-600 to-amber-800';
      case 'artist':
        return 'from-pink-600 to-pink-800';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Please sign in to view your favorites</p>
          <a href="/auth" className="btn-primary inline-block">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            My Favorites
            <span className="text-xl text-zinc-400 font-normal ml-3">
              ({filteredFavorites.length})
            </span>
          </h1>
          <p className="text-zinc-400">Your favorite media items</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredFavorites.length === 0 && favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart size={64} className="text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg mb-2">No favorites yet</p>
            <p className="text-zinc-500">Start adding items to your favorites!</p>
          </div>
        )}

        {/* No Results State */}
        {!loading && filteredFavorites.length === 0 && favorites.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart size={64} className="text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg mb-2">No results found</p>
            <p className="text-zinc-500">Try adjusting your filters or search</p>
          </div>
        )}

        {/* Grid */}
        {!loading && filteredFavorites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredFavorites.map((favorite) => (
              <div
                key={favorite.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/media/${favorite.media_items.id}`)}
              >
                {/* Image Container */}
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-gradient-to-br transition-all duration-300">
                  {favorite.media_items.image_url ? (
                    <img
                      src={favorite.media_items.image_url}
                      alt={favorite.media_items.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${getGradientColor(
                        favorite.media_items.type
                      )} flex items-center justify-center`}
                    >
                      <p className="text-white text-sm font-semibold text-center px-4 line-clamp-3">
                        {favorite.media_items.title}
                      </p>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Remove Favorite Button */}
                  <button
                    onClick={(e) => handleRemoveFavorite(favorite.media_items.id, e)}
                    disabled={removingId === favorite.media_items.id}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Remove from favorites"
                  >
                    <Heart
                      size={16}
                      className="text-white fill-white"
                    />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">
                  {favorite.media_items.title}
                </h3>

                {/* Type Badge */}
                <span
                  className={`badge-${favorite.media_items.type} text-xs px-2 py-1 rounded-md font-medium inline-block`}
                >
                  {MEDIA_TYPE_LABELS[favorite.media_items.type]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
