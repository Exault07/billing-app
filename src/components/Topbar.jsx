import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMenuAlt2, HiOutlineBell, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';

export default function Topbar({ onToggleSidebar }) {
  const { user, role, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const roleLabels = {
    owner: 'Owner',
    staff: 'Staff',
    accountant: 'Accountant',
  };

  const roleBadgeColors = {
    owner: 'bg-amber-100 text-amber-800',
    staff: 'bg-blue-100 text-blue-800',
    accountant: 'bg-emerald-100 text-emerald-800',
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-surface-200 shadow-sm">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-default lg:hidden"
          aria-label="Toggle sidebar"
        >
          <HiOutlineMenuAlt2 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-surface-800 hidden sm:block">
          Furniture & Hardware Billing
        </h1>
        <h1 className="text-lg font-semibold text-surface-800 sm:hidden">
          Billing
        </h1>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-default"
          aria-label="Notifications"
        >
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 pl-3 rounded-xl hover:bg-surface-50 transition-default border border-transparent hover:border-surface-200"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-surface-700 leading-tight">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${roleBadgeColors[role] || 'bg-surface-100 text-surface-600'}`}>
                {roleLabels[role] || role}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-1 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-surface-100">
                  <p className="text-sm font-medium text-surface-800">{user?.email}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Role: {roleLabels[role] || role}
                  </p>
                </div>
                <button
                  id="profile-link"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-default"
                  onClick={() => setShowUserMenu(false)}
                >
                  <HiOutlineUser className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  id="logout-btn"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-default"
                  onClick={handleLogout}
                >
                  <HiOutlineLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
