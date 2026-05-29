import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import QuickCreatePartyModal from './QuickCreatePartyModal'; // Assumes it exists or will be moved

export default function PartySelect({
  label = "Bill To",
  partyType = "customer", // 'customer' or 'supplier'
  parties = [],
  selectedParty = null,
  onSelect,
  onClear,
  onPartyCreated
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const dropdownContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredParties = parties
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  return (
    <div className="w-full lg:w-96 relative" ref={dropdownContainerRef}>
      <label className="block text-[13px] font-bold text-surface-700 mb-2">{label}</label>
      
      {!selectedParty ? (
        <div 
          onClick={() => setShowDropdown(true)}
          className={`w-full h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer font-bold text-[14px] ${
            partyType === 'customer' 
              ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-600'
              : 'border-[#4f46e5]/40 bg-[#4f46e5]/5 hover:bg-[#4f46e5]/10 text-[#4f46e5]'
          }`}
        >
          + Add {partyType === 'customer' ? 'Party' : 'Supplier'}
        </div>
      ) : (
        <div className="w-full min-h-[96px] border border-surface-200 rounded p-4 relative group">
          <div className="font-bold text-[15px] text-surface-800">{selectedParty.name}</div>
          <div className="text-[12px] text-surface-500 mt-1">
            Balance: ₹ {selectedParty.balance || selectedParty.current_balance || 0}
          </div>
          <button 
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 text-surface-400 hover:text-red-500 transition-opacity"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        </div>
      )}

      {showDropdown && !selectedParty && (
        <div className="absolute top-[30px] left-0 w-[400px] bg-white border border-[#8b5cf6] rounded-md shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-[#8b5cf6]">
            <input 
              type="text" 
              autoFocus
              placeholder={`Search ${partyType === 'customer' ? 'party' : 'supplier'} by name`} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full outline-none text-[13px] p-1"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <div className="flex justify-between px-4 py-1.5 bg-surface-50 text-[10px] font-bold text-surface-500">
              <span>{partyType === 'customer' ? 'Party' : 'Supplier'} Name</span>
              <span>Balance</span>
            </div>
            {filteredParties.map(p => (
              <div 
                key={p.id} 
                onClick={() => {
                  onSelect(p);
                  setShowDropdown(false);
                  setSearch('');
                }}
                className="flex justify-between px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-surface-100 text-[13px]"
              >
                <span className="font-medium text-surface-800">{p.name}</span>
                <span className="text-surface-500 font-medium">₹ {p.balance || p.current_balance || 0}</span>
              </div>
            ))}
            {filteredParties.length === 0 && (
              <div className="p-4 text-center text-surface-500 text-sm">
                No matching {partyType === 'customer' ? 'parties' : 'suppliers'} found.
              </div>
            )}
            <div 
              onClick={() => {
                setShowDropdown(false);
                setShowQuickCreate(true);
              }}
              className="p-3 bg-surface-50 border-t border-surface-200 text-center cursor-pointer hover:bg-surface-100"
            >
              <div className="text-blue-600 font-bold text-[13px] flex items-center justify-center gap-1">
                + Create {partyType === 'customer' ? 'Party' : 'Supplier'}
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickCreate && (
        <QuickCreatePartyModal
          onClose={() => setShowQuickCreate(false)}
          onSaved={() => {
            setShowQuickCreate(false);
            if (onPartyCreated) onPartyCreated();
          }}
          initialType={partyType === 'supplier' ? 'supplier' : 'customer'}
        />
      )}
    </div>
  );
}
