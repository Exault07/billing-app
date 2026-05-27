import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title, columns, data) => {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  const head = [columns];
  const body = data.map(row => columns.map(col => row[col] || '-'));

  doc.autoTable({
    startY: 35,
    head: head,
    body: body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const exportToExcel = (title, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
};

export const printReport = (title, columns, data) => {
  const printWindow = window.open('', '_blank');
  
  const tableHeaders = columns.map(col => `<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f3f4f6;">${col}</th>`).join('');
  
  const tableRows = data.map(row => {
    const cells = columns.map(col => `<td style="padding: 8px; border-bottom: 1px solid #eee;">${row[col] || '-'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          h1 { color: #111827; font-size: 24px; margin-bottom: 5px; }
          p { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
