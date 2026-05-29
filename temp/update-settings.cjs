const fs = require('fs');

let code = fs.readFileSync('src/pages/settings/Settings.jsx', 'utf8');

// 1. Add missing icon imports
const iconsMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*'react-icons\/hi';/);
if (iconsMatch) {
  let iconsStr = iconsMatch[1];
  const newIcons = ['HiOutlineTag', 'HiOutlineCube', 'HiOutlineCreditCard', 'HiOutlineDatabase', 'HiOutlineDesktopComputer'];
  newIcons.forEach(icon => {
    if (!iconsStr.includes(icon)) iconsStr += `, ${icon}`;
  });
  code = code.replace(iconsMatch[0], `import { ${iconsStr} } from 'react-icons/hi';`);
}

// 2. Add missing component imports
const manageBusinessImportRegex = /import ManageBusinessTab from '\.\/tabs\/ManageBusinessTab';/;
code = code.replace(manageBusinessImportRegex, `import ManageBusinessTab from './tabs/ManageBusinessTab';
import CategoriesTab from './tabs/CategoriesTab';
import UnitsTab from './tabs/UnitsTab';
import PaymentModesTab from './tabs/PaymentModesTab';
import DataManagementTab from './tabs/DataManagementTab';`);

// 3. Update getTabTitles
const getTabTitlesRegex = /case 'manage_business': return \{ title: 'Manage Business', subtitle: 'Manage your shop profile, categories, and units' \};/;
code = code.replace(getTabTitlesRegex, `case 'manage_business': return { title: 'Business Settings', subtitle: 'Edit Your Company Settings And Information' };
      case 'categories': return { title: 'Categories', subtitle: 'Manage product categories' };
      case 'units': return { title: 'Units', subtitle: 'Manage measurement units' };
      case 'payment_modes': return { title: 'Payment Modes', subtitle: 'Manage accepted payment methods' };
      case 'data_management': return { title: 'Data Management', subtitle: 'Import and export your data' };`);

// 4. Update renderTabContent
const renderTabContentRegex = /case 'manage_business': return <ManageBusinessTab \/>;/;
code = code.replace(renderTabContentRegex, `case 'manage_business': return <ManageBusinessTab />;
      case 'categories': return <CategoriesTab />;
      case 'units': return <UnitsTab />;
      case 'payment_modes': return <PaymentModesTab />;
      case 'data_management': return <DataManagementTab />;`);

// 5. Update sidebarItems array
const sidebarItemsRegex = /const sidebarItems = \[([\s\S]*?)\];/;
const newSidebarItems = `const sidebarItems = [
    { id: 'account', label: 'Account', icon: HiOutlineUserCircle },
    { id: 'manage_business', label: 'Manage Business', icon: HiOutlineBriefcase },
    { id: 'invoice_settings', label: 'Invoice Settings', icon: HiOutlineDocumentText },
    { id: 'print_settings', label: 'Print Settings', icon: HiOutlinePrinter },
    { id: 'categories', label: 'Categories', icon: HiOutlineTag },
    { id: 'units', label: 'Units', icon: HiOutlineCube },
    { id: 'payment_modes', label: 'Payment Modes', icon: HiOutlineCreditCard },
    { id: 'data_management', label: 'Data Management', icon: HiOutlineDatabase },
    { id: 'manage_users', label: 'Manage Users', icon: HiOutlineUsers, hideFromStaff: true }
  ];`;
code = code.replace(sidebarItemsRegex, newSidebarItems);

// 6. Update header rendering
const headerButtonsRegex = /<div className="flex items-center gap-3">([\s\S]*?)<\/div>\s*<\/div>\s*\{\/\* Scrollable Content \*\/\}/;
const newHeaderButtons = `<div className="flex items-center gap-3">
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
            <button className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-bold transition-colors">
              <HiOutlineChatAlt className="w-4 h-4" /> Chat Support
            </button>
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
              className="px-6 py-2 bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#4f46e5] rounded text-sm font-bold transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Scrollable Content */}`;
code = code.replace(headerButtonsRegex, newHeaderButtons);

fs.writeFileSync('src/pages/settings/Settings.jsx', code);
console.log('Settings.jsx updated successfully.');
