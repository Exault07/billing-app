import React, { useState, useMemo } from 'react';
import { 
  HiOutlineChartBar, 
  HiOutlineShoppingCart, 
  HiOutlineCube, 
  HiOutlineCash,
  HiOutlineUserGroup,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiOutlineAdjustments,
  HiOutlineCalendar
} from 'react-icons/hi';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Import Tabs (to be created)
import SalesReports from './tabs/SalesReports';
import PurchaseReports from './tabs/PurchaseReports';
import InventoryReports from './tabs/InventoryReports';
import FinancialReports from './tabs/FinancialReports';
import PartyReports from './tabs/PartyReports';
import StaffReports from './tabs/StaffReports';
import CarpenterReports from './tabs/CarpenterReports';
import CustomReportBuilder from './tabs/CustomReportBuilder';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRangeType, setDateRangeType] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calculate effective date range based on selection
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (dateRangeType) {
      case 'today':
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'this_week':
        return { start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
      case 'this_month':
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
      case 'this_year':
        return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd') };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
    }
  }, [dateRangeType, customStartDate, customEndDate]);

  const tabs = [
    { id: 'sales', label: 'Sales Reports', icon: HiOutlineChartBar },
    { id: 'purchases', label: 'Purchase Reports', icon: HiOutlineShoppingCart },
    { id: 'inventory', label: 'Inventory Reports', icon: HiOutlineCube },
    { id: 'financial', label: 'Financial Reports', icon: HiOutlineCash },
    { id: 'party', label: 'Party Reports', icon: HiOutlineUserGroup },
    { id: 'staff', label: 'Staff Reports', icon: HiOutlineIdentification },
    { id: 'carpenter', label: 'Carpenter Reports', icon: HiOutlineBriefcase },
    { id: 'custom', label: 'Custom Builder', icon: HiOutlineAdjustments },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 pb-16 animate-fade-in min-h-screen flex flex-col">
      
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pt-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reports Center</h1>
          <p className="text-sm text-surface-500 mt-1">Comprehensive analytics and exports for your business</p>
        </div>

        {/* Global Date Filter */}
        <div className="flex items-center gap-2 bg-white border border-surface-200 p-1.5 rounded-xl shadow-sm">
          <HiOutlineCalendar className="w-5 h-5 text-surface-400 ml-2" />
          <select 
            value={dateRangeType} 
            onChange={(e) => setDateRangeType(e.target.value)}
            className="bg-transparent text-sm font-semibold text-surface-700 focus:outline-none px-2 cursor-pointer border-r border-surface-200"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2 px-2 animate-fade-in">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-sm border-none focus:ring-0 text-surface-700 bg-transparent" />
              <span className="text-surface-400 text-sm">to</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-sm border-none focus:ring-0 text-surface-700 bg-transparent" />
            </div>
          )}
          {dateRangeType !== 'custom' && (
            <div className="px-3 text-sm font-medium text-surface-500 min-w-[160px] text-center">
              {format(new Date(dateRange.start), 'MMM dd, yyyy')} - {format(new Date(dateRange.end), 'MMM dd, yyyy')}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <div className="w-64 shrink-0 bg-white border border-surface-200 rounded-2xl shadow-sm p-4 sticky top-6">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-4 px-2">Report Categories</h3>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'}`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-surface-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-white border border-surface-200 rounded-2xl shadow-sm min-h-[600px] overflow-hidden">
          {activeTab === 'sales' && <SalesReports dateRange={dateRange} />}
          {activeTab === 'purchases' && <PurchaseReports dateRange={dateRange} />}
          {activeTab === 'inventory' && <InventoryReports dateRange={dateRange} />}
          {activeTab === 'financial' && <FinancialReports dateRange={dateRange} />}
          {activeTab === 'party' && <PartyReports dateRange={dateRange} />}
          {activeTab === 'staff' && <StaffReports dateRange={dateRange} />}
          {activeTab === 'carpenter' && <CarpenterReports dateRange={dateRange} />}
          {activeTab === 'custom' && <CustomReportBuilder dateRange={dateRange} />}
        </div>
      </div>

    </div>
  );
}
