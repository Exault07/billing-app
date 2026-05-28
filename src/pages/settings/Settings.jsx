import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
 HiOutlineOfficeBuilding, HiOutlineDocumentText, 
 HiOutlineUsers, HiOutlineViewGrid, 
 HiOutlineScale, HiOutlineCreditCard, 
 HiOutlineDatabase 
} from 'react-icons/hi';

import ShopProfileTab from './tabs/ShopProfileTab';
import InvoiceSettingsTab from './tabs/InvoiceSettingsTab';
import UserManagementTab from './tabs/UserManagementTab';
import CategoriesTab from './tabs/CategoriesTab';
import UnitsTab from './tabs/UnitsTab';
import PaymentModesTab from './tabs/PaymentModesTab';
import DataManagementTab from './tabs/DataManagementTab';

export default function Settings() {
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState('shop_profile');

 // Define tabs configuration
 const tabs = [
 { id: 'shop_profile', label: 'Shop Profile', icon: HiOutlineOfficeBuilding, roles: ['owner', 'staff'] },
 { id: 'invoice_settings', label: 'Invoice Settings', icon: HiOutlineDocumentText, roles: ['owner'] },
 { id: 'user_management', label: 'User Management', icon: HiOutlineUsers, roles: ['owner'] },
 { id: 'categories', label: 'Item Categories', icon: HiOutlineViewGrid, roles: ['owner', 'staff'] },
 { id: 'units', label: 'Units of Measure', icon: HiOutlineScale, roles: ['owner', 'staff'] },
 { id: 'payment_modes', label: 'Payment Modes', icon: HiOutlineCreditCard, roles: ['owner'] },
 { id: 'data_management', label: 'Data Management', icon: HiOutlineDatabase, roles: ['owner', 'staff'] } // Import/Export. Danger zone logic will be inside tab protected by role
 ];

 const visibleTabs = tabs.filter(tab => tab.roles.includes(user?.role));

 const renderTabContent = () => {
 switch (activeTab) {
 case 'shop_profile': return <ShopProfileTab />;
 case 'invoice_settings': return <InvoiceSettingsTab />;
 case 'user_management': return <UserManagementTab />;
 case 'categories': return <CategoriesTab />;
 case 'units': return <UnitsTab />;
 case 'payment_modes': return <PaymentModesTab />;
 case 'data_management': return <DataManagementTab />;
 default: return <ShopProfileTab />;
 }
 };

 return (
 <div className="max-w-7xl mx-auto">
 <div className="mb-6">
 <h1 className="text-xl font-bold text-surface-900">Settings</h1>
 <p className="text-surface-500">Manage your application configuration and data.</p>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-surface-200 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
 
 {/* Left Sidebar Tabs */}
 <div className="w-full md:w-64 bg-surface-50 border-r border-surface-200 p-4">
 <nav className="space-y-1">
 {visibleTabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
 activeTab === tab.id 
 ? 'bg-primary-50 text-primary-700' 
 : 'text-surface-600 hover:bg-surface-100'
 }`}
 >
 <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary-600' : 'text-surface-400'}`} />
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 {/* Right Content Area */}
 <div className="flex-1 p-6 md:p-8 bg-white overflow-y-auto">
 {renderTabContent()}
 </div>
 </div>
 </div>
 );
}
