import { Link } from 'react-router-dom';
import { HiOutlineShieldExclamation } from 'react-icons/hi';

export default function Unauthorized() {
 return (
 <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-slide-up">
 <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
 <HiOutlineShieldExclamation className="w-8 h-8 text-red-500" />
 </div>
 <h1 className="text-xl font-bold text-surface-800 mb-2">Access Denied</h1>
 <p className="text-surface-400 mb-6 max-w-sm">
 You don't have permission to view this page. Contact the Owner if you believe this is an error.
 </p>
 <Link
 to="/"
 className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-default shadow-md shadow-primary-500/25"
 >
 Go to Dashboard
 </Link>
 </div>
 );
}
