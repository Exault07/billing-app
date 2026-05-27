import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineCube,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineX,
  HiOutlineCurrencyRupee,
  HiOutlineShoppingCart,
  HiOutlineChevronDown,
  HiOutlineUserCircle,
  HiOutlineBriefcase,
  HiOutlinePlus
} from 'react-icons/hi';

const NAV_ITEMS = [
  { type: 'header', label: 'GENERAL', roles: ['owner', 'staff', 'accountant'] },
  {
    label: 'Dashboard',
    path: '/',
    icon: HiOutlineHome,
    roles: ['owner', 'staff', 'accountant'],
    type: 'link',
  },
  {
    label: 'Sales',
    path: '/billing',
    icon: HiOutlineCurrencyRupee,
    roles: ['owner', 'staff', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Sale Invoices', path: '/billing', roles: ['owner', 'staff'] },
      { label: 'Quotations', path: '/billing/quotations', roles: ['owner', 'staff'] },
      { label: 'Proforma Invoice', path: '/billing/proforma', roles: ['owner', 'staff'] },
      { label: 'Delivery Challan', path: '/billing/challan', roles: ['owner', 'staff'] },
      { label: 'POS Billing', path: '/billing/pos', roles: ['owner', 'staff'] },
      { label: 'Sale Returns', path: '/sales/returns', roles: ['owner', 'staff'] },
      { label: 'Payment In', path: '/billing/payment-in', roles: ['owner', 'staff', 'accountant'] },
    ],
  },
  {
    label: 'Purchase',
    path: '/purchase',
    icon: HiOutlineShoppingCart,
    roles: ['owner', 'staff', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Purchase Invoices', path: '/purchase', roles: ['owner', 'staff'] },
      { label: 'Purchase Orders', path: '/purchase/orders', roles: ['owner', 'staff'] },
      { label: 'Purchase Returns', path: '/purchase/returns', roles: ['owner', 'staff'] },
      { label: 'Payment Out', path: '/purchase/payment-out', roles: ['owner', 'accountant'] },
    ],
  },
  {
    label: 'Parties',
    path: '/parties',
    icon: HiOutlineUserGroup,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'All Parties', path: '/parties', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Items',
    path: '/inventory',
    icon: HiOutlineCube,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Stocks', path: '/inventory', roles: ['owner', 'staff'] },
      { label: 'Godown', path: '/inventory/godown', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Expenses',
    path: '/expenses',
    icon: HiOutlineCurrencyRupee,
    roles: ['owner', 'accountant'],
    type: 'link',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: HiOutlineChartBar,
    roles: ['owner', 'accountant'],
    type: 'link',
  },

  { type: 'header', label: 'INTERNAL', roles: ['owner', 'staff', 'accountant'] },
  {
    label: 'Workers / Carpenters',
    icon: HiOutlineBriefcase,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Carpenter List', path: '/carpenters', roles: ['owner', 'staff'] },
      { label: 'Add Job', path: '/carpenters/job/new', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Staff',
    icon: HiOutlineUserCircle,
    roles: ['owner', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Staff List', path: '/staff', roles: ['owner'] },
      { label: 'Attendance', path: '/staff/attendance', roles: ['owner'] },
      { label: 'Payroll', path: '/staff/payroll', roles: ['owner', 'accountant'] },
    ],
  },

  { type: 'header', label: 'SETTINGS', roles: ['owner', 'staff', 'accountant'] },
  {
    label: 'Settings',
    path: '/settings',
    icon: HiOutlineCog,
    roles: ['owner', 'staff'],
    type: 'link',
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('BillDesk');

  // Initialize activeGroup based purely on active route on mount
  const [activeGroup, setActiveGroup] = useState(() => {
    let initial = null;
    NAV_ITEMS.forEach((item) => {
      if (item.type === 'group' && item.subItems) {
        const isActive = item.subItems.some((sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
        if (isActive) initial = item.label;
      }
    });
    return initial;
  });

  // Keep active group in sync with location (so navigating to Sales auto-opens Sales)
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.type === 'group' && item.subItems) {
        const isActive = item.subItems.some((sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
        if (isActive) {
          setActiveGroup(prev => prev !== item.label ? item.label : prev);
        }
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    supabase.from('shop_settings').select('shop_name').limit(1).maybeSingle().then(({ data }) => {
      if (data && data.shop_name) setShopName(data.shop_name);
    });
  }, []);

  const handleGroupClick = (item) => {
    // If it's already active, don't close it according to requirements
    if (activeGroup !== item.label) {
      setActiveGroup(item.label);
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const checkIsActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Filter items based on role
  const visibleItems = role
    ? NAV_ITEMS.filter((item) => {
        if (!item.roles) return true; // Headers might not have roles strictly defined if handled above
        return item.roles.includes(role);
      })
    : NAV_ITEMS.filter((item) => item.roles?.includes('staff'));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-surface-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* â”€â”€ Brand Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-surface-800 leading-tight">
                {shopName}
              </h2>
              <p className="text-[10px] text-surface-400 font-medium uppercase tracking-wider">
                Billing System
              </p>
            </div>
          </div>
          <button
            id="sidebar-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* â”€â”€ Create Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="px-4 py-4 flex-shrink-0">
          <button 
            onClick={() => navigate('/billing/new')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
          >
            <HiOutlinePlus className="w-4 h-4" />
            + Create Sales Invoice
          </button>
        </div>

        {/* â”€â”€ Navigation Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-0 scrollbar-thin space-y-1">
          {visibleItems.map((item, index) => {
            if (item.type === 'header') {
              return (
                <div key={`header-${index}`} className="text-xs uppercase text-gray-400 tracking-wider mt-4 mb-1 px-3 font-semibold">
                  {item.label}
                </div>
              );
            }

            if (item.type === 'link') {
              const isActive = checkIsActive(item.path);
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900 dark:text-white'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-blue-600 dark:text-white' : 'text-surface-400 group-hover:text-surface-600'
                    }`}
                  />
                  <span className="text-[14px] leading-tight truncate">{item.label}</span>
                </NavLink>
              );
            }

            if (item.type === 'group') {
              const isOpenGroup = activeGroup === item.label;
              // Check if parent group path or any subitem is active
              const isGroupActive = item.path ? checkIsActive(item.path) : false;
              const isAnySubActive = item.subItems.some((sub) => checkIsActive(sub.path));
              const isParentActive = isGroupActive || isAnySubActive;

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    onClick={() => handleGroupClick(item)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                      isParentActive && !isOpenGroup
                        ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900 dark:text-white' // highlight parent if active and closed
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors ${
                          (isParentActive && activeGroup !== item.label) ? 'text-blue-600 dark:text-white' : 'text-surface-400 group-hover:text-surface-600'
                        }`}
                      />
                      <span className="text-[14px] leading-tight truncate">{item.label}</span>
                    </div>
                      <HiOutlineChevronDown
                        className={`w-4 h-4 ml-auto transition-transform duration-300 ${
                          activeGroup === item.label ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-surface-400'
                        }`}
                      />
                  </button>

                  {/* Dropdown Items */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      activeGroup === item.label ? 'max-h-96 opacity-100 mb-2' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="flex flex-col gap-1 pl-11 pr-2 pb-1 border-l-2 border-surface-100 ml-5">
                      {item.subItems.map((sub) => {
                        // Filter subItems based on role
                        if (role && sub.roles && !sub.roles.includes(role)) return null;

                        const isSubActive = checkIsActive(sub.path);
                        return (
                          <NavLink
                            key={sub.label}
                            to={sub.path}
                            onClick={() => window.innerWidth < 1024 && onClose()}
                            className={`px-3 py-2 rounded-lg text-[13px] transition-colors truncate ${
                              isSubActive
                                ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900 dark:text-white'
                                : 'text-surface-500 hover:text-surface-900 hover:bg-surface-50'
                            }`}
                          >
                            {sub.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* â”€â”€ Sidebar Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="px-4 py-4 border-t border-surface-200 flex-shrink-0">
          <div className="bg-surface-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-surface-600 truncate mr-2">{shopName} Premium</p>
              {role && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 capitalize">
                  {role}
                </span>
              )}
            </div>
            <p className="text-[10px] text-surface-400 mt-0.5">
              Â© 2026 All rights reserved
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
