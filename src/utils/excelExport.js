/**
 * Universal Excel / CSV Exporter for Admin Panel
 * Formats JSON data arrays into clean downloadable CSV / Excel files with UTF-8 BOM encoding.
 * 
 * @param {Array<Object>} data Array of data objects
 * @param {Array<{label: string, key: string | function}>} columns Definitions for column labels and value getters
 * @param {string} filename Name of exported file without extension
 */
export const exportToExcel = (data, columns, filename = "Report") => {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // 1. Build Header Row
  const headers = columns.map(col => `"${col.label.replace(/"/g, '""')}"`);

  // 2. Build Data Rows
  const rows = data.map(item => {
    return columns.map(col => {
      let rawVal = "";
      if (typeof col.key === "function") {
        rawVal = col.key(item);
      } else if (typeof col.key === "string" && col.key.includes(".")) {
        // Deep key lookup e.g. "salesPerson.name"
        rawVal = col.key.split(".").reduce((acc, part) => acc && acc[part], item);
      } else {
        rawVal = item[col.key];
      }

      if (rawVal === null || rawVal === undefined) {
        rawVal = "";
      } else if (rawVal instanceof Date) {
        rawVal = rawVal.toLocaleString("en-IN");
      } else {
        rawVal = String(rawVal);
      }

      // Escape double quotes and enclose in quotes
      return `"${rawVal.replace(/"/g, '""')}"`;
    }).join(",");
  });

  // Combine CSV content with UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const cleanFilename = `${filename.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;

  link.href = url;
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
