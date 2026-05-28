import { Link } from 'react-router-dom';
import { HiOutlineEmojiSad } from 'react-icons/hi';

export default function NotFound() {
 return (
 <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-slide-up">
 <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
 <HiOutlineEmojiSad className="w-8 h-8 text-surface-400" />
 </div>
 <h1 className="text-5xl font-extrabold text-surface-800 mb-2">404</h1>
 <p className="text-surface-400 mb-6">Page not found. It may have been moved or doesn't exist.</p>
 <Link
 to="/"
 className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-default shadow-md shadow-primary-500/25"
 >
 Back to Dashboard
 </Link>
 </div>
 );
}
