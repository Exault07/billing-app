import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  HiOutlineUserCircle, HiOutlineBriefcase, HiOutlineDocumentText, 
  HiOutlinePrinter, HiOutlineUsers, HiOutlineBell, 
  HiOutlineShare, HiOutlineCurrencyRupee, HiOutlineGift, 
  HiOutlineQuestionMarkCircle, HiOutlineLogout, HiOutlineArrowLeft,
  HiOutlineChatAlt
} from 'react-icons/hi';

import AccountTab from './tabs/AccountTab';
import ManageBusinessTab from './tabs/ManageBusinessTab';
import InvoiceSettingsTab from './tabs/InvoiceSettingsTab';
import UserManagementTab from './tabs/UserManagementTab';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  // We can determine the titles based on activeTab
  const getTabTitles = () => {
    switch(activeTab) {
      case 'account': return { title: 'Account Settings', subtitle: 'Manage Your Account And Subscription' };
      case 'manage_business': return { title: 'Manage Business', subtitle: 'Manage your shop profile, categories, and units' };
      case 'invoice_settings': return { title: 'Invoice Settings', subtitle: 'Configure how your invoices look' };
      case 'print_settings': return { title: 'Print Settings', subtitle: 'Configure print layouts' };
      case 'manage_users': return { title: 'Manage Users', subtitle: 'Manage staff roles and access' };
      default: return { title: 'Settings', subtitle: 'Configure your application' };
    }
  };

  const { title, subtitle } = getTabTitles();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account': return <AccountTab />;
      case 'manage_business': return <ManageBusinessTab />;
      case 'invoice_settings': return <InvoiceSettingsTab />;
      case 'manage_users': return <UserManagementTab />;
      // placeholders for tabs that don't have components yet
      case 'print_settings':
        return (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <p>This feature is coming soon.</p>
          </div>
        );
      default: return <AccountTab />;
    }
  };

  const sidebarItems = [
    { id: 'account', label: 'Account', icon: HiOutlineUserCircle },
    { id: 'manage_business', label: 'Manage Business', icon: HiOutlineBriefcase },
    { id: 'invoice_settings', label: 'Invoice Settings', icon: HiOutlineDocumentText },
    { id: 'print_settings', label: 'Print Settings', icon: HiOutlinePrinter },
    { id: 'manage_users', label: 'Manage Users', icon: HiOutlineUsers, hideFromStaff: true }
  ];

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden text-surface-900">
      
      {/* Left Sidebar */}
      <div className="w-56 bg-white border-r border-surface-200 flex flex-col h-full flex-shrink-0 shadow-sm z-10">
        
        {/* User Info */}
        <div className="p-5 border-b border-surface-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-surface-200 rounded-full flex items-center justify-center text-surface-500 font-bold text-lg">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-bold text-[14px] text-surface-900 leading-tight">
                {user?.user_metadata?.full_name || 'Your Name'}
              </div>
              <div className="text-[12px] text-surface-500 font-medium">
                {user?.email || 'email@example.com'}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {sidebarItems.map(item => {
            if (item.hideFromStaff && user?.role === 'staff') return null;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-colors border-l-4 ${
                  isActive 
                    ? 'bg-[#e0e7ff] text-[#4f46e5] border-[#4f46e5]' 
                    : 'border-transparent text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#4f46e5]' : 'text-surface-400'}`} />
                {item.label}
              </button>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold border-l-4 border-transparent text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors mt-2"
          >
            <HiOutlineLogout className="w-5 h-5 text-surface-400" />
            Logout
          </button>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-surface-200 bg-surface-50">
          <div className="flex justify-between items-center text-[10px] font-bold text-surface-400 mb-2">
            <span>App Version : 9.9.1</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 mb-4">
            <span>🛡️ 100% Secure</span>
            <span>🏆 ISO Certified</span>
          </div>
          <div className="text-[12px] font-bold text-surface-900 flex items-center gap-1">
            <span className="text-[#ea580c]">myBillBook</span> <span className="text-[10px] text-surface-500 font-normal">by flobiz</span>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
        
        {/* Header */}
        <div className="h-20 border-b border-surface-200 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-surface-900">{title}</h1>
            <p className="text-[12px] font-medium text-surface-500 mt-0.5">{subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-bold transition-colors">
              <HiOutlineChatAlt className="w-4 h-4" /> Chat Support
            </button>
            <button className="px-6 py-2 border border-surface-200 rounded text-sm font-bold text-surface-600 hover:bg-surface-50 transition-colors">
              Cancel
            </button>
            <button className="px-6 py-2 bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#4f46e5] rounded text-sm font-bold transition-colors">
              Save Changes
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {renderTabContent()}
          </div>
        </div>

      </div>

    </div>
  );
}
