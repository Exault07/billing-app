import React from 'react';
import { useBlocker } from 'react-router-dom';
import { HiOutlineExclamation } from 'react-icons/hi';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';

export default function NavigationBlocker() {
  const { isDirty } = useUnsavedChanges();

  // The blocker hook provided by react-router-dom v6
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  if (blocker.state === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up relative">
          <div className="bg-amber-50 p-6 flex flex-col items-center border-b border-amber-100">
             <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <HiOutlineExclamation className="w-8 h-8 text-amber-600" />
             </div>
             <h2 className="text-xl font-bold text-surface-800 text-center">Unsaved Changes</h2>
          </div>
          <div className="p-6 text-center text-surface-600 text-[13px] leading-relaxed">
             <p>You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.</p>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={() => blocker.reset()}
              className="flex-1 py-2 px-4 rounded-xl border border-surface-200 text-surface-700 font-bold hover:bg-surface-50 transition-colors text-[13px]"
            >
              Cancel
            </button>
            <button
              onClick={() => blocker.proceed()}
              className="flex-1 py-2 px-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30 text-[13px]"
            >
              Leave Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
