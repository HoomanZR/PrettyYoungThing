import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Star,
  Heart,
  Search,
  Film,
  Tv,
  Disc3,
  Music,
  User,
  ArrowLeft,
} from 'lucide-react';
import {
  supabase,
  MEDIA_TYPE_LABELS,
  type MediaType,
  type MediaItem,
  type Genre,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type SortType = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'rating';

interface MediaItemWithExtras extends MediaItem {
  avg_rating?: number;
  is_favorite?: boolean;
}

const getMediaTypeFromPath = (pathname: string): MediaType => {
  switch (pathname) {
    case '/movies':
      return 'movie';
    case '/tv-shows':
      return 'tv_show';
    case '/albums':
      return 'album';
    case '/songs':
      return 'song';
    case '/artists':
      return 'artist';
    default:
      return 'movie';
  }
};

const getGradientColor = (type: MediaType) => {
  switch (type) {
    case 'movie':
      return 'from-blue-900 to-blue-800';
    case 'tv_show':
      return 'from-purple-900 to-purple-800';
    case 'album':
      return 'from-emerald-900 to-emerald-800';
    case 'song':
      return 'from-amber-900 to-amber-800';
    case 'artist':
      return 'from-pink-900 to-pink-800';
    default:
      return 'from-gray-900 to-gray-800';
  }
};

const getTypeIcon = (type: MediaType) => {
  switch (type) {
    case 'movie':
      return <Film className="w-4 h-4" />;
    case 'tv_show':
      return <Tv className="w-4 h-4" />;
    case 'album':
      return <Disc3 className="w-4 h-4" />;
    case 'song':
      return <Music className="w-4 h-4" />;
    case 'artist':
      return <User className="w-4 h-4" />;
    default:
      return null;
  }
};

const MediaCard = ({
  item,
  onClick,
  isFavorite,
}: {
  item: MediaItemWithExtras;
  onClick: () => void;
  isFavorite: boolean;
}) => {
  const gradient = getGradientColor(item.type);

  return (
    <div className="cursor-pointer group" onClick={onClick}>
      {/* Image Container */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center p-4`}
          >
            <p className="text-center text-white text-sm font-semibold line-clamp-3">
              {item.title}
            </p>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <ArrowLeft className="w-5 h-5 text-white rotate-180" />
          </div>
        </div>

        {/* Favorite Heart */}
        {isFavorite && (
          <div className="absolute top-2 right-2 bg-red-500/90 rounded-full p-2">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        {/* Title */}
        <h3 className="text-sm font-medium text-white line-clamp-2">
          {item.title}
        </h3>

        {/* Type Badge and Rating */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`badge-${item.type} text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1`}
          >
            {getTypeIcon(item.type)}
            <span className="hidden sm:inline">
              {MEDIA_TYPE_LABELS[item.type]}
            </span>
          </span>
          {item.avg_rating && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span>{item.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Release Date */}
        {item.release_date && (
          <p className="text-xs text-gray-400">
            {new Date(item.release_date).getFullYear()}
          </p>
        )}
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div>
    <div className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse mb-3" />
    <div className="h-4 bg-zinc-800 rounded animate-pulse mb-2" />
    <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse mb-2" />
    <div className="h-3 bg-zinc-800 rounded w-1/2 animate-pulse" />
  </div>
);

export function MediaListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const mediaType = getMediaTypeFromPath(location.pathname);

  const [items, setItems] = useState<MediaItemWithExtras[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch media items
        const { data: itemsData } = await supabase
          .from('media_items')
          .select(
            `*, creator_profile:profiles!media_items_creator_fkey(display_name)`
          )
          .eq('type', mediaType);

        if (!itemsData) {
          setItems([]);
        } else {
          setItems(itemsData);
        }

        // Fetch genres
        const { data: genresData } = await supabase
          .from('genres')
          .select('*');

        if (genresData) {
          setGenres(genresData);
        }

        // Fetch ratings
        if (itemsData && itemsData.length > 0) {
          const itemIds = itemsData.map(item => item.id);
          const { data: ratingsData } = await supabase
            .from('ratings')
            .select('media_id, score')
            .in('media_id', itemIds);

          if (ratingsData) {
            const ratingMap = new Map<
              string,
              { sum: number; count: number }
            >();

            ratingsData.forEach(rating => {
              const current = ratingMap.get(rating.media_id) || {
                sum: 0,
                count: 0,
              };
              ratingMap.set(rating.media_id, {
                sum: current.sum + rating.score,
                count: current.count + 1,
              });
            });

            const itemsWithRatings = itemsData.map(item => ({
              ...item,
              avg_rating: ratingMap.get(item.id)
                ? ratingMap.get(item.id)!.sum /
                  ratingMap.get(item.id)!.count
                : undefined,
            }));

            setItems(itemsWithRatings);
          }
        }

        // Fetch user favorites
        if (user?.id) {
          const { data: favData } = await supabase
            .from('favorites')
            .select('media_id')
            .eq('user_id', user.id);

          if (favData) {
            setFavorites(new Set(favData.map(f => f.media_id)));
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [mediaType, user?.id]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items;

    // Genre filter (client-side via media_genres)
    if (selectedGenre) {
      result = result.filter(item => {
        const hasGenre = item.genres?.some(g => g.id === selectedGenre);
        return hasGenre;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'oldest':
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'rating':
        sorted.sort(
          (a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)
        );
        break;
      case 'newest':
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }

    return sorted;
  }, [items, selectedGenre, searchQuery, sortBy]);

  const title = MEDIA_TYPE_LABELS[mediaType];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{title}</h1>
              <p className="text-gray-400">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/media/new?type=${mediaType}`)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New
            </button>
          </div>

          {/* Sorting and Filtering Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="input-field flex items-center gap-2 py-2 px-3"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* Genre Filter */}
            {genres.length > 0 && (
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                className="input-field flex items-center gap-2 py-2 px-3"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4 flex justify-center">
              {mediaType === 'movie' && (
                <Film className="w-16 h-16 text-gray-600" />
              )}
              {mediaType === 'tv_show' && (
                <Tv className="w-16 h-16 text-gray-600" />
              )}
              {mediaType === 'album' && (
                <Disc3 className="w-16 h-16 text-gray-600" />
              )}
              {mediaType === 'song' && (
                <Music className="w-16 h-16 text-gray-600" />
              )}
              {mediaType === 'artist' && (
                <User className="w-16 h-16 text-gray-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">No {title.toLowerCase()} found</h2>
            <p className="text-gray-400 mb-6">
              {searchQuery || selectedGenre
                ? 'Try adjusting your filters or search'
                : `Add the first ${title.toLowerCase()}!`}
            </p>
            <button
              onClick={() => navigate(`/media/new?type=${mediaType}`)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add {title}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                isFavorite={favorites.has(item.id)}
                onClick={() => navigate(`/media/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
