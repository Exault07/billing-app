const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// Replace imports
app = app.replace(
  /import \{ Routes, Route, Navigate \} from 'react-router-dom';/,
  "import { createBrowserRouter, createRoutesFromElements, Route, Navigate, Outlet } from 'react-router-dom';"
);

// Add LoginRoute wrapper
const loginRouteWrapper = `
function LoginRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Login />;
}
`;
app = app.replace(/(import NotFound from '\.\/pages\/NotFound';)/, "$1\n" + loginRouteWrapper);

// Change App function
app = app.replace(
  /export default function App\(\) \{([\s\S]*?)return \(\s*<Routes>([\s\S]*?)<\/Routes>\s*\);\s*\}/,
  (match, p1, p2) => {
    let routes = p2.replace(/element=\{user \? <Navigate to="\/" replace \/> : <Login \/>\}/, 'element={<LoginRoute />}');
    
    return `export function AppRoot() {${p1}  return <Outlet />;\n}\n\nexport const router = createBrowserRouter(\n  createRoutesFromElements(\n    <Route element={<AppRoot />}>\n      ${routes}\n    </Route>\n  )\n);`;
  }
);

fs.writeFileSync('src/App.jsx', app);
console.log('App.jsx refactored');

let main = fs.readFileSync('src/main.jsx', 'utf8');
main = main.replace(
  /import \{ BrowserRouter \} from 'react-router-dom';/,
  "import { RouterProvider } from 'react-router-dom';"
);
main = main.replace(
  /import App from '\.\/App';/,
  "import { router } from './App';"
);
main = main.replace(
  /<BrowserRouter>([\s\S]*?)<App \/>([\s\S]*?)<\/BrowserRouter>/,
  (match, p1, p2) => {
    return `<RouterProvider router={router} />`;
  }
);
// Make sure AuthProvider wraps RouterProvider
main = main.replace(
  /<RouterProvider router=\{router\} \/>/,
  "<AuthProvider>\n        <RouterProvider router={router} />\n      </AuthProvider>"
);
// But wait! AuthProvider was ALREADY wrapping App in the original code. 
// If we replace `<BrowserRouter>...<App />...</BrowserRouter>` with `<RouterProvider router={router} />`, we destroyed AuthProvider!
// Let's rewrite main.jsx completely because it's only 20 lines.
const mainNew = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './App';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
`;
fs.writeFileSync('src/main.jsx', mainNew);
console.log('main.jsx updated');
