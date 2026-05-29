import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiSparkles } from 'react-icons/hi';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('Welcome Back');

  useEffect(() => {
    supabase.from('shop_settings').select('shop_name').limit(1).maybeSingle().then(({ data }) => {
      if (data && data.shop_name) setShopName(data.shop_name);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-surface-50 font-sans">
      
      {/* Left Banner (Brand side) */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-indigo-700 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <HiSparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">BillDesk</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            The smart way to manage your business.
          </h1>
          <p className="text-indigo-100 text-lg">
            Beautiful invoicing, intelligent inventory, and powerful analytics. All in one place.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-${300 + i*100} flex items-center justify-center text-white font-bold text-xs`}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <div className="text-indigo-200 text-sm font-medium">
            Join 10,000+ businesses
          </div>
        </div>
      </div>

      {/* Right Login Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md animate-fade-in relative z-10">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 mb-2">{shopName}</h2>
            <p className="text-slate-500 font-medium">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-600 animate-slide-up flex items-start gap-3">
              <HiOutlineLockClosed className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="group">
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <HiOutlineMail className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                  Password
                </label>
                <a href="#" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Forgot password?</a>
              </div>
              <div className="relative flex items-center">
                <HiOutlineLockClosed className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
