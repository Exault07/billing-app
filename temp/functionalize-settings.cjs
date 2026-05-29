const fs = require('fs');

// --- 1. Settings.jsx ---
let settingsCode = fs.readFileSync('src/pages/settings/Settings.jsx', 'utf8');
const saveBtnRegex = /<button \s*id="global-save-btn"\s*className="px-6 py-2 bg-\[#ede9fe\] hover:bg-\[#ddd6fe\] text-\[#4f46e5\] rounded text-sm font-bold transition-colors"\s*>\s*Save Changes\s*<\/button>/;
const newSaveBtn = `<button 
              id="global-save-btn"
              onClick={() => {
                if (activeTab === 'manage_business') window.dispatchEvent(new Event('saveBusinessSettings'));
                else console.log('Save action not yet wired for this tab');
              }}
              className="px-6 py-2 bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#4f46e5] rounded text-sm font-bold transition-colors"
            >
              Save Changes
            </button>`;
settingsCode = settingsCode.replace(saveBtnRegex, newSaveBtn);
fs.writeFileSync('src/pages/settings/Settings.jsx', settingsCode);

// --- 2. ManageBusinessTab.jsx ---
let manageBizCode = fs.readFileSync('src/pages/settings/tabs/ManageBusinessTab.jsx', 'utf8');

// Add save logic and effect listener
const useEffectRegex = /useEffect\(\(\) => \{\s*fetchSettings\(\);\s*\}, \[\]\);/;
const newEffects = `useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleSave = async () => {
      setLoading(true);
      try {
        const payload = {
          shop_name: formData.shop_name,
          owner_name: formData.owner_name,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone,
          alternate_phone: formData.alternate_phone,
          email: formData.email,
          business_type: formData.business_type,
          industry_type: formData.industry_type,
          registration_type: formData.registration_type,
          gst_registered: formData.gst_registered,
          gstin: formData.gstin,
          website: formData.website,
          msme_number: formData.msme_number,
          logo_url: formData.logo_url,
          signature_url: formData.signature_url,
          updated_at: new Date().toISOString()
        };

        let err;
        if (formData.id) {
          const { error } = await supabase.from('shop_settings').update(payload).eq('id', formData.id);
          err = error;
        } else {
          const { data, error } = await supabase.from('shop_settings').insert([payload]).select().single();
          if (data) setFormData(prev => ({...prev, id: data.id}));
          err = error;
        }
        
        if (err) throw err;
        alert('Business Settings saved successfully!');
      } catch (err) {
        alert('Failed to save settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('saveBusinessSettings', handleSave);
    return () => window.removeEventListener('saveBusinessSettings', handleSave);
  }, [formData]);

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };`;
manageBizCode = manageBizCode.replace(useEffectRegex, newEffects);

// Replace Upload Logo Box
const logoBoxRegex = /<div className="w-32 h-32 border-2 border-dashed border-\[#4f46e5\] text-\[#4f46e5\] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors flex-shrink-0 bg-white">[\s\S]*?<\/div>/;
const newLogoBox = `<label className="w-32 h-32 border-2 border-dashed border-[#4f46e5] text-[#4f46e5] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors flex-shrink-0 bg-white overflow-hidden relative group">
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url')} />
              {formData.logo_url ? (
                <>
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">Change</div>
                </>
              ) : (
                <>
                  <HiOutlinePhotograph className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold text-center">Upload Logo</span>
                  <span className="text-[9px] text-center mt-1 px-2 font-medium text-surface-500">PNG/JPG, max 5<br/>MB.</span>
                </>
              )}
            </label>`;
manageBizCode = manageBizCode.replace(logoBoxRegex, newLogoBox);

// Replace Signature Box
const sigBoxRegex = /<div className="w-48 h-24 border-2 border-dashed border-\[#4f46e5\] text-\[#4f46e5\] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-white">\s*<span className="text-sm font-bold flex items-center gap-1">\+ Add Signature<\/span>\s*<\/div>/;
const newSigBox = `<label className="w-48 h-24 border-2 border-dashed border-[#4f46e5] text-[#4f46e5] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-white overflow-hidden relative group">
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, 'signature_url')} />
              {formData.signature_url ? (
                <>
                  <img src={formData.signature_url} alt="Signature" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">Change</div>
                </>
              ) : (
                <span className="text-sm font-bold flex items-center gap-1">+ Add Signature</span>
              )}
            </label>`;
manageBizCode = manageBizCode.replace(sigBoxRegex, newSigBox);

fs.writeFileSync('src/pages/settings/tabs/ManageBusinessTab.jsx', manageBizCode);

// --- 3. BillView.jsx ---
let billViewCode = fs.readFileSync('src/pages/billing/BillView.jsx', 'utf8');

// Update Header Row in BillView
const headerRowRegex = /<div className="border-b border-black p-4 text-center">\s*<h1 className="text-xl font-bold text-black">\{shopSettings\?\.shop_name \|\| 'Om Namah Shivay'\}<\/h1>\s*<p className="text-xs text-black mt-1">\s*\{shopSettings\?\.address_line1 \|\| 'Estimate \/ Quotation, Odisha'\}\s*\{shopSettings\?\.address_line2 \? `, \$\{shopSettings\.address_line2\}` : ''\}\s*<\/p>\s*<\/div>/;

const newHeaderRow = `<div className="border-b border-black p-4 flex items-center gap-4">
                {shopSettings?.logo_url && (
                  <div className="w-24 h-24 flex-shrink-0">
                    <img src={shopSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 text-center pr-24">
                  <h1 className="text-xl font-bold text-black uppercase">{shopSettings?.shop_name || 'Om Namah Shivay'}</h1>
                  <p className="text-xs text-black mt-1 whitespace-pre-wrap">
                    {shopSettings?.address_line1 || 'Estimate / Quotation, Odisha'}{shopSettings?.city ? ', ' + shopSettings.city : ''}{shopSettings?.pincode ? ' - ' + shopSettings.pincode : ''}{shopSettings?.state ? ', ' + shopSettings.state : ''}
                  </p>
                  {shopSettings?.phone && <p className="text-xs text-black mt-0.5">Ph: {shopSettings.phone} {shopSettings.email && \`| Email: \${shopSettings.email}\`}</p>}
                  {shopSettings?.gst_registered && shopSettings?.gstin && <p className="text-xs font-bold text-black mt-1">GSTIN: {shopSettings.gstin}</p>}
                </div>
              </div>`;
billViewCode = billViewCode.replace(headerRowRegex, newHeaderRow);

// Update Footer Row to include signature
const totalsTableRegex = /<td colSpan="2" className="p-2 align-top text-right text-\[10px\] font-bold uppercase text-surface-500">\s*Total Amount<br\/>\(in words\)\s*<\/td>\s*<td colSpan="4" className="p-2 align-top text-xs text-black font-semibold capitalize">\s*Rupees \.\.\.\s*<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>/;
// Wait, myBillBook style usually has signature below the table.
// Let's find the closing table tag for items table.
const closingTableRegex = /<\/table>\s*<\/div>\s*<\/div>\s*<\/div>/;
const newFooterWithSig = `</table>
              
              <div className="flex border-t-0 p-4 min-h-[120px]">
                <div className="flex-1 text-xs">
                  <div className="font-bold mb-1">Terms & Conditions:</div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                    <li>Goods once sold will not be taken back.</li>
                    <li>Interest @ 18% p.a. will be charged if payment is delayed.</li>
                    <li>Subject to local jurisdiction.</li>
                  </ol>
                </div>
                <div className="w-48 flex flex-col items-center justify-end">
                  {shopSettings?.signature_url ? (
                    <img src={shopSettings.signature_url} alt="Signature" className="h-16 object-contain mb-1" />
                  ) : (
                    <div className="h-16"></div>
                  )}
                  <div className="border-t border-black w-full text-center pt-1 text-[10px] font-bold uppercase">
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>`;
billViewCode = billViewCode.replace(/<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, newFooterWithSig + '\n      </div>\n    </div>');

fs.writeFileSync('src/pages/billing/BillView.jsx', billViewCode);
console.log('Successfully applied all changes');
