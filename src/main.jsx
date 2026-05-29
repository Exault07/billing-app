import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { AuthProvider } from './context/AuthContext';
import { UnsavedChangesProvider } from './context/UnsavedChangesContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <UnsavedChangesProvider>
          <RouterProvider router={router} />
        </UnsavedChangesProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
