import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:pl-56 bg-slate-50">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col min-h-0">
          <div className="max-w-7xl mx-auto animate-fade-in w-full flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
