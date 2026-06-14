import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Vault } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="bg-gradient-to-br from-vault-600 to-blue-600 p-3 rounded-full">
            <Vault size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-100">MediaVault</h1>
          <p className="text-zinc-400 text-sm">Your premium media collection</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Sign In</h2>
            <p className="text-zinc-400 text-sm">Access your media library</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-zinc-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-zinc-500" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field pl-10 w-full"
                  required
                  disabled={loading}
                />
              </div>
              {error && error.toLowerCase().includes('email') && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-zinc-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-zinc-500" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-10 w-full"
                  required
                  disabled={loading}
                />
              </div>
              {error && error.toLowerCase().includes('password') && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* General Error */}
            {error && !error.toLowerCase().includes('email') && !error.toLowerCase().includes('password') && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Signup Link */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm text-center mb-4">
              Don't have an account?
            </p>
            <Link
              to="/signup"
              className="block w-full text-center py-3 border border-zinc-700 rounded-lg text-zinc-300 font-medium hover:bg-zinc-800 transition-colors duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-xs text-center mt-8">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};
