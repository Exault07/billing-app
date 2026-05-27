import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// ── Layout ──────────────────────────────────────
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ── Pages ───────────────────────────────────────
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// ── Billing (Part 3) ───────────────────────────
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

// ── Purchases (Part 6) ───────────────────────
import PurchaseList from './pages/purchases/PurchaseList';
import PurchaseDetail from './pages/purchases/PurchaseDetail';
import PurchaseForm from './pages/purchases/PurchaseForm';
import PurchaseOrderForm from './pages/purchases/PurchaseOrderForm';
import PurchaseReturn from './pages/purchases/PurchaseReturn';
import PaymentOutList from './pages/purchases/PaymentOut';
import PaymentOutForm from './pages/purchases/PaymentOutForm';

// ── Expenses (Part 7) ──────────────────────────
import ExpenseList from './pages/expenses/ExpenseList';
import ExpenseForm from './pages/expenses/ExpenseForm';
// ── Inventory (Part 4) ─────────────────────────
import ProductList from './pages/inventory/ProductList';
import ProductForm from './pages/inventory/ProductForm';

// ── Parties / Customers & Suppliers (Part 5) ───
import Parties from './pages/customers/Parties';
import PartyDetails from './pages/customers/PartyDetails';

// ── Carpenter / Worker (Part 8) ────────────────
import CarpenterList from './pages/carpenters/CarpenterList';
import CarpenterDetail from './pages/carpenters/CarpenterDetail';
import CarpenterForm from './pages/carpenters/CarpenterForm';

// ── Settings (Part 11) ─────────────────
import Settings from './pages/settings/Settings';

// ── Placeholder Pages (Parts 5-10) ─────────────
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
        {/* ── Dashboard ─────────────────────── */}
        <Route index element={<Dashboard />} />

        {/* ── Sales Invoices (unified list + form) ── */}
        <Route path="sales/invoices" element={<SalesInvoices />} />
        <Route path="sales/payment-in" element={<ProtectedRoute allowedRoles={['owner', 'staff', 'accountant']}><PaymentIn /></ProtectedRoute>} />
        <Route path="sales/proforma" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProformaInvoice /></ProtectedRoute>} />
        <Route path="sales/return" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><SaleReturn /></ProtectedRoute>} />
        <Route path="billing/history" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="billing/new" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="billing/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><BillForm /></ProtectedRoute>} />
        <Route path="billing/:id" element={<BillView />} />
        
        {/* ── POS Billing (Part 4.5) ──────────── */}
        <Route path="sales/pos" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><POSBilling /></ProtectedRoute>} />

        {/* ── Purchases (Part 6) ────────────── */}
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
        <Route path="purchases/payment-out/new" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><PaymentOutForm /></ProtectedRoute>} />

        {/* ── Expenses (Part 7) ───────────────── */}
        <Route path="expenses" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseList /></ProtectedRoute>} />
        <Route path="expenses/new" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseForm /></ProtectedRoute>} />
        <Route path="expenses/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'accountant']}><ExpenseForm /></ProtectedRoute>} />

        {/* ── Quotations (Part 3) ─────────────── */}
        <Route path="quotations/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><QuotationForm /></ProtectedRoute>} />
        <Route path="quotations/history" element={<QuotationsHistory />} />
        <Route path="quotations/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><QuotationForm /></ProtectedRoute>} />
        <Route path="quotations/:id" element={<QuotationForm />} /> {/* Reusing form as view for now */}

        {/* ── Delivery Challan (Part 3) ───────── */}
        <Route path="challan/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><DeliveryChallan /></ProtectedRoute>} />
        <Route path="challan/new/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><DeliveryChallan /></ProtectedRoute>} /> {/* from bill */}

        {/* ── Inventory (Part 4) ──────────────── */}
        <Route path="inventory" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProductList /></ProtectedRoute>} />
        <Route path="inventory/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProductForm /></ProtectedRoute>} />
        <Route path="inventory/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><ProductForm /></ProtectedRoute>} />

        {/* ── Customers & Suppliers (Part 5) ────── */}
        <Route path="customers" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><Parties /></ProtectedRoute>} />
        <Route path="customers/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PartyDetails /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><Parties /></ProtectedRoute>} />
        <Route path="suppliers/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><PartyDetails /></ProtectedRoute>} />

        {/* ── Inventory (Part 6) ────────────── */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['owner', 'staff']}>
              <PlaceholderPage title="Inventory" part={6} />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <ProtectedRoute allowedRoles={['owner', 'staff']}>
              <PlaceholderPage title="Product Details" part={6} />
            </ProtectedRoute>
          }
        />

        {/* ── Carpenter / Workers (Part 8) ────── */}
        <Route path="carpenters" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterList /></ProtectedRoute>} />
        <Route path="carpenters/new" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterForm /></ProtectedRoute>} />
        <Route path="carpenters/:id/edit" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterForm /></ProtectedRoute>} />
        <Route path="carpenters/:id" element={<ProtectedRoute allowedRoles={['owner', 'staff']}><CarpenterDetail /></ProtectedRoute>} />

        {/* ── Expenses (Part 7) ─────────────── */}
        <Route
          path="expenses"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <PlaceholderPage title="Expenses" part={7} />
            </ProtectedRoute>
          }
        />

        {/* ── Reports (Part 8) ──────────────── */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['owner', 'accountant']}>
              <PlaceholderPage title="Reports" part={8} />
            </ProtectedRoute>
          }
        />

        {/* ── Settings (Part 11) ─────────────── */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['owner', 'staff']}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* ── Catch All ─────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Global Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
