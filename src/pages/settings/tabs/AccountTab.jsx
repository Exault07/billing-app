import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function AccountTab() {
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.user_metadata?.full_name || 'Your Name');
  const [mobile, setMobile] = useState('7205014804'); // placeholder since we don't store mobile in auth typically
  const [email, setEmail] = useState(user?.email || 'umang.tig123@gmail.com');
  
  return (
    <div className="w-full">
      

      {/* General Information */}
      <div className="mb-8">
        <h3 className="text-[13px] font-bold text-surface-500 uppercase tracking-wide border-b border-surface-200 pb-2 mb-4">
          General Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-surface-500 uppercase mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded text-sm text-surface-900 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-surface-500 uppercase mb-2">
              Mobile Number
            </label>
            <input 
              type="text" 
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded text-sm text-surface-900 outline-none focus:border-blue-500 bg-surface-50"
              disabled
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-surface-500 uppercase mb-2">
              Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded text-sm text-surface-900 outline-none focus:border-blue-500 bg-surface-50"
              disabled
            />
          </div>
        </div>
      </div>

      

      

      {/* Billing History */}
      <div>
        <h3 className="text-[13px] font-bold text-surface-500 uppercase tracking-wide border-b border-surface-200 pb-2 mb-4">
          Billing History
        </h3>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-surface-400 uppercase tracking-wider border-b border-surface-100">
              <th className="pb-3">Date</th>
              <th className="pb-3">Plan</th>
              <th className="pb-3">Reference #</th>
              <th className="pb-3">Payment Status</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="py-8 text-center text-sm text-surface-400">
                No billing history available.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
