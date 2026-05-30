import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
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
  HiOutlinePlus,
  HiOutlineChevronRight,
  HiOutlineLogout
} from 'react-icons/hi';

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
    path: '/billing',
    icon: HiOutlineCurrencyRupee,
    roles: ['owner', 'staff', 'accountant'],
    type: 'group',
    subItems: [
      { label: 'Sale Invoices', path: '/billing', roles: ['owner', 'staff'] },
      { label: 'Quotations', path: '/billing/quotations', roles: ['owner', 'staff'] },

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
  { type: 'divider' },
  {
    label: 'Workers / Carpenters',
    icon: HiOutlineBriefcase,
    roles: ['owner', 'staff'],
    type: 'group',
    subItems: [
      { label: 'Carpenter List', path: '/carpenters', roles: ['owner', 'staff'] },
    ],
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
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('My Shop');
  const [shopPhone, setShopPhone] = useState('');

  const [activeGroup, setActiveGroup] = useState(() => {
    let initial = null;
    NAV_ITEMS.forEach((item) => {
      if (item.type === 'group' && item.subItems) {
        const isActive = item.subItems.some(
          (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/')
        );
        if (isActive) initial = item.label;
      }
    });
    return initial;
  });

  useEffect(() => {
    let found = false;
    NAV_ITEMS.forEach((item) => {
      if (item.type === 'group' && item.subItems) {
        const isActive = item.subItems.some(
          (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/')
        );
        if (isActive) {
          setActiveGroup((prev) => (prev !== item.label ? item.label : prev));
          found = true;
        }
      }
    });
    if (!found) setActiveGroup(null);
  }, [location.pathname]);

  useEffect(() => {
    supabase
      .from('shop_settings')
      .select('shop_name, phone')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.shop_name) setShopName(data.shop_name);
          if (data.phone) setShopPhone(data.phone);
        }
      });
  }, []);

  const handleGroupClick = (item) => {
    setActiveGroup(prev => prev === item.label ? null : item.label);
    if (item.path && activeGroup !== item.label) navigate(item.path);
  };

  const checkIsActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const visibleItems = role
    ? NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
    : NAV_ITEMS.filter((item) => item.roles?.includes('staff'));

  const shopInitial = shopName ? shopName[0].toUpperCase() : 'S';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        style={{ background: '#1e2433' }}
      >
        {/* ── Shop Header ── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: '#3d4a6b' }}
            >
              {shopInitial}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-[13px] leading-tight truncate whitespace-nowrap overflow-hidden">
                {shopName}
              </p>
              {shopPhone && (
                <p className="text-[12px] mt-0.5" style={{ color: '#8a95b0' }}>
                  {shopPhone}
                </p>
              )}
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Create Invoice button ── */}
        <div className="px-3 pb-4 flex-shrink-0">
          <button
            onClick={() => { navigate('/billing?new=true'); window.innerWidth < 1024 && onClose(); }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#2d3550', color: '#e2e8f0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#374166'}
            onMouseLeave={e => e.currentTarget.style.background = '#2d3550'}
          >
            <span className="flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" />
              Create Sales Invoice
            </span>
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 space-y-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374166 transparent' }}>
          {visibleItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div key={`divider-${index}`} className="my-2 mx-2" style={{ borderTop: '1px solid #2d3550' }} />
              );
            }

            if (item.type === 'link') {
              const isActive = checkIsActive(item.path);
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
                  style={isActive
                    ? { background: '#3b82f6', color: '#ffffff' }
                    : { color: '#a0aec0' }
                  }
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#2d3550'; e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a0aec0'; } }}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="text-[13px] font-medium leading-tight truncate whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                </NavLink>
              );
            }

            if (item.type === 'group') {
              const isOpen = activeGroup === item.label;
              const isAnySubActive = item.subItems?.some((sub) => checkIsActive(sub.path));

              return (
                <div key={item.label}>
                  <button
                    onClick={() => handleGroupClick(item)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all"
                    style={isAnySubActive && !isOpen
                      ? { background: '#2d3a5c', color: '#93c5fd' }
                      : { color: '#a0aec0' }
                    }
                    onMouseEnter={e => { if (!isAnySubActive || isOpen) { e.currentTarget.style.background = '#2d3550'; e.currentTarget.style.color = '#e2e8f0'; } }}
                    onMouseLeave={e => { if (!isAnySubActive || isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isAnySubActive ? '#93c5fd' : '#a0aec0'; } }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      <span className="text-[13px] font-medium leading-tight truncate whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                    </div>
                    <HiOutlineChevronDown
                      className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }}
                    />
                  </button>

                  {/* Sub items */}
                  <div
                    className="overflow-hidden transition-all duration-250"
                    style={{ maxHeight: isOpen ? '400px' : '0px', opacity: isOpen ? 1 : 0 }}
                  >
                    <div className="ml-4 pl-4 mt-0.5 mb-1 space-y-0.5" style={{ borderLeft: '1px solid #2d3550' }}>
                      {item.subItems?.map((sub) => {
                        if (role && sub.roles && !sub.roles.includes(role)) return null;
                        const isSubActive = checkIsActive(sub.path);
                        return (
                          <NavLink
                            key={sub.label}
                            to={sub.path}
                            onClick={() => window.innerWidth < 1024 && onClose()}
                            className="block px-3 py-2 rounded-lg text-[12.5px] transition-all font-medium truncate"
                            style={isSubActive
                              ? { background: '#3b82f620', color: '#60a5fa' }
                              : { color: '#718096' }
                            }
                            onMouseEnter={e => { if (!isSubActive) { e.currentTarget.style.background = '#2d3550'; e.currentTarget.style.color = '#e2e8f0'; } }}
                            onMouseLeave={e => { if (!isSubActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#718096'; } }}
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

        {/* ── Footer ── */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #2d3550' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium truncate" style={{ color: '#4a5568' }}>
              {shopName}
            </p>
            {role && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full capitalize"
                style={{ background: '#2d3a5c', color: '#60a5fa' }}
              >
                {role}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
