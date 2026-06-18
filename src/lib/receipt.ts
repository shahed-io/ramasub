import jsPDF from "jspdf";

export type ReceiptOrder = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  transaction_id: string;
  total: number;
  created_at: string;
  items: Array<{
    name?: string;
    slug: string;
    planPeriod: string;
    qty: number;
    price?: number;
  }>;
};

export function buildReceiptDoc(order: ReceiptOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;


  // Header bar
  doc.setFillColor(99, 102, 241); // violet
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("AccessNow BD", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Payment Receipt", margin, 64);

  doc.setFontSize(10);
  doc.text(
    `Date: ${new Date(order.created_at).toLocaleString()}`,
    pageW - margin,
    42,
    { align: "right" },
  );
  doc.text(
    `Receipt #${order.id.slice(0, 8).toUpperCase()}`,
    pageW - margin,
    64,
    { align: "right" },
  );

  y = 130;
  doc.setTextColor(20, 20, 30);

  // Customer + Payment columns
  const colW = (pageW - margin * 2) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Billed to", margin, y);
  doc.text("Payment", margin + colW, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 90);

  const billLines = [order.full_name, order.email, order.phone];
  billLines.forEach((line, i) => doc.text(line, margin, y + 18 + i * 14));

  // Payment column — labeled rows for clarity
  const payX = margin + colW;
  const labelColor: [number, number, number] = [130, 130, 140];
  const valueColor: [number, number, number] = [30, 30, 40];
  const methodLabel = (order.payment_method || "").toUpperCase();
  const refLabel =
    /stripe|card|visa|master/i.test(order.payment_method)
      ? "Reference ID"
      : "Transaction ID";

  const payRows: Array<[string, string]> = [
    ["Method", methodLabel || "—"],
    [refLabel, order.transaction_id || "—"],
  ];
  payRows.forEach(([label, value], i) => {
    const rowY = y + 18 + i * 28;
    doc.setTextColor(...labelColor);
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), payX, rowY);
    doc.setTextColor(...valueColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    // Wrap long IDs so they don't overflow the column.
    const wrapped = doc.splitTextToSize(value, colW - 8);
    doc.text(wrapped, payX, rowY + 12);
    doc.setFont("helvetica", "normal");
  });

  y += 90;

  // Items table header
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 30);
  doc.text("Item", margin, y);
  doc.text("Plan", margin + 240, y);
  doc.text("Qty", pageW - margin - 110, y, { align: "right" });
  doc.text("Amount", pageW - margin, y, { align: "right" });
  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  // Items rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 50);
  order.items.forEach((it) => {
    const lineTotal = (it.price ?? 0) * it.qty;
    doc.text(String(it.name ?? it.slug).slice(0, 40), margin, y);
    doc.text(String(it.planPeriod), margin + 240, y);
    doc.text(String(it.qty), pageW - margin - 110, y, { align: "right" });
    doc.text(`BDT ${lineTotal.toLocaleString()}`, pageW - margin, y, {
      align: "right",
    });
    y += 18;
  });

  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Paid", pageW - margin - 160, y);
  doc.setFontSize(16);
  doc.setTextColor(99, 102, 241);
  doc.text(`BDT ${Number(order.total).toLocaleString()}`, pageW - margin, y, {
    align: "right",
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  const footerY = doc.internal.pageSize.getHeight() - 50;
  doc.text(
    "Thank you for your purchase! For support, contact us anytime.",
    pageW / 2,
    footerY,
    { align: "center" },
  );
  doc.text(
    "AccessNow BD · Premium digital subscriptions",
    pageW / 2,
    footerY + 14,
    { align: "center" },
  );

  return doc;
}

export function receiptFileName(order: ReceiptOrder) {
  return `AccessNowBD-Receipt-${order.id.slice(0, 8).toUpperCase()}.pdf`;
}

export function downloadReceiptPdf(order: ReceiptOrder) {
  const doc = buildReceiptDoc(order);
  doc.save(receiptFileName(order));
}

export function getReceiptBlob(order: ReceiptOrder): Blob {
  const doc = buildReceiptDoc(order);
  return doc.output("blob");
}


