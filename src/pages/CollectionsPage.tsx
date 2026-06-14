import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { FolderOpen, Plus, X } from 'lucide-react';

interface CollectionWithCount {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner_profile: { display_name: string } | null;
  collection_items: Array<{ count?: number }>;
}

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [user]);

  const fetchCollections = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select(
          `*, owner_profile:profiles!collections_owner_id_fkey(display_name), collection_items(count)`
        )
        .or(`is_public.eq.true,owner_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    try {
      setCreating(true);
      const { error } = await supabase.from('collections').insert({
        title,
        description,
        is_public: isPublic,
        owner_id: user.id,
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setIsPublic(true);
      setShowCreateModal(false);
      await fetchCollections();
    } catch (err) {
      console.error('Error creating collection:', err);
      alert('Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Please sign in to view collections</p>
          <Link to="/auth" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading collections...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Collections</h1>
            <p className="text-zinc-400">Organize your media into collections</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Create Collection
          </button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Create Collection</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCollection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Collection"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this collection about?"
                    className="input-field resize-none h-24"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600"
                  />
                  <label htmlFor="is_public" className="text-sm text-zinc-300">
                    Make this collection public
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !title.trim()}
                    className="btn-primary flex-1"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {collections.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 mb-4">No collections yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create your first collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => {
              const itemCount =
                collection.collection_items && collection.collection_items[0]?.count
                  ? Number(collection.collection_items[0].count)
                  : 0;

              return (
                <button
                  key={collection.id}
                  onClick={() => navigate(`/collection/${collection.id}`)}
                  className="card overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden group">
                    {collection.cover_image_url ? (
                      <img
                        src={collection.cover_image_url}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20">
                        <FolderOpen size={48} className="text-zinc-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2 text-left">
                      {collection.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2 text-left">
                      {collection.description || 'No description'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{itemCount} items</span>
                      <span>by {collection.owner_profile?.display_name || 'Unknown'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
