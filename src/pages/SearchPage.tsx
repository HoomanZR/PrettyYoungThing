import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Film, Tv, Disc3, Music, User, FolderOpen, ArrowRight } from 'lucide-react';
import { supabase, MEDIA_TYPE_LABELS, type MediaType } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface MediaItemWithCreator {
  id: string;
  type: MediaType;
  title: string;
  description: string | null;
  image_url: string | null;
  release_date: string | null;
  creator: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  creator_profile?: { display_name: string };
}

interface CollectionWithOwner {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner_profile?: { display_name: string };
  collection_items?: Array<{ count: number }>;
}

const MEDIA_TYPES: MediaType[] = ['movie', 'tv_show', 'album', 'song', 'artist'];

const MediaCard = ({ item }: { item: MediaItemWithCreator }) => {
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
      className="group cursor-pointer h-full"
      onClick={() => navigate(`/media/${item.id}`)}
    >
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
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{item.title}</h3>

      {/* Type Badge and Release Date */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`badge-${item.type} text-xs px-2 py-1`}>
            {MEDIA_TYPE_LABELS[item.type]}
          </span>
        </div>
        {item.release_date && (
          <p className="text-xs text-gray-400">
            {new Date(item.release_date).getFullYear()}
          </p>
        )}
      </div>
    </div>
  );
};

const CollectionCard = ({ collection }: { collection: CollectionWithOwner }) => {
  const navigate = useNavigate();
  const itemCount = (collection.collection_items as any)?.[0]?.count || 0;

  return (
    <div
      className="card p-6 group cursor-pointer hover:border-zinc-600"
      onClick={() => navigate(`/collection/${collection.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-br from-vault-600 to-vault-900 rounded-lg flex items-center justify-center">
            {collection.cover_image_url ? (
              <img
                src={collection.cover_image_url}
                alt={collection.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <FolderOpen className="w-8 h-8 text-white/60" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1 line-clamp-2 group-hover:text-vault-400 transition-colors">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>by {collection.owner_profile?.display_name || 'Unknown'}</span>
            <span className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-5 h-5 text-vault-400" />
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="space-y-3">
    <div className="aspect-[2/3] rounded-xl bg-zinc-800 animate-pulse" />
    <div className="h-4 bg-zinc-800 rounded animate-pulse" />
    <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse" />
  </div>
);

const SkeletonCollectionCard = () => (
  <div className="card p-6 space-y-3">
    <div className="flex items-start gap-4">
      <div className="w-16 h-16 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-full" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const query = searchParams.get('q') || '';
  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');

  const [mediaItems, setMediaItems] = useState<MediaItemWithCreator[]>([]);
  const [collections, setCollections] = useState<CollectionWithOwner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      searchContent();
    } else {
      setMediaItems([]);
      setCollections([]);
    }
  }, [query, selectedType]);

  const searchContent = async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      // Search media items
      let mediaQuery = supabase
        .from('media_items')
        .select(`*, creator_profile:profiles!media_items_creator_fkey(display_name)`)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedType !== 'all') {
        mediaQuery = mediaQuery.eq('type', selectedType);
      }

      const { data: mediaData, error: mediaError } = await mediaQuery;

      if (mediaError) throw mediaError;
      setMediaItems(mediaData || []);

      // Search collections
      const collectionsQuery = supabase
        .from('collections')
        .select(
          `*, owner_profile:profiles!collections_owner_id_fkey(display_name), collection_items(count)`
        )
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false });

      // Filter by public collections or user's own collections
      let finalCollectionsQuery = collectionsQuery;
      if (user) {
        finalCollectionsQuery = collectionsQuery.or(`is_public.eq.true,owner_id.eq.${user.id}`);
      } else {
        finalCollectionsQuery = collectionsQuery.eq('is_public', true);
      }

      const { data: collectionsData, error: collectionsError } = await finalCollectionsQuery;

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);
    } catch (err) {
      console.error('Error searching:', err);
      console.error('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = selectedType === 'all'
    ? mediaItems
    : mediaItems.filter(item => item.type === selectedType);

  const hasResults = filteredMedia.length > 0 || collections.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-6 h-6 text-vault-500" />
            <h1 className="text-3xl font-bold">
              Search results for <span className="text-vault-400">'{query}'</span>
            </h1>
          </div>
          {hasResults && (
            <p className="text-gray-400">
              Found {filteredMedia.length} media item{filteredMedia.length !== 1 ? 's' : ''} and {collections.length} collection{collections.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!query.trim() ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Start searching</h2>
            <p className="text-gray-400">Enter a query in the search bar above to find media and collections</p>
          </div>
        ) : loading ? (
          <div className="space-y-16">
            {/* Media Skeleton */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Media</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </section>

            {/* Collections Skeleton */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Collections</h2>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCollectionCard key={i} />
                ))}
              </div>
            </section>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No results found</h2>
            <p className="text-gray-400">
              We couldn't find any media or collections matching '{query}'
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Media Section */}
            {(filteredMedia.length > 0 || collections.length === 0) && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Media</h2>

                  {/* Type Filter Pills */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedType('all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedType === 'all'
                          ? 'bg-vault-600 text-white'
                          : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                      }`}
                    >
                      All
                    </button>

                    {MEDIA_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedType === type
                            ? 'bg-vault-600 text-white'
                            : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                        }`}
                      >
                        {type === 'movie' && <Film className="w-4 h-4" />}
                        {type === 'tv_show' && <Tv className="w-4 h-4" />}
                        {type === 'album' && <Disc3 className="w-4 h-4" />}
                        {type === 'song' && <Music className="w-4 h-4" />}
                        {type === 'artist' && <User className="w-4 h-4" />}
                        {MEDIA_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredMedia.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredMedia.map((item) => (
                      <MediaCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-zinc-900/50 rounded-lg">
                    <p className="text-gray-400">
                      No {selectedType !== 'all' ? `${MEDIA_TYPE_LABELS[selectedType]}s` : 'media'} found matching '{query}'
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Collections Section */}
            {collections.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">Collections</h2>
                <div className="space-y-4">
                  {collections.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
