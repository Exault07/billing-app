import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';
import {  
  HiOutlineUserCircle, HiOutlineBriefcase, HiOutlineDocumentText, 
  HiOutlinePrinter, HiOutlineUsers, HiOutlineBell, 
  HiOutlineShare, HiOutlineCurrencyRupee, HiOutlineGift, 
  HiOutlineQuestionMarkCircle, HiOutlineLogout, HiOutlineArrowLeft,
  HiOutlineChatAlt
, HiOutlineTag, HiOutlineCube, HiOutlineCreditCard, HiOutlineDatabase, HiOutlineDesktopComputer } from 'react-icons/hi';

import AccountTab from './tabs/AccountTab';
import ManageBusinessTab from './tabs/ManageBusinessTab';
import CategoriesTab from './tabs/CategoriesTab';
import UnitsTab from './tabs/UnitsTab';
import PaymentModesTab from './tabs/PaymentModesTab';
import DataManagementTab from './tabs/DataManagementTab';
import InvoiceSettingsTab from './tabs/InvoiceSettingsTab';
import PrintSettingsTab from './tabs/PrintSettingsTab';
import UserManagementTab from './tabs/UserManagementTab';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const { isDirty, setIsDirty } = useUnsavedChanges();

  // We can determine the titles based on activeTab
  const getTabTitles = () => {
    switch(activeTab) {
      case 'account': return { title: 'Account Settings', subtitle: 'Manage Your Account And Subscription' };
      case 'manage_business': return { title: 'Business Settings', subtitle: 'Edit Your Company Settings And Information' };
      case 'categories': return { title: 'Categories', subtitle: 'Manage product categories' };
      case 'units': return { title: 'Units', subtitle: 'Manage measurement units' };
      case 'payment_modes': return { title: 'Payment Modes', subtitle: 'Manage accepted payment methods' };
      case 'data_management': return { title: 'Data Management', subtitle: 'Import and export your data' };
      case 'invoice_settings': return { title: 'Invoice Settings', subtitle: 'Configure how your invoices look' };
      case 'print_settings': return { title: 'Print Settings', subtitle: 'Configure print layouts' };
      case 'manage_users': return { title: 'Manage Users', subtitle: 'Manage staff roles and access' };
      default: return { title: 'Settings', subtitle: 'Configure your application' };
    }
  };

  const { title, subtitle } = getTabTitles();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account': return <AccountTab />;
      case 'manage_business': return <ManageBusinessTab />;
      case 'categories': return <CategoriesTab />;
      case 'units': return <UnitsTab />;
      case 'payment_modes': return <PaymentModesTab />;
      case 'data_management': return <DataManagementTab />;
      case 'invoice_settings': return <InvoiceSettingsTab setIsDirty={setIsDirty} />;
      case 'print_settings': return <PrintSettingsTab setIsDirty={setIsDirty} />;
      case 'manage_users': return <UserManagementTab />;
      default: return <AccountTab />;
    }
  };

  const sidebarItems = [
    { id: 'account', label: 'Account', icon: HiOutlineUserCircle },
    { id: 'manage_business', label: 'Manage Business', icon: HiOutlineBriefcase },
    { id: 'invoice_settings', label: 'Invoice Settings', icon: HiOutlineDocumentText },
    { id: 'print_settings', label: 'Print Settings', icon: HiOutlinePrinter },
    { id: 'categories', label: 'Categories', icon: HiOutlineTag },
    { id: 'units', label: 'Units', icon: HiOutlineCube },
    { id: 'payment_modes', label: 'Payment Modes', icon: HiOutlineCreditCard },
    { id: 'data_management', label: 'Data Management', icon: HiOutlineDatabase },
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
                  onClick={() => {
                    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                      return;
                    }
                    setIsDirty(false);
                    setActiveTab(item.id);
                  }}
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
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to discard them?')) return;
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold border-l-4 border-transparent text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors mt-2"
          >
            <HiOutlineLogout className="w-5 h-5 text-surface-400" />
            Logout
          </button>
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
            {activeTab === 'manage_business' && (
              <>
                <button className="px-4 py-2 bg-[#ea580c] text-white rounded text-sm font-bold shadow-sm hover:bg-[#c2410c] transition-colors">
                  Create new business
                </button>
                <button className="p-2 border border-surface-200 rounded text-surface-500 hover:bg-surface-50">
                  <HiOutlineDesktopComputer className="w-4 h-4" />
                </button>
              </>
            )}

            {activeTab === 'manage_business' && (
              <button className="px-4 py-2 border border-surface-200 rounded text-surface-700 text-sm font-bold hover:bg-surface-50 transition-colors">
                Close Financial Year
              </button>
            )}
            <button className="px-6 py-2 border border-surface-200 rounded text-sm font-bold text-surface-600 hover:bg-surface-50 transition-colors">
              Cancel
            </button>
            {/* The save button for manage business will be inside the form, but let's keep this global one or hide it? 
                Actually, the screenshot shows the Save Changes button in the header. We can hook it up or leave it. */}
            <button 
              id="global-save-btn"
              onClick={() => {
                if (activeTab === 'manage_business') window.dispatchEvent(new Event('saveBusinessSettings'));
                else if (activeTab === 'invoice_settings') window.dispatchEvent(new Event('saveInvoiceSettings'));
              }}
              className="px-6 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded text-sm font-bold transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        {activeTab === 'invoice_settings' ? (
          <div className="flex-1 overflow-hidden">
            {renderTabContent()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {renderTabContent()}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
