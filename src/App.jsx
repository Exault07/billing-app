import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// â”€â”€ Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// â”€â”€ Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// â”€â”€ Billing (Part 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import BillForm from './pages/billing/BillForm';
import BillView from './pages/billing/BillView';
import BillsHistory from './pages/billing/BillsHistory';
import SalesInvoices from './pages/billing/SalesInvoices';
import QuotationForm from './pages/billing/QuotationForm';
import QuotationsHistory from './pages/billing/QuotationsHistory';
import DeliveryChallan from './pages/billing/DeliveryChallan';
import POSBilling from './pages/billing/POSBilling';
import PaymentIn from './pages/billing/PaymentIn';
import ProformaInvoice from './pages/billing/ProformaInvoice';
import SaleReturn from './pages/sales/SaleReturn';

// â”€â”€ Purchases (Part 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import PurchaseList from './pages/purchases/PurchaseList';
import PurchaseDetail from './pages/purchases/PurchaseDetail';
import PurchaseForm from './pages/purchases/PurchaseForm';
import PurchaseOrderForm from './pages/purchases/PurchaseOrderForm';
import PurchaseReturn from './pages/purchases/PurchaseReturn';
import PaymentOutList from './pages/purchases/PaymentOut';

// ── Expenses (Part 7) ──────────────────────────
import ExpenseList from './pages/expenses/ExpenseList';
import ExpenseForm from './pages/expenses/ExpenseForm';

// 📈 Reports (Part 10) 📈
import Reports from './pages/reports/Reports';

// -- Inventory (Part 4) --
import ProductList from './pages/inventory/ProductList';
import ProductForm from './components/inventory/ProductForm';

// 🏢 Parties / customers & suppliers (Part 5) 🏢
import Parties from './pages/customers/Parties';
import PartyDetail from './pages/customers/PartyDetail';
import PartyForm from './pages/customers/PartyForm';

// â”€â”€ Carpenter / Worker (Part 8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import CarpenterList from './pages/carpenters/CarpenterList';
import CarpenterDetail from './pages/carpenters/CarpenterDetail';
import CarpenterForm from './pages/carpenters/CarpenterForm';

// â”€â”€ Settings (Part 11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Settings from './pages/settings/Settings';

// â”€â”€ Placeholder Pages (Parts 5-10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-surface-500 text-sm font-medium">Loading app...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes (inside Layout shell) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route index element={<Dashboard />} />

        {/* â”€â”€ Sales Invoices (unified list + form) â”€â”€ */}
        <Route path="sales/invoices" element={<SalesInvoices />} />
        <Route path="sales/payment-in" element={<ProtectedRoute allowedRoles={['owner', 'staff', 'accountant']}><PaymentIn /></ProtectedRoute>} />
        <Route path="sales/proforma" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProformaInvoice /></ProtectedRoute>} />
        <Route path="sales/return" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><SaleReturn /></ProtectedRoute>} />
        <Route path="billing/history" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="billing/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><BillForm /></ProtectedRoute>} />
        <Route path="billing/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><BillForm /></ProtectedRoute>} />
        <Route path="billing/:id" element={<BillView />} />
        
        {/* â”€â”€ POS Billing (Part 4.5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="sales/pos" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><POSBilling /></ProtectedRoute>} />

        {/* â”€â”€ Purchases (Part 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="purchases" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="invoices" /></ProtectedRoute>} />
        <Route path="purchases/history" element={<Navigate to="/purchases" replace />} />
        <Route path="purchases/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseForm /></ProtectedRoute>} />
        <Route path="purchases/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseForm /></ProtectedRoute>} />
        <Route path="purchases/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseDetail /></ProtectedRoute>} />
        <Route path="purchases/orders" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="orders" /></ProtectedRoute>} />
        <Route path="purchases/orders/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseOrderForm /></ProtectedRoute>} />
        <Route path="purchases/orders/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseOrderForm /></ProtectedRoute>} />
        <Route path="purchases/returns" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="returns" /></ProtectedRoute>} />
        <Route path="purchases/returns/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseReturn /></ProtectedRoute>} />
        <Route path="purchases/payment-out" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><PaymentOutList /></ProtectedRoute>} />

        {/* â”€â”€ Expenses (Part 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="expenses" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseList /></ProtectedRoute>} />
        <Route path="expenses/new" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseForm /></ProtectedRoute>} />
        <Route path="expenses/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseForm /></ProtectedRoute>} />

        {/* â”€â”€ Quotations (Part 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="quotations/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><QuotationForm /></ProtectedRoute>} />
        <Route path="quotations/history" element={<QuotationsHistory />} />
        <Route path="quotations/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><QuotationForm /></ProtectedRoute>} />
        <Route path="quotations/:id" element={<QuotationForm />} /> {/* Reusing form as view for now */}

        {/* â”€â”€ Delivery Challan (Part 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="challan/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><DeliveryChallan /></ProtectedRoute>} />
        <Route path="challan/new/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><DeliveryChallan /></ProtectedRoute>} /> {/* from bill */}

        {/* ðŸ“¦ Inventory (Part 4) ðŸ“¦ */}
        <Route path="inventory" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProductList /></ProtectedRoute>} />

        {/* ðŸ¢ Parties (Part 5) ðŸ¢ */}
        <Route path="parties" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><Parties /></ProtectedRoute>} />
        <Route path="parties/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PartyForm /></ProtectedRoute>} />
        <Route path="parties/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PartyDetail /></ProtectedRoute>} />
        <Route path="parties/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PartyForm /></ProtectedRoute>} />

        {/* â”€â”€ Carpenter / Workers (Part 8) â”€â”€â”€â”€â”€â”€ */}
        <Route path="carpenters" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterList /></ProtectedRoute>} />
        <Route path="carpenters/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterForm /></ProtectedRoute>} />
        <Route path="carpenters/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterForm /></ProtectedRoute>} />
        <Route path="carpenters/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterDetail /></ProtectedRoute>} />

        {/* â”€â”€ Expenses (Part 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="expenses" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseList /></ProtectedRoute>} />

        {/* ðŸ“Š Reports (Part 8) ðŸ“Š */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['owner', 'accountant']}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* â”€â”€ Settings (Part 11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['owner', 'staff']}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* â”€â”€ Additional Sidebar Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/billing" element={<SalesInvoices />} />
        <Route path="/billing/quotations" element={<QuotationsHistory />} />
        <Route path="/billing/proforma" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProformaInvoice /></ProtectedRoute>} />
        <Route path="/billing/challan" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><DeliveryChallan /></ProtectedRoute>} />
        <Route path="/billing/pos" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><POSBilling /></ProtectedRoute>} />
        <Route path="/billing/payment-in" element={<ProtectedRoute allowedRoles={['owner', 'staff', 'accountant']}><PaymentIn /></ProtectedRoute>} />
        <Route path="/sales/returns" element={<PlaceholderPage title="Sale Returns" part={99} />} />

        <Route path="/purchase" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="invoices" /></ProtectedRoute>} />
        <Route path="/purchase/orders" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="orders" /></ProtectedRoute>} />
        <Route path="/purchase/returns" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PurchaseList tab="returns" /></ProtectedRoute>} />
        <Route path="/purchase/payment-out" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><PaymentOutList /></ProtectedRoute>} />

        <Route path="/inventory/godown" element={<PlaceholderPage title="Godown Management" part={99} />} />

        <Route path="/staff" element={<PlaceholderPage title="Staff List" part={99} />} />
        <Route path="/staff/attendance" element={<PlaceholderPage title="Attendance" part={99} />} />
        <Route path="/staff/payroll" element={<PlaceholderPage title="Payroll" part={99} />} />

        {/* â”€â”€ Catch All â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Global Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
