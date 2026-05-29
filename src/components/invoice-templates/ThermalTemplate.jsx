import React from 'react';

export default function ThermalTemplate({ bill, shop, settings }) {
  const is2Inch = settings?.thermal_print_size === '2inch';
  
  // Format helpers
  const formatCurrency = (amount) => `₹${Number(amount || 0).toFixed(2)}`;
  const formatQty = (qty, unit) => `${Number(qty || 0).toFixed(1)} ${unit || ''}`;

  return (
    <div className={`thermal-template ${is2Inch ? 'size-2inch' : 'size-3inch'}`}>
      
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="font-bold">{shop?.shop_name || 'My Shop'}</h2>
        <div className="text-sm">Estimate / Quotation</div>
        {shop?.phone && <div>Phone No: {shop.phone}</div>}
        {shop?.gstin && <div>GSTIN: {shop.gstin}</div>}
      </div>

      <div className="divider"></div>

      {/* Bill Info */}
      <div className="mb-2">
        <div>Invoice Number: {bill?.bill_no}</div>
        <div>Invoice Date: {bill?.date}</div>
        <div>Place of Supply: {bill?.party?.address || 'N/A'}</div>
        <div>Bill To: {bill?.party?.name || 'Cash Sale'}</div>
      </div>

      <div className="divider"></div>

      {/* Table Header */}
      <div className="table-header">
        <div className="col-sn">SN</div>
        <div className="col-items">Items</div>
        <div className="col-amt text-right">Amt</div>
      </div>
      <div className="table-subheader">
        <div className="col-qty">Qty</div>
        <div className="col-rate">Rate</div>
        <div className="col-mrp">MRP</div>
        <div className="col-tax text-right">Tax</div>
      </div>

      <div className="divider"></div>

      {/* Items */}
      <div className="items-list">
        {bill?.items?.map((item, idx) => (
          <div key={idx} className="item-row">
            <div className="item-main">
              <span className="col-sn">{idx + 1}</span>
              <span className="col-name">{item.name}</span>
              <span className="col-amt text-right">{formatCurrency(item.total)}</span>
            </div>
            <div className="item-sub">
              <span className="col-qty">{formatQty(item.qty, item.unit)}</span>
              <span className="col-rate">{item.price}</span>
              <span className="col-mrp">{item.price}</span>
              <span className="col-tax text-right">{item.tax}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="divider"></div>

      {/* Totals */}
      <div className="totals-row font-bold">
        <span>Sub Total</span>
        <span>{formatCurrency(bill?.subtotal)}</span>
      </div>
      
      <div className="divider"></div>

      <div className="totals-row">
        <span>Taxable Amount</span>
        <span>{formatCurrency(bill?.subtotal - (bill?.tax_amount || 0))}</span>
      </div>
      <div className="totals-row">
        <span>SGST</span>
        <span>{formatCurrency((bill?.tax_amount || 0) / 2)}</span>
      </div>
      <div className="totals-row">
        <span>CGST</span>
        <span>{formatCurrency((bill?.tax_amount || 0) / 2)}</span>
      </div>
      
      <div className="divider"></div>

      <div className="totals-row font-bold">
        <span>Total Amount</span>
        <span>{formatCurrency(bill?.grand_total)}</span>
      </div>
      <div className="totals-row">
        <span>Paid Amount</span>
        <span>{formatCurrency(bill?.advance_paid)}</span>
      </div>
      <div className="totals-row">
        <span>Balance Amount</span>
        <span>{formatCurrency(bill?.balance_due)}</span>
      </div>

      <div className="divider"></div>

      {/* Notes */}
      {bill?.notes && (
        <div className="notes mt-2">
          <div className="font-bold">Notes</div>
          <div>{bill.notes}</div>
        </div>
      )}

      {/* Print Specific CSS injected here to ensure it travels with the component */}
      <style>{`
        .thermal-template {
          font-family: 'Courier New', Courier, monospace;
          background: white;
          color: black;
          line-height: 1.2;
          padding: 4mm;
          margin: 0 auto;
          box-sizing: border-box;
        }
        
        /* Font scaling based on size */
        .thermal-template.size-2inch {
          width: 58mm;
          font-size: 8px;
        }
        
        .thermal-template.size-3inch {
          width: 80mm;
          font-size: 11px;
        }

        .thermal-template .divider {
          border-top: 1px dashed black;
          margin: 1.5mm 0;
        }

        .thermal-template .text-center { text-align: center; }
        .thermal-template .text-right { text-align: right; }
        .thermal-template .font-bold { font-weight: bold; }
        .thermal-template .mt-2 { margin-top: 2mm; }
        .thermal-template .mb-2 { margin-bottom: 2mm; }

        .thermal-template .table-header,
        .thermal-template .table-subheader {
          display: flex;
          width: 100%;
        }
        
        .thermal-template .table-subheader {
          margin-top: 1mm;
        }

        .thermal-template .item-row {
          margin-bottom: 1.5mm;
        }
        
        .thermal-template .item-main,
        .thermal-template .item-sub {
          display: flex;
          width: 100%;
        }

        .thermal-template .item-sub {
          margin-top: 0.5mm;
        }

        /* Column Widths */
        .thermal-template .col-sn { width: 10%; }
        .thermal-template .col-name { width: 65%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .thermal-template .col-items { width: 65%; }
        .thermal-template .col-amt { width: 25%; }
        
        .thermal-template .col-qty { width: 30%; }
        .thermal-template .col-rate { width: 25%; }
        .thermal-template .col-mrp { width: 20%; text-align: center; }
        .thermal-template .col-tax { width: 25%; }

        .thermal-template .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5mm;
        }
      `}</style>
    </div>
  );
}
