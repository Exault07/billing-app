import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  HiOutlineChevronRight,
  HiOutlineUserCircle,
  HiOutlineBriefcase,
} from 'react-icons/hi';

// ──────────────────────────────────────────────────
//  Grouped Navigation items
// ──────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/',
    icon: HiOutlineHome,
    roles: ['owner', 'staff', 'accountant'],
    type: 'link',
  },
  {
    label: 'Sales',
    icon: HiOutlineCurrencyRupee,
    roles: ['owner', 'staff', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Sale Invoice', path: '/sales/invoices', roles: ['owner', 'staff'] },
      { label: 'Payment In', path: '/sales/payment-in', roles: ['owner', 'staff', 'accountant'] },
      { label: 'Sale Return (Credit Note)', path: '/sales/return', roles: ['owner', 'staff'] },
      { label: 'Quotation / Estimate', path: '/quotations/history', roles: ['owner', 'staff'] },
      { label: 'Proforma Invoice', path: '/sales/proforma', roles: ['owner', 'staff'] },
      { label: 'Delivery Challan', path: '/challan/new', roles: ['owner', 'staff'] },
      { label: 'POS Billing', path: '/sales/pos', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Purchase',
    icon: HiOutlineShoppingCart,
    roles: ['owner', 'staff', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Purchase Invoices', path: '/purchases', roles: ['owner', 'staff'] },
      { label: 'Purchase Orders', path: '/purchases/orders', roles: ['owner', 'staff'] },
      { label: 'Purchase Returns', path: '/purchases/returns', roles: ['owner', 'staff'] },
      { label: 'Payment Out', path: '/purchases/payment-out', roles: ['owner', 'accountant'] },
    ],
  },
  {
    label: 'Parties',
    icon: HiOutlineUserGroup,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Customers', path: '/customers', roles: ['owner', 'staff'] },
      { label: 'Suppliers', path: '/suppliers', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Items (Inventory)',
    icon: HiOutlineCube,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Items List', path: '/inventory', roles: ['owner', 'staff'] },
      { label: 'Item Categories', path: '/inventory/categories', roles: ['owner', 'staff'] },
      { label: 'Inventory (Stock)', path: '/inventory/stock', roles: ['owner', 'staff'] },
      { label: 'Godown Management', path: '/inventory/godowns', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Expenses',
    icon: HiOutlineCurrencyRupee,
    roles: ['owner', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Expenses', path: '/expenses', roles: ['owner', 'accountant'] },
      { label: 'Add Expense', path: '/expenses/new', roles: ['owner', 'accountant'] },
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
  {
    label: 'Workers / Carpenters',
    icon: HiOutlineBriefcase,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Worker Dashboard', path: '/carpenters', roles: ['owner', 'staff'] },
      { label: 'Add Worker', path: '/carpenters/new', roles: ['owner', 'staff'] },
    ],
  },
  {
    label: 'Reports (25+)',
    path: '/reports',
    icon: HiOutlineChartBar,
    roles: ['owner', 'accountant'],
    type: 'link',
  },
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
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Filter items based on role
  const visibleItems = role
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : NAV_ITEMS.filter((item) => item.roles.includes('staff'));

  const linkBaseClass =
    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-default w-full';
  const linkActiveClass =
    'bg-primary-500 text-white shadow-md shadow-primary-500/25';
  const linkInactiveClass =
    'text-surface-600 hover:text-surface-900 hover:bg-surface-100';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[260px] bg-white border-r border-surface-200
          flex flex-col shadow-sidebar
          transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:z-auto md:flex
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ── Brand Header ──────────────────────── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-surface-800 leading-tight">
                BillDesk
              </h2>
              <p className="text-[10px] text-surface-400 font-medium uppercase tracking-wider">
                Furniture & Hardware
              </p>
            </div>
          </div>
          <button
            id="sidebar-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-default lg:hidden"
            aria-label="Close sidebar"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation Links ──────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {visibleItems.map((item) => {
            if (item.type === 'link') {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            if (item.type === 'group') {
              const isGroupOpen = openGroups[item.label] !== false; // Default open or toggled state
              // Filter sub-items based on role
              const subItems = role
                ? item.subItems.filter((sub) => sub.roles.includes(role))
                : item.subItems.filter((sub) => sub.roles.includes('staff'));

              if (subItems.length === 0) return null;

              // Check if any child route is active
              const isChildActive = subItems.some((sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-default
                      ${isChildActive && !isGroupOpen ? 'text-primary-600 bg-primary-50' : 'text-surface-600 hover:bg-surface-100'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isChildActive ? 'text-primary-500' : ''}`} />
                      <span className={isChildActive ? 'text-primary-700 font-semibold' : ''}>{item.label}</span>
                    </div>
                    {isGroupOpen ? (
                      <HiOutlineChevronDown className="w-4 h-4 text-surface-400" />
                    ) : (
                      <HiOutlineChevronRight className="w-4 h-4 text-surface-400" />
                    )}
                  </button>

                  {/* Sub-items list */}
                  {isGroupOpen && (
                    <div className="pl-11 pr-2 py-1 space-y-1 animate-fade-in">
                      {subItems.map((sub) => (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 font-semibold'
                                : 'text-surface-500 hover:text-surface-800 hover:bg-surface-100'
                            }`
                          }
                        >
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* ── Sidebar Footer ───────────────────── */}
        <div className="px-4 py-4 border-t border-surface-200 flex-shrink-0">
          <div className="bg-surface-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-surface-600">BillDesk Premium</p>
              {role && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 capitalize">
                  {role}
                </span>
              )}
            </div>
            <p className="text-[10px] text-surface-400 mt-0.5">
              © 2026 All rights reserved
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
