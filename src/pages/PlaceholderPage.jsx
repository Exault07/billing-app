import { HiOutlineClock } from 'react-icons/hi';

/**
 * Generic placeholder for pages that will be built in future parts.
 */
export default function PlaceholderPage({ title, part }) {
 return (
 <div className="min-h-[50vh] flex flex-col items-center justify-center text-center animate-slide-up">
 <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
 <HiOutlineClock className="w-7 h-7 text-primary-500" />
 </div>
 <h1 className="text-2xl font-bold text-surface-800 mb-2">{title}</h1>
 <p className="text-surface-400 max-w-sm">
 This page will be built in <span className="font-semibold text-primary-500">Part {part}</span>. 
 Stay tuned!
 </p>
 </div>
 );
}
