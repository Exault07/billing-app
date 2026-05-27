import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineUser, HiOutlineCalendar, HiOutlineCreditCard, HiOutlineDocumentText, HiOutlineArrowLeft } from 'react-icons/hi';

export default function PaymentOutForm() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  
  const [invoices, setInvoices] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});
  
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      fetchPendingInvoices(selectedSupplier);
    } else {
      setInvoices([]);
      setPayAmounts({});
    }
  }, [selectedSupplier]);

  const fetchsuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      alert('Failed to load suppliers: ' + error.message);
    }
  };

  const fetchPendingInvoices = async (supplierId) => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('supplier_id', supplierId)
        .gt('balance_due', 0)
        .order('date', { ascending: true });
        
      if (error) throw error;
      setInvoices(data || []);
      
      const initialPayAmounts = {};
      (data || []).forEach(inv => {
        initialPayAmounts[inv.id] = '';
      });
      setPayAmounts(initialPayAmounts);
      
    } catch (error) {
      alert('Failed to load pending invoices: ' + error.message);
    } finally {
      setFetching(false);
    }
  };

  const handlePayAmountChange = (id, value) => {
    let numValue = parseFloat(value);
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice && numValue > invoice.balance_due) {
      value = invoice.balance_due.toString();
    }
    setPayAmounts(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const totalPaymentAmount = Object.values(payAmounts).reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleSavePayment = async () => {
    if (!selectedSupplier) {
      alert('Please select a supplier.');
      return;
    }
    if (totalPaymentAmount <= 0) {
      alert('Please enter at least one payment amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const paymentsToInsert = [];
      const invoicesToUpdate = [];

      for (const invoice of invoices) {
        const amountStr = payAmounts[invoice.id];
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          paymentsToInsert.push({
            purchase_id: invoice.id,
            supplier_id: selectedSupplier,
            amount: amount,
            payment_mode: paymentMode,
            date: paymentDate,
            notes: notes,
            user_id: user?.id
          });

          const newAdvancePaid = (invoice.advance_paid || 0) + amount;
          const newBalanceDue = invoice.balance_due - amount;
          const newStatus = newBalanceDue <= 0 ? 'final' : invoice.status;

          invoicesToUpdate.push({
            id: invoice.id,
            update: {
              advance_paid: newAdvancePaid,
              balance_due: newBalanceDue,
              status: newStatus
            }
          });
        }
      }

      if (paymentsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('purchase_payments')
          .insert(paymentsToInsert);
          
        if (insertError) throw insertError;

        for (const inv of invoicesToUpdate) {
          const { error: updateError } = await supabase
            .from('purchase_invoices')
            .update(inv.update)
            .eq('id', inv.id);
            
          if (updateError) throw updateError;
        }

        alert('Payments saved successfully!');
        
        setPaymentMode('cash');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        
        fetchPendingInvoices(selectedSupplier);
      }
      
    } catch (error) {
      alert('Failed to save payments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => window.history.back()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors bg-white border border-gray-200 shadow-sm">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Record Payment Out</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <HiOutlineUser className="text-blue-500" />
              Select Supplier
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSupplier && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden mb-6">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-blue-800">Pending Invoices</h2>
          </div>
          
          <div className="overflow-x-auto">
            {fetching ? (
              <div className="p-8 text-center text-blue-600">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No pending invoices found for this supplier.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 text-sm uppercase tracking-wider">
                    <th className="p-4 border-b border-gray-200">Date</th>
                    <th className="p-4 border-b border-gray-200">Bill No</th>
                    <th className="p-4 border-b border-gray-200 text-right">Grand Total</th>
                    <th className="p-4 border-b border-gray-200 text-right">Balance Due</th>
                    <th className="p-4 border-b border-gray-200 text-right w-48">Pay Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 text-gray-800">{new Date(invoice.date).toLocaleDateString()}</td>
                      <td className="p-4 text-gray-800 font-medium">{invoice.bill_no || '-'}</td>
                      <td className="p-4 text-right text-gray-800">₹{invoice.grand_total?.toFixed(2)}</td>
                      <td className="p-4 text-right text-red-600 font-medium">₹{invoice.balance_due?.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={invoice.balance_due}
                            value={payAmounts[invoice.id] || ''}
                            onChange={(e) => handlePayAmountChange(invoice.id, e.target.value)}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50/50 font-semibold border-t-2 border-blue-100">
                  <tr>
                    <td colSpan="4" className="p-4 text-right text-blue-900">Total Payment Amount:</td>
                    <td className="p-4 text-right text-blue-700 text-lg">₹{totalPaymentAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {selectedSupplier && invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-50 pb-2">Payment Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HiOutlineCreditCard className="text-blue-500" />
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HiOutlineCalendar className="text-blue-500" />
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HiOutlineDocumentText className="text-blue-500" />
                Notes / Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Transaction ID, Cheque No, etc."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSavePayment}
              disabled={loading || totalPaymentAmount <= 0}
              className={`px-6 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all flex items-center gap-2 ${
                loading || totalPaymentAmount <= 0
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow'
              }`}
            >
              {loading ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
