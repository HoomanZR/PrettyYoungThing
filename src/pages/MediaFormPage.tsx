import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Link2, Image as ImageIcon, Calendar, Tag, Film, Save, Loader } from 'lucide-react';
import {
  supabase,
  MEDIA_TYPE_LABELS,
  PLATFORM_LABELS,
  type MediaType,
  type Genre,
  type Tag as TagType,
  type MediaLink,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface FormGenre {
  id?: string;
  name: string;
}

interface FormTag {
  id?: string;
  name: string;
}

interface FormLink extends Omit<MediaLink, 'id' | 'media_id'> {
  tempId?: string;
}

export default function MediaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editMode = !!id;

  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [type, setType] = useState<MediaType>('movie');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  // Genres and Tags
  const [genres, setGenres] = useState<FormGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');
  const [genreOptions, setGenreOptions] = useState<Genre[]>([]);

  const [tags, setTags] = useState<FormTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagOptions, setTagOptions] = useState<TagType[]>([]);

  // Links
  const [links, setLinks] = useState<FormLink[]>([]);

  // Fetch genres and tags on mount
  useEffect(() => {
    const fetchOptions = async () => {
      const [{ data: genreData }, { data: tagData }] = await Promise.all([
        supabase.from('genres').select('*'),
        supabase.from('tags').select('*'),
      ]);
      setGenreOptions(genreData || []);
      setTagOptions(tagData || []);
    };
    fetchOptions();
  }, []);

  // Fetch existing item if editing
  useEffect(() => {
    if (!editMode) {
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        // Fetch media item
        const { data: mediaData } = await supabase
          .from('media_items')
          .select('*')
          .eq('id', id)
          .single();

        if (!mediaData) {
          setError('Item not found');
          setLoading(false);
          return;
        }

        // Populate form fields
        setType(mediaData.type);
        setTitle(mediaData.title);
        setDescription(mediaData.description || '');
        setImageUrl(mediaData.image_url || '');
        setReleaseDate(mediaData.release_date || '');

        // Fetch genres
        const { data: genreData } = await supabase
          .from('media_genres')
          .select('genre_id, genres(id, name)')
          .eq('media_id', id);

        if (genreData) {
          const fetchedGenres: FormGenre[] = genreData
            .map((item: any) => ({
              id: item.genres.id,
              name: item.genres.name,
            }));
          setGenres(fetchedGenres);
          setSelectedGenreIds(fetchedGenres.map((g) => g.id!));
        }

        // Fetch tags
        const { data: tagData } = await supabase
          .from('media_tags')
          .select('tag_id, tags(id, name)')
          .eq('media_id', id);

        if (tagData) {
          const fetchedTags: FormTag[] = tagData
            .map((item: any) => ({
              id: item.tags.id,
              name: item.tags.name,
            }));
          setTags(fetchedTags);
          setSelectedTagIds(fetchedTags.map((t) => t.id!));
        }

        // Fetch links
        const { data: linkData } = await supabase
          .from('media_links')
          .select('*')
          .eq('media_id', id);

        if (linkData) {
          setLinks(linkData.map((link) => ({
            platform: link.platform,
            url: link.url,
            label: link.label,
          })));
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to load item');
        setLoading(false);
      }
    };

    fetchItem();
  }, [editMode, id]);

  // Genre filtering
  const filteredGenreOptions = genreOptions.filter(
    (g) => g.name.toLowerCase().includes(genreInput.toLowerCase()) &&
           !selectedGenreIds.includes(g.id)
  );

  // Tag filtering
  const filteredTagOptions = tagOptions.filter(
    (t) => t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
           !selectedTagIds.includes(t.id)
  );

  const handleAddGenre = (genre: Genre) => {
    setSelectedGenreIds([...selectedGenreIds, genre.id]);
    setGenres([...genres, { id: genre.id, name: genre.name }]);
    setGenreInput('');
  };

  const handleCreateGenre = async (name: string) => {
    if (!name.trim()) return;

    // Check if genre already exists
    const existing = genreOptions.find((g) => g.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      handleAddGenre(existing);
      return;
    }

    // Create new genre
    const { data } = await supabase
      .from('genres')
      .insert({ name })
      .select('*')
      .single();

    if (data) {
      setGenreOptions([...genreOptions, data]);
      setSelectedGenreIds([...selectedGenreIds, data.id]);
      setGenres([...genres, { id: data.id, name: data.name }]);
    }
    setGenreInput('');
  };

  const handleRemoveGenre = (genreId: string) => {
    setSelectedGenreIds(selectedGenreIds.filter((id) => id !== genreId));
    setGenres(genres.filter((g) => g.id !== genreId));
  };

  const handleAddTag = (tag: TagType) => {
    setSelectedTagIds([...selectedTagIds, tag.id]);
    setTags([...tags, { id: tag.id, name: tag.name }]);
    setTagInput('');
  };

  const handleCreateTag = async (name: string) => {
    if (!name.trim() || !user) return;

    // Check if tag already exists
    const existing = tagOptions.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      handleAddTag(existing);
      return;
    }

    // Create new tag
    const { data } = await supabase
      .from('tags')
      .insert({ name, created_by: user.id })
      .select('*')
      .single();

    if (data) {
      setTagOptions([...tagOptions, data]);
      setSelectedTagIds([...selectedTagIds, data.id]);
      setTags([...tags, { id: data.id, name: data.name }]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    setTags(tags.filter((t) => t.id !== tagId));
  };

  const addLink = () => {
    setLinks([...links, { platform: 'youtube', url: '', label: null, tempId: Date.now().toString() }]);
  };

  const removeLink = (tempId: string | undefined) => {
    setLinks(links.filter((l) => l.tempId !== tempId));
  };

  const updateLink = (tempId: string | undefined, field: keyof FormLink, value: any) => {
    setLinks(
      links.map((l) =>
        l.tempId === tempId ? { ...l, [field]: value } : l
      )
    );
  };

  const handleSave = async () => {
    if (!title.trim() || !user) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let mediaId = id;

      // 1. Upsert media item
      if (editMode) {
        await supabase
          .from('media_items')
          .update({
            type,
            title,
            description: description || null,
            image_url: imageUrl || null,
            release_date: releaseDate || null,
          })
          .eq('id', id);
      } else {
        const { data } = await supabase
          .from('media_items')
          .insert({
            type,
            title,
            description: description || null,
            image_url: imageUrl || null,
            release_date: releaseDate || null,
            creator: user.id,
          })
          .select('id')
          .single();

        if (!data) throw new Error('Failed to create media item');
        mediaId = data.id;
      }

      // 2. Sync genres
      await supabase.from('media_genres').delete().eq('media_id', mediaId);
      for (const genreId of selectedGenreIds) {
        await supabase.from('media_genres').insert({ media_id: mediaId, genre_id: genreId });
      }

      // 3. Sync tags
      await supabase.from('media_tags').delete().eq('media_id', mediaId);
      for (const tagId of selectedTagIds) {
        await supabase.from('media_tags').insert({ media_id: mediaId, tag_id: tagId });
      }

      // 4. Sync links
      await supabase.from('media_links').delete().eq('media_id', mediaId);
      for (const link of links) {
        if (link.url.trim()) {
          await supabase.from('media_links').insert({
            media_id: mediaId,
            platform: link.platform,
            url: link.url,
            label: link.label || null,
          });
        }
      }

      navigate(`/media/${mediaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-vault-500" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {editMode ? 'Edit Media' : 'Add New Media'}
          </h1>
          <p className="text-zinc-400">
            {editMode ? 'Update the details of your media item' : 'Create a new media item'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="card p-6 space-y-8">
          {/* Type Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Film className="w-4 h-4" />
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MediaType)}
              className="input-field"
            >
              {Object.entries(MEDIA_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              className="input-field"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Image URL Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input-field"
            />
            {imageUrl && (
              <div className="mt-4">
                <p className="text-xs text-zinc-400 mb-2">Preview:</p>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-32 h-48 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Release Date Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Release Date
            </label>
            <input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Genres Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Genres
            </label>
            <div className="relative mb-3">
              <input
                type="text"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateGenre(genreInput);
                  }
                }}
                placeholder="Type to search or create genre..."
                className="input-field"
              />
              {genreInput && filteredGenreOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg z-10">
                  {filteredGenreOptions.map((genre) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => handleAddGenre(genre)}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <div
                  key={genre.id}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                >
                  {genre.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveGenre(genre.id!)}
                    className="hover:text-zinc-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="relative mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag(tagInput);
                  }
                }}
                placeholder="Type to search or create tag..."
                className="input-field"
              />
              {tagInput && filteredTagOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg z-10">
                  {filteredTagOptions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-vault-900/30 text-vault-400 rounded-full text-sm"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id!)}
                    className="hover:text-vault-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* External Links Field */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                External Links
              </label>
              <button
                type="button"
                onClick={addLink}
                className="btn-secondary text-sm"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={link.tempId || index} className="flex gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(link.tempId, 'platform', e.target.value)}
                    className="input-field max-w-xs"
                  >
                    {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(link.tempId, 'url', e.target.value)}
                    placeholder="https://example.com"
                    className="input-field flex-1"
                  />
                  <input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => updateLink(link.tempId, 'label', e.target.value || null)}
                    placeholder="Label (optional)"
                    className="input-field max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(link.tempId)}
                    className="btn-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-zinc-800">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
