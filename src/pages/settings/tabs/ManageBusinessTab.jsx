import React, { useState } from 'react';
import ShopProfileTab from './ShopProfileTab';
import CategoriesTab from './CategoriesTab';
import UnitsTab from './UnitsTab';
import PaymentModesTab from './PaymentModesTab';
import DataManagementTab from './DataManagementTab';

export default function ManageBusinessTab() {
  const [activeSubTab, setActiveSubTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Shop Profile' },
    { id: 'categories', label: 'Categories' },
    { id: 'units', label: 'Units' },
    { id: 'payment_modes', label: 'Payment Modes' },
    { id: 'data', label: 'Data Management' }
  ];

  const renderContent = () => {
    switch (activeSubTab) {
      case 'profile': return <ShopProfileTab />;
      case 'categories': return <CategoriesTab />;
      case 'units': return <UnitsTab />;
      case 'payment_modes': return <PaymentModesTab />;
      case 'data': return <DataManagementTab />;
      default: return <ShopProfileTab />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex border-b border-surface-200 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
              activeSubTab === tab.id
                ? 'border-[#4f46e5] text-[#4f46e5]'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
}
