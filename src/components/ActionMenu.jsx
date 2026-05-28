import { useState, useRef, useEffect } from 'react';
import { HiDotsVertical } from 'react-icons/hi';

export default function ActionMenu({ options }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 rounded-full hover:bg-surface-200 text-surface-500 focus:outline-none flex items-center justify-center"
        type="button"
      >
        <HiDotsVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-surface-200 py-1 flex flex-col">
          {options.map((opt, idx) => {
            if (opt.divider) return <div key={idx} className="border-t border-surface-100 my-1" />;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  opt.onClick();
                }}
                className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-surface-50 ${opt.danger ? 'text-red-600 hover:text-red-700' : 'text-surface-700'}`}
              >
                {opt.icon && <span className="mr-2.5">{opt.icon}</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
