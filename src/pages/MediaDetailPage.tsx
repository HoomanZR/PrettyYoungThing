import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Star,
  Edit,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Save,
  MessageSquare,
  Link2,
  Tag,
  Calendar,
} from 'lucide-react';
import { supabase, MEDIA_TYPE_LABELS, PLATFORM_LABELS, type MediaItem, type MediaLink, type Genre, type Tag as TagType } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface LoadingState {
  item: boolean;
  genres: boolean;
  tags: boolean;
  links: boolean;
  favorite: boolean;
  rating: boolean;
  review: boolean;
  allReviews: boolean;
}

interface ExtractedReview {
  id: string;
  user_id: string;
  media_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<MediaItem | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [links, setLinks] = useState<MediaLink[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState<string>('');
  const [allReviews, setAllReviews] = useState<ExtractedReview[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    item: true,
    genres: true,
    tags: true,
    links: true,
    favorite: true,
    rating: true,
    review: true,
    allReviews: true,
  });
  const [saving, setSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    try {
      // Fetch media item with creator profile
      const { data: itemData, error: itemError } = await supabase
        .from('media_items')
        .select(`*, creator_profile:profiles!media_items_creator_fkey(display_name, avatar_url, role)`)
        .eq('id', id)
        .maybeSingle();

      if (itemError) throw itemError;

      if (!itemData) {
        setError('Media not found');
        setLoading(prev => ({ ...prev, item: false }));
        return;
      }

      setItem(itemData);
      setLoading(prev => ({ ...prev, item: false }));

      // Fetch genres
      const { data: genreRows, error: genreError } = await supabase
        .from('media_genres')
        .select('genres(id, name)')
        .eq('media_id', id);

      if (genreError) throw genreError;
      const extractedGenres = genreRows
        ?.map((row: any) => row.genres)
        .filter(Boolean) || [];
      setGenres(extractedGenres);
      setLoading(prev => ({ ...prev, genres: false }));

      // Fetch tags
      const { data: tagRows, error: tagError } = await supabase
        .from('media_tags')
        .select('tags(id, name)')
        .eq('media_id', id);

      if (tagError) throw tagError;
      const extractedTags = tagRows
        ?.map((row: any) => row.tags)
        .filter(Boolean) || [];
      setTags(extractedTags);
      setLoading(prev => ({ ...prev, tags: false }));

      // Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from('media_links')
        .select('*')
        .eq('media_id', id);

      if (linksError) throw linksError;
      setLinks(linksData || []);
      setLoading(prev => ({ ...prev, links: false }));

      // Fetch all reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, user_profile:profiles!reviews_user_id_fkey(display_name, avatar_url)')
        .eq('media_id', id);

      if (reviewsError) throw reviewsError;
      setAllReviews(reviewsData || []);
      setLoading(prev => ({ ...prev, allReviews: false }));

      // Fetch user-specific data only if logged in
      if (user?.id) {
        // Fetch favorite status
        const { data: favData } = await supabase
          .from('favorites')
          .select('id')
          .eq('media_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsFavorited(!!favData);
        setLoading(prev => ({ ...prev, favorite: false }));

        // Fetch user rating
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('id, score')
          .eq('media_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (ratingData) {
          setRating(ratingData.score);
        }
        setLoading(prev => ({ ...prev, rating: false }));

        // Fetch user review
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('id, content')
          .eq('media_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (reviewData) {
          setReview(reviewData.content || '');
        }
        setLoading(prev => ({ ...prev, review: false }));
      } else {
        setLoading(prev => ({
          ...prev,
          favorite: false,
          rating: false,
          review: false,
        }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load media details');
    }
  };

  const handleToggleFavorite = async () => {
    if (!user?.id || !id) return;

    setSaving(true);
    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('media_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('favorites').insert({
          media_id: id,
          user_id: user.id,
        });
      }
      setIsFavorited(!isFavorited);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSetRating = async (score: number) => {
    if (!user?.id || !id) return;

    setSaving(true);
    try {
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('media_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRating) {
        await supabase
          .from('ratings')
          .update({ score })
          .eq('id', existingRating.id);
      } else {
        await supabase.from('ratings').insert({
          media_id: id,
          user_id: user.id,
          score,
        });
      }
      setRating(score);
    } catch (err) {
      console.error('Error setting rating:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReview = async () => {
    if (!user?.id || !id) return;

    setReviewSaving(true);
    try {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('media_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingReview) {
        await supabase
          .from('reviews')
          .update({ content: review })
          .eq('id', existingReview.id);
      } else {
        await supabase.from('reviews').insert({
          media_id: id,
          user_id: user.id,
          content: review,
        });
      }
    } catch (err) {
      console.error('Error saving review:', err);
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!item || !id) return;

    setSaving(true);
    try {
      await supabase.from('media_items').delete().eq('id', id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting media:', err);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const { profile } = useAuth();

  const isCreatorOrAdmin =
    user?.id === item?.creator ||
    profile?.role === 'admin';

  if (error === 'Media not found') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-vault-400 hover:text-vault-300 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold mb-4">Media not found</h1>
            <p className="text-zinc-400 mb-6">
              The media item you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-vault-600 hover:bg-vault-700 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = Object.values(loading).some(v => v);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-vault-400 hover:text-vault-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        {isLoading && !item ? (
          <div className="h-96 bg-gradient-to-b from-zinc-800 to-zinc-900" />
        ) : item ? (
          <div className="h-96 relative">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-vault-800 to-zinc-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ) : null}

        {/* Title Overlay */}
        {item && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end gap-6">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-32 h-48 rounded-lg object-cover shadow-2xl"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{item.title}</h1>
                    <span
                      className={`badge-${item.type} px-3 py-1 rounded-full text-sm font-semibold`}
                    >
                      {MEDIA_TYPE_LABELS[item.type]}
                    </span>
                  </div>
                  {item.creator_profile && (
                    <p className="text-zinc-300">
                      By{' '}
                      <span className="font-semibold">
                        {(item.creator_profile as any).display_name}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {item && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Description</h2>
                <p className="text-zinc-300 leading-relaxed">
                  {item.description || 'No description available.'}
                </p>
              </div>
            )}

            {/* Genres and Tags */}
            {(genres.length > 0 || tags.length > 0) && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Details</h2>
                <div className="space-y-4">
                  {genres.length > 0 && (
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {genres.map(genre => (
                          <span
                            key={genre.id}
                            className="px-3 py-1 rounded-full text-sm bg-zinc-800 text-zinc-300"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-3 py-1 rounded-full text-sm bg-vault-900/30 text-vault-400 flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Links */}
            {links.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Link2 className="w-6 h-6" />
                  Links
                </h2>
                <div className="flex flex-wrap gap-3">
                  {links.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-2"
                    >
                      <span>
                        {PLATFORM_LABELS[link.platform] || link.platform}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Reviews ({allReviews.length})
              </h2>
              {allReviews.length === 0 ? (
                <p className="text-zinc-400">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {allReviews.map(rev => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {rev.user_profile?.avatar_url && (
                          <img
                            src={rev.user_profile.avatar_url}
                            alt={rev.user_profile.display_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">
                            {rev.user_profile?.display_name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-zinc-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(rev.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-zinc-300">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6 space-y-6 sticky top-20">
              {/* Favorite Button */}
              {user && (
                <button
                  onClick={handleToggleFavorite}
                  disabled={saving}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                    isFavorited
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`}
                  />
                  {isFavorited ? 'Favorited' : 'Add to Favorites'}
                </button>
              )}

              {/* Rating */}
              {user && (
                <div>
                  <p className="text-sm text-zinc-400 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Your Rating
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <button
                        key={num}
                        onClick={() => handleSetRating(num)}
                        disabled={saving}
                        className={`flex-1 min-w-8 h-8 rounded text-sm font-semibold transition ${
                          rating && rating >= num
                            ? 'bg-vault-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Notes */}
              {user && (
                <div>
                  <p className="text-sm text-zinc-400 mb-3">Personal Notes</p>
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Write your thoughts about this media..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-vault-500"
                  />
                  <button
                    onClick={handleSaveReview}
                    disabled={reviewSaving}
                    className="w-full mt-2 py-2 rounded-lg bg-vault-600 hover:bg-vault-700 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {reviewSaving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              )}

              {/* Edit/Delete Buttons */}
              {isCreatorOrAdmin && (
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <button
                    onClick={() => navigate(`/media/${id}/edit`)}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Media
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Media
                  </button>
                </div>
              )}

              {!user && (
                <p className="text-sm text-zinc-400 text-center">
                  Sign in to interact with this media
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-sm w-full border border-zinc-800">
            <h2 className="text-2xl font-bold mb-4">Delete Media</h2>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete "{item?.title}"? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMedia}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
