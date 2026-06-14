import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, FolderOpen, Plus, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { supabase, type MediaItem, MEDIA_TYPE_LABELS } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface MediaItemWithRating extends MediaItem {
  avg_rating?: number;
  is_favorite?: boolean;
}

const MediaCard = ({ item, showFavorite = false }: { item: MediaItemWithRating; showFavorite?: boolean }) => {
  const navigate = useNavigate();

  const getGradientColor = () => {
    switch (item.type) {
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

  return (
    <div
      className="w-40 flex-shrink-0 cursor-pointer group"
      onClick={() => navigate(`/media/${item.id}`)}
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradientColor()} flex items-center justify-center`}>
            <div className="text-center px-4">
              <p className="text-white text-sm font-semibold">{item.title}</p>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Favorite Heart */}
        {showFavorite && item.is_favorite && (
          <div className="absolute top-2 right-2 bg-red-500 rounded-full p-2">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{item.title}</h3>

      {/* Type Badge and Rating */}
      <div className="flex items-center justify-between gap-2">
        <span className={`badge-${item.type} text-xs px-2 py-1 rounded-md font-medium`}>
          {MEDIA_TYPE_LABELS[item.type]}
        </span>
        {item.avg_rating && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Star className="w-3 h-3 fill-current" />
            <span>{item.avg_rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CollectionCard = ({ collection }: { collection: any }) => {
  const navigate = useNavigate();
  const itemCount = collection.item_count || (collection.collection_items as any)?.[0]?.count || 0;

  return (
    <div
      className="w-40 flex-shrink-0 cursor-pointer group"
      onClick={() => navigate(`/collection/${collection.id}`)}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-vault-600 to-vault-900">
        {collection.cover_image_url ? (
          <img
            src={collection.cover_image_url}
            alt={collection.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-vault-700 to-vault-900">
            <FolderOpen className="w-12 h-12 text-white/60" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{collection.title}</h3>

      {/* Item Count */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <FolderOpen className="w-3 h-3" />
        <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="w-40 flex-shrink-0">
    <div className="aspect-[2/3] rounded-xl bg-zinc-800 animate-pulse mb-3" />
    <div className="h-4 bg-zinc-800 rounded animate-pulse mb-2" />
    <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse" />
  </div>
);

const Section = ({
  title,
  items,
  isLoading,
  isEmpty,
  onSeeAll,
  children,
}: {
  title: string;
  items: unknown[];
  isLoading: boolean;
  isEmpty: boolean;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) => (
  <section className="animate-slide-up">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        {title === 'Recently Added' && <Clock className="w-5 h-5 text-vault-500" />}
        {title === 'Top Rated' && <TrendingUp className="w-5 h-5 text-vault-500" />}
        {title === 'Your Favorites' && <Heart className="w-5 h-5 text-vault-500" />}
        {title === 'Your Collections' && <FolderOpen className="w-5 h-5 text-vault-500" />}
        {title}
      </h2>
      {items.length > 0 && onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-vault-500 hover:text-vault-400 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          See all <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>

    {isLoading ? (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    ) : isEmpty ? (
      <div className="bg-zinc-900 rounded-xl p-8 text-center text-gray-400">
        <p>No items yet. Add some media to get started.</p>
      </div>
    ) : (
      <div className="flex gap-4 overflow-x-auto pb-4">{children}</div>
    )}
  </section>
);

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [recentlyAdded, setRecentlyAdded] = useState<MediaItemWithRating[]>([]);
  const [topRated, setTopRated] = useState<MediaItemWithRating[]>([]);
  const [favorites, setFavorites] = useState<MediaItemWithRating[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingTopRated, setLoadingTopRated] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch recently added
        setLoadingRecent(true);
        const { data: recentData } = await supabase
          .from('media_items')
          .select(`*, creator_profile:profiles!media_items_creator_fkey(display_name, avatar_url)`)
          .order('created_at', { ascending: false })
          .limit(12);

        if (recentData) {
          setRecentlyAdded(recentData);
        }
        setLoadingRecent(false);

        // Fetch favorites
        setLoadingFavorites(true);
        const { data: favData } = await supabase
          .from('favorites')
          .select(`media_id, media_items(*)`)
          .eq('user_id', user.id);

        if (favData) {
          const favoriteItems = favData
            .map(fav => (fav.media_items as unknown as MediaItemWithRating))
            .filter(Boolean);
          setFavorites(favoriteItems);
        }
        setLoadingFavorites(false);

        // Fetch collections
        setLoadingCollections(true);
        const { data: collData } = await supabase
          .from('collections')
          .select(`*, owner_profile:profiles!collections_owner_id_fkey(display_name), collection_items(count)`)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (collData) {
          const collectionsWithCount = collData.map((c: any) => ({
            ...c,
            item_count: Number(c.collection_items?.[0]?.count) || 0,
          }));
          setCollections(collectionsWithCount);
        }
        setLoadingCollections(false);

        // Fetch ratings and compute averages
        setLoadingTopRated(true);
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('media_id, score');

        if (ratingsData && ratingsData.length > 0) {
          // Group by media_id and compute averages
          const ratingMap = new Map<string, { sum: number; count: number }>();

          ratingsData.forEach(rating => {
            const current = ratingMap.get(rating.media_id) || { sum: 0, count: 0 };
            ratingMap.set(rating.media_id, {
              sum: current.sum + rating.score,
              count: current.count + 1,
            });
          });

          // Get top rated media IDs
          const topMediaIds = Array.from(ratingMap.entries())
            .sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))
            .slice(0, 12)
            .map(([mediaId]) => mediaId);

          if (topMediaIds.length > 0) {
            const { data: topMediaData } = await supabase
              .from('media_items')
              .select(`*, creator_profile:profiles!media_items_creator_fkey(display_name, avatar_url)`)
              .in('id', topMediaIds);

            if (topMediaData) {
              // Attach average ratings
              const topWithRatings = topMediaData.map(item => ({
                ...item,
                avg_rating: ratingMap.get(item.id)
                  ? ratingMap.get(item.id)!.sum / ratingMap.get(item.id)!.count
                  : undefined,
              }));

              // Sort by rating descending
              topWithRatings.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
              setTopRated(topWithRatings);
            }
          }
        }
        setLoadingTopRated(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoadingRecent(false);
        setLoadingTopRated(false);
        setLoadingFavorites(false);
        setLoadingCollections(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-gray-400">Please log in to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-vault-500">{profile?.display_name || 'Guest'}</span>
          </h1>
          <p className="text-gray-400">Explore your media vault</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Recently Added */}
        <Section
          title="Recently Added"
          items={recentlyAdded}
          isLoading={loadingRecent}
          isEmpty={recentlyAdded.length === 0}
          onSeeAll={() => navigate('/movies')}
        >
          {recentlyAdded.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </Section>

        {/* Top Rated */}
        <Section
          title="Top Rated"
          items={topRated}
          isLoading={loadingTopRated}
          isEmpty={topRated.length === 0}
          onSeeAll={() => navigate('/favorites')}
        >
          {topRated.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </Section>

        {/* Your Favorites */}
        <Section
          title="Your Favorites"
          items={favorites}
          isLoading={loadingFavorites}
          isEmpty={favorites.length === 0}
          onSeeAll={() => navigate('/favorites')}
        >
          {favorites.map((item) => (
            <MediaCard key={item.id} item={{ ...item, is_favorite: true }} showFavorite />
          ))}
        </Section>

        {/* Your Collections */}
        <Section
          title="Your Collections"
          items={collections}
          isLoading={loadingCollections}
          isEmpty={collections.length === 0}
          onSeeAll={() => navigate('/collections')}
        >
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </Section>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/media/new')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-vault-500 to-vault-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-vault-500/50 hover:scale-110 transition-all duration-300 group z-20"
        aria-label="Add new media"
      >
        <Plus className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
}
