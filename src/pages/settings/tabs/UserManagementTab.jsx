import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';

export default function UserManagementTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff', name: '' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user?.id && newRole !== 'owner') {
      alert("You cannot remove your own owner role.");
      return;
    }
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (userId === user?.id) {
      alert("You cannot deactivate your own account.");
      return;
    }
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      // Calling our RPC function to bypass any restrictive RLS if needed, though owner usually has UPDATE
      const { error } = await supabase.rpc('admin_update_user_status', { user_id: userId, new_status: newStatus });
      
      // Fallback if RPC doesn't exist yet
      if (error && error.code === '42883') {
         const { error: updErr } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
         if (updErr) throw updErr;
      } else if (error) {
        throw error;
      }

      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update user status');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      // Typically we'd call supabase.auth.admin.inviteUserByEmail here via an Edge Function.
      // Since we are frontend only, we simulate an invite or direct profile creation for demo.
      const fakeId = crypto.randomUUID();
      const { error } = await supabase.from('profiles').insert({
        id: fakeId, // Normally this is the auth.users UUID
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
        status: 'Invited'
      });
      
      if (error) throw error;
      
      alert(`Invitation sent to ${inviteForm.email}! (Simulated - Requires Edge Function for real Supabase Auth emails)`);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'staff', name: '' });
      fetchUsers();
    } catch (err) {
      console.error('Error inviting user:', err);
      alert('Failed to invite user: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-4 text-surface-500">Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-surface-900">User Management</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <HiOutlineUserAdd className="w-5 h-5" />
          Invite User
        </button>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 mb-6 border border-blue-100">
        <HiOutlineExclamationCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-bold mb-1">About User Management</p>
          <p>Real Supabase Auth invitations require a secure backend Edge Function with the Service Role Key. The "Invite" action here currently registers the profile in the database. To fully onboard users, please use your Supabase Dashboard -> Authentication -> Add User -> Send Invite.</p>
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 text-sm">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium">Last Login</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-surface-500">No users found.</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                  <td className="py-3 px-4 font-medium text-surface-900">{u.name || '-'}</td>
                  <td className="py-3 px-4 text-surface-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === user?.id}
                      className="bg-transparent border border-surface-200 rounded px-2 py-1 text-sm outline-none focus:border-primary-500"
                    >
                      <option value="owner">Owner</option>
                      <option value="staff">Staff</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-surface-500 text-sm">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      u.status === 'Invited' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(u.id, u.status || 'Active')}
                      disabled={u.id === user?.id}
                      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        u.id === user?.id 
                          ? 'text-surface-300 cursor-not-allowed'
                          : u.status === 'Active' 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-surface-900">Invite New User</h3>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-surface-700">Full Name</label>
                <input
                  type="text" required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-surface-700">Email Address</label>
                <input
                  type="email" required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-surface-700">Assign Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="staff">Staff</option>
                  <option value="accountant">Accountant</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-70"
                >
                  {inviting ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
