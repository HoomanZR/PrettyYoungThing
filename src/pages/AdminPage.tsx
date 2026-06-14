import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Key,
  Copy,
  Trash2,
  Edit,
  Plus,
  Check,
  UserCog,
  Film,
} from 'lucide-react';
import {
  supabase,
  MEDIA_TYPE_LABELS,
  type Profile,
  type MediaItem,
  type InviteCode,
} from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type TabType = 'codes' | 'users' | 'media';

interface InviteCodeWithStatus extends InviteCode {
  status: 'active' | 'expired' | 'maxed';
}

interface MediaItemWithCreator extends MediaItem {
  creator_profile?: Profile;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('codes');
  const [, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Invite Codes State
  const [codes, setCodes] = useState<InviteCodeWithStatus[]>([]);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  // Users State
  const [users, setUsers] = useState<Profile[]>([]);
  const [updatingUserRoles, setUpdatingUserRoles] = useState<Set<string>>(
    new Set()
  );

  // Media State
  const [mediaItems, setMediaItems] = useState<MediaItemWithCreator[]>([]);
  const [deletingMedia, setDeletingMedia] = useState<Set<string>>(new Set());

  // Check if user is admin
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 flex justify-center">
            <Shield className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You do not have permission to access the admin panel. Only administrators can view this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Fetch invite codes
  const fetchCodes = async () => {
    try {
      const { data } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const withStatus = data.map(code => {
          let status: 'active' | 'expired' | 'maxed' = 'active';

          if (code.expires_at && new Date(code.expires_at) < new Date()) {
            status = 'expired';
          } else if (code.use_count >= code.max_uses) {
            status = 'maxed';
          }

          return { ...code, status };
        });

        setCodes(withStatus);
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch media items
  const fetchMedia = async () => {
    try {
      const { data } = await supabase
        .from('media_items')
        .select(
          `*, creator_profile:profiles!media_items_creator_fkey(display_name)`
        )
        .order('created_at', { ascending: false });

      if (data) {
        setMediaItems(data);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  // Initial data load and tab switching
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'codes') {
          await fetchCodes();
        } else if (activeTab === 'users') {
          await fetchUsers();
        } else if (activeTab === 'media') {
          await fetchMedia();
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Generate new invite code
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingCode(true);

    try {
      const code = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      const expiresAtValue = expiresAt ? new Date(expiresAt).toISOString() : null;

      const { error } = await supabase.from('invite_codes').insert({
        code,
        created_by: user!.id,
        max_uses: maxUses,
        expires_at: expiresAtValue,
      });

      if (error) {
        console.error('Error generating code:', error);
      } else {
        setMaxUses(1);
        setExpiresAt('');
        await fetchCodes();
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Error copying code:', error);
    }
  };

  // Delete invite code
  const handleDeleteCode = async (codeId: string) => {
    if (!window.confirm('Are you sure you want to delete this invite code?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('Error deleting code:', error);
      } else {
        await fetchCodes();
      }
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  // Update user role
  const handleUpdateUserRole = async (
    userId: string,
    currentRole: string
  ) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    setUpdatingUserRoles(prev => new Set([...prev, userId]));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
      } else {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setUpdatingUserRoles(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  // Delete media item
  const handleDeleteMedia = async (mediaId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this media item? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingMedia(prev => new Set([...prev, mediaId]));

    try {
      const { error } = await supabase
        .from('media_items')
        .delete()
        .eq('id', mediaId);

      if (error) {
        console.error('Error deleting media:', error);
      } else {
        await fetchMedia();
      }
    } catch (error) {
      console.error('Error deleting media:', error);
    } finally {
      setDeletingMedia(prev => {
        const updated = new Set(prev);
        updated.delete(mediaId);
        return updated;
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'maxed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-vault-500" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-8 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('codes')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'codes'
                  ? 'text-vault-500 border-b-2 border-vault-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Key className="w-4 h-4" />
              Invite Codes
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'text-vault-500 border-b-2 border-vault-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Manage Users
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'media'
                  ? 'text-vault-500 border-b-2 border-vault-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Film className="w-4 h-4" />
              Manage Media
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Invite Codes Section */}
        {activeTab === 'codes' && (
          <div className="space-y-8">
            {/* Generate New Code Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-vault-500" />
                Generate New Invite Code
              </h2>

              <form onSubmit={handleGenerateCode} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expires At (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generatingCode}
                  className="btn-primary w-full"
                >
                  {generatingCode ? 'Generating...' : 'Generate Code'}
                </button>
              </form>
            </div>

            {/* Existing Codes List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Key className="w-5 h-5 text-vault-500" />
                  Existing Invite Codes ({codes.length})
                </h2>
              </div>

              {codes.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  No invite codes created yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-800/50">
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Uses
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Expires
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((code, idx) => (
                        <tr
                          key={code.id}
                          className={`border-b border-zinc-800 ${
                            idx % 2 === 0
                              ? 'bg-zinc-900'
                              : 'bg-zinc-800/50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <code className="font-mono font-bold text-vault-400">
                              {code.code}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                                code.status
                              )}`}
                            >
                              {code.status === 'maxed'
                                ? 'Used Up'
                                : code.status.charAt(0).toUpperCase() +
                                  code.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {code.use_count} / {code.max_uses}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(code.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {code.expires_at
                              ? new Date(code.expires_at).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopyCode(code.code)}
                                className="btn-secondary p-2 rounded-lg"
                                title="Copy code"
                              >
                                {copiedCode === code.code ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteCode(code.id)}
                                className="btn-danger p-2 rounded-lg"
                                title="Delete code"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeTab === 'users' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-vault-500" />
                All Users ({users.length})
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/50">
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`border-b border-zinc-800 ${
                          idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${getAvatarColor(
                                u.display_name
                              )} flex items-center justify-center font-bold text-white`}
                            >
                              {u.display_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">
                              {u.display_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {/* Email not in profile, would need to add */}
                          —
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}
                          >
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              handleUpdateUserRole(u.id, u.role)
                            }
                            disabled={updatingUserRoles.has(u.id)}
                            className={`btn-secondary px-3 py-1 rounded-lg text-sm flex items-center gap-2 ${
                              updatingUserRoles.has(u.id)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                          >
                            <UserCog className="w-4 h-4" />
                            {updatingUserRoles.has(u.id)
                              ? 'Updating...'
                              : u.role === 'admin'
                              ? 'Demote'
                              : 'Promote'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Media Section */}
        {activeTab === 'media' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Film className="w-5 h-5 text-vault-500" />
                All Media Items ({mediaItems.length})
              </h2>
            </div>

            {mediaItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No media items found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/50">
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Creator
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b border-zinc-800 ${
                          idx % 2 === 0
                            ? 'bg-zinc-900'
                            : 'bg-zinc-800/50'
                        }`}
                      >
                        <td className="px-6 py-4 font-medium">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 rounded-md bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            {MEDIA_TYPE_LABELS[item.type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {item.creator_profile?.display_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                navigate(`/media/${item.id}/edit`)
                              }
                              className="btn-secondary p-2 rounded-lg"
                              title="Edit media"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedia(item.id)}
                              disabled={deletingMedia.has(item.id)}
                              className={`btn-danger p-2 rounded-lg ${
                                deletingMedia.has(item.id)
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                              title="Delete media"
                            >
                              {deletingMedia.has(item.id) ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
