import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type MediaItem } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Trash2, Edit, Search, X, Plus, ArrowLeft } from 'lucide-react';

interface CollectionWithOwner {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner_profile: { display_name: string } | null;
}

interface CollectionItemWithMedia {
  id: string;
  collection_id: string;
  media_id: string;
  sort_order: number;
  media_items: MediaItem;
}

interface SearchableMediaItem {
  id: string;
  title: string;
  type: string;
  image_url: string | null;
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [collection, setCollection] = useState<CollectionWithOwner | null>(null);
  const [items, setItems] = useState<CollectionItemWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableMedia, setAvailableMedia] = useState<SearchableMediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingMedia, setAddingMedia] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCollection();
      fetchItems();
    }
  }, [id, user]);

  const fetchCollection = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('collections')
        .select(
          `*, owner_profile:profiles!collections_owner_id_fkey(display_name)`
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCollection(data);
        setEditTitle(data.title);
        setEditDescription(data.description || '');
        setEditIsPublic(data.is_public);

        if (user && data.owner_id === user.id) {
          setIsOwner(true);
        }
      } else {
        navigate('/collections');
      }
    } catch (err) {
      console.error('Error fetching collection:', err);
      navigate('/collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('collection_items')
        .select('*, media_items(*)')
        .eq('collection_id', id)
        .order('sort_order');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching collection items:', err);
    }
  };

  const searchMedia = async (query: string) => {
    if (!query.trim()) {
      setAvailableMedia([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('media_items')
        .select('id, title, type, image_url')
        .ilike('title', `%${query}%`)
        .limit(20);

      if (error) throw error;
      setAvailableMedia(data || []);
    } catch (err) {
      console.error('Error searching media:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    searchMedia(query);
  };

  const handleAddItem = async (mediaId: string) => {
    if (!id) return;

    try {
      setAddingMedia(mediaId);
      const { error } = await supabase.from('collection_items').insert({
        collection_id: id,
        media_id: mediaId,
        sort_order: items.length,
      });

      if (error) throw error;
      await fetchItems();
      setSearchQuery('');
      setAvailableMedia([]);
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item to collection');
    } finally {
      setAddingMedia(null);
    }
  };

  const handleRemoveItem = async (mediaId: string) => {
    if (!id || !isOwner) return;

    if (!confirm('Remove this item from the collection?')) return;

    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', id)
        .eq('media_id', mediaId);

      if (error) throw error;
      await fetchItems();
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item');
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !editTitle.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('collections')
        .update({
          title: editTitle,
          description: editDescription,
          is_public: editIsPublic,
        })
        .eq('id', id);

      if (error) throw error;
      await fetchCollection();
      setEditMode(false);
    } catch (err) {
      console.error('Error saving collection:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!id || !isOwner) return;

    if (!confirm('Delete this collection? This action cannot be undone.')) return;

    try {
      const { error } = await supabase.from('collections').delete().eq('id', id);

      if (error) throw error;
      navigate('/collections');
    } catch (err) {
      console.error('Error deleting collection:', err);
      alert('Failed to delete collection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading collection...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Collection not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <button
          onClick={() => navigate('/collections')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Collections
        </button>

        {/* Collection Header */}
        {!editMode ? (
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{collection.title}</h1>
                <p className="text-zinc-400 mb-4">{collection.description}</p>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>by {collection.owner_profile?.display_name || 'Unknown'}</span>
                  <span>{items.length} items</span>
                  {!collection.is_public && <span className="text-yellow-600">Private</span>}
                </div>
              </div>

              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit size={18} />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteCollection}
                    className="btn-secondary text-red-400 hover:bg-red-600/10"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Collection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-field resize-none h-24"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_public"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600"
                />
                <label htmlFor="edit_is_public" className="text-sm text-zinc-300">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editTitle.trim()}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Items Section */}
        {isOwner && (
          <div className="mb-8">
            {!showAddItems ? (
              <button
                onClick={() => setShowAddItems(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Add Items
              </button>
            ) : (
              <div className="bg-zinc-900 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Add Items to Collection</h3>
                  <button
                    onClick={() => {
                      setShowAddItems(false);
                      setSearchQuery('');
                      setAvailableMedia([]);
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search media items..."
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {searchLoading ? (
                  <p className="text-zinc-400">Searching...</p>
                ) : availableMedia.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableMedia.map((media) => {
                      const isAlreadyAdded = items.some((item) => item.media_id === media.id);
                      return (
                        <div
                          key={media.id}
                          className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          {media.image_url && (
                            <img
                              src={media.image_url}
                              alt={media.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{media.title}</p>
                            <p className="text-xs text-zinc-400">{media.type}</p>
                          </div>
                          <button
                            onClick={() => handleAddItem(media.id)}
                            disabled={isAlreadyAdded || addingMedia === media.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              isAlreadyAdded
                                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                : 'btn-primary'
                            }`}
                          >
                            {addingMedia === media.id
                              ? 'Adding...'
                              : isAlreadyAdded
                                ? 'Added'
                                : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : searchQuery ? (
                  <p className="text-zinc-400 text-center py-8">No media items found</p>
                ) : (
                  <p className="text-zinc-400 text-center py-8">
                    Start typing to search for media items
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Items Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Items ({items.length})</h2>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-lg">
              <p className="text-zinc-400">No items in this collection yet</p>
              {isOwner && (
                <button
                  onClick={() => setShowAddItems(true)}
                  className="btn-primary mt-4"
                >
                  Add your first item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card overflow-hidden group"
                >
                  <div className="aspect-video bg-zinc-800 overflow-hidden relative">
                    {item.media_items.image_url ? (
                      <img
                        src={item.media_items.image_url}
                        alt={item.media_items.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                        <span className="text-zinc-600 text-sm">
                          {item.media_items.type}
                        </span>
                      </div>
                    )}

                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(item.media_id)}
                        className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from collection"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {item.media_items.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">{item.media_items.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
