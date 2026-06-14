import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, KeyRound, Vault } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const { signUp } = useAuth();

  const checkPasswordStrength = (pass: string) => {
    if (!pass) {
      setPasswordStrength(null);
      return;
    }
    if (pass.length < 8) {
      setPasswordStrength('weak');
    } else if (pass.length < 12 || !(/[A-Z]/.test(pass) && /[0-9]/.test(pass))) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signUp(email, password, displayName, inviteCode);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return 'bg-red-500/20 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'strong':
        return 'bg-green-500/20 border-green-500/30';
      default:
        return '';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'weak':
        return 'Weak password';
      case 'medium':
        return 'Medium strength';
      case 'strong':
        return 'Strong password';
      default:
        return '';
    }
  };

  const getStrengthTextColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'strong':
        return 'text-green-400';
      default:
        return '';
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

        {/* Signup Card */}
        <div className="card p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Create Account</h2>
            <p className="text-zinc-400 text-sm">Join MediaVault today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name Field */}
            <div>
              <label htmlFor="displayName" className="block text-zinc-300 text-sm font-medium mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-zinc-500" size={20} />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Choose your display name"
                  className="input-field pl-10 w-full"
                  required
                  disabled={loading}
                />
              </div>
            </div>

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
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  className="input-field pl-10 w-full"
                  required
                  disabled={loading}
                />
              </div>
              {passwordStrength && (
                <div className={`border rounded-lg p-3 mt-2 ${getStrengthColor()}`}>
                  <p className={`text-sm font-medium ${getStrengthTextColor()}`}>
                    {getStrengthText()}
                  </p>
                </div>
              )}
              {error && error.toLowerCase().includes('password') && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Invite Code Field */}
            <div>
              <label htmlFor="inviteCode" className="block text-zinc-300 text-sm font-medium mb-2">
                Invite Code <span className="text-zinc-500 text-xs">(not needed for first user)</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-zinc-500" size={20} />
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code if you have one"
                  className="input-field pl-10 w-full"
                  disabled={loading}
                />
              </div>
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm text-center mb-4">
              Already have an account?
            </p>
            <Link
              to="/login"
              className="block w-full text-center py-3 border border-zinc-700 rounded-lg text-zinc-300 font-medium hover:bg-zinc-800 transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-xs text-center mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
