// Export configuration interfaces
export interface ExportConfig {
  filename: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  includeHeaders: boolean;
  dateFormat?: string;
  customHeaders?: { [key: string]: string };
}

export interface PDFConfig extends ExportConfig {
  title: string;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'letter';
  includeCharts?: boolean;
  includeMetadata?: boolean;
}

export interface ChartExportConfig {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  width: number;
  height: number;
  quality?: number;
  backgroundColor?: string;
}

// CSV Export utilities
export const exportToCSV = (data: any[], config: ExportConfig): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const customHeaders = config.customHeaders || {};
  
  // Create CSV header row
  const headerRow = config.includeHeaders 
    ? headers.map(header => customHeaders[header] || header).join(',')
    : '';
  
  // Create CSV data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle special data types
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      } else if (value instanceof Date) {
        return formatDateForExport(value, config.dateFormat);
      } else if (typeof value === 'number') {
        return value.toString();
      } else {
        return String(value);
      }
    }).join(',');
  });
  
  // Combine header and data
  const csvContent = config.includeHeaders 
    ? [headerRow, ...dataRows].join('\n')
    : dataRows.join('\n');
  
  // Download CSV file
  downloadFile(csvContent, config.filename, 'text/csv');
};

// Excel Export utilities
export const exportToExcel = (data: any[], config: ExportConfig): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create workbook data structure
  const headers = Object.keys(data[0]);
  const customHeaders = config.customHeaders || {};
  
  const worksheetData = [];
  
  // Add headers if required
  if (config.includeHeaders) {
    worksheetData.push(headers.map(header => customHeaders[header] || header));
  }
  
  // Add data rows
  data.forEach(row => {
    const rowData = headers.map(header => {
      const value = row[header];
      
      if (value === null || value === undefined) {
        return '';
      } else if (value instanceof Date) {
        return formatDateForExport(value, config.dateFormat);
      } else {
        return value;
      }
    });
    
    worksheetData.push(rowData);
  });
  
  // Convert to Excel format (simplified for browser)
  const excelContent = createExcelContent(worksheetData);
  downloadFile(excelContent, config.filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

// JSON Export utilities
export const exportToJSON = (data: any[], config: ExportConfig): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      recordCount: data.length,
      generatedBy: 'FreshFlow Admin Dashboard'
    },
    data: data.map(row => {
      const processedRow: any = {};
      
      Object.keys(row).forEach(key => {
        const value = row[key];
        
        if (value instanceof Date) {
          processedRow[key] = formatDateForExport(value, config.dateFormat);
        } else {
          processedRow[key] = value;
        }
      });
      
      return processedRow;
    })
  };
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, config.filename, 'application/json');
};

// PDF Export utilities
export const exportToPDF = async (data: any[], config: PDFConfig, chartElements?: HTMLElement[]): Promise<void> => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create PDF content structure
  const pdfContent = createPDFContent(data, config, chartElements);
  
  // Generate PDF (this would typically use a library like jsPDF)
  const pdfBlob = await generatePDFBlob(pdfContent, config);
  
  // Download PDF file
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Chart export utilities
export const exportChart = (chartElement: HTMLElement, config: ChartExportConfig): void => {
  if (!chartElement) {
    console.warn('No chart element to export');
    return;
  }

  // Convert chart to canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }
  
  canvas.width = config.width;
  canvas.height = config.height;
  
  // Set background color if specified
  if (config.backgroundColor) {
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Convert SVG or HTML element to canvas
  convertElementToCanvas(chartElement, canvas, config).then(() => {
    // Export based on format
    switch (config.format) {
      case 'png':
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, 'chart.png', 'image/png');
        }, 'image/png', config.quality || 0.9);
        break;
      case 'jpg':
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, 'chart.jpg', 'image/jpeg');
        }, 'image/jpeg', config.quality || 0.9);
        break;
      case 'svg':
        exportSVG(chartElement);
        break;
      case 'pdf':
        exportChartToPDF(canvas);
        break;
    }
  });
};

// Multiple sheet Excel export
export const exportMultipleSheets = (
  sheets: { name: string; data: any[] }[],
  filename: string
): void => {
  const workbook = {
    SheetNames: sheets.map(sheet => sheet.name),
    Sheets: {} as any
  };
  
  sheets.forEach(sheet => {
    const worksheetData = [];
    
    if (sheet.data.length > 0) {
      const headers = Object.keys(sheet.data[0]);
      worksheetData.push(headers);
      
      sheet.data.forEach(row => {
        worksheetData.push(headers.map(header => row[header] || ''));
      });
    }
    
    workbook.Sheets[sheet.name] = createWorksheet(worksheetData);
  });
  
    const excelBuffer = createExcelBuffer(workbook);
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(excelBlob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

};

// Batch export utilities
export const batchExport = async (
  exports: { data: any[]; config: ExportConfig }[],
  zipFilename?: string
): Promise<void> => {
  const files: { name: string; content: string | Blob }[] = [];
  
  for (const exportItem of exports) {
    const { data, config } = exportItem;
    
    switch (config.format) {
      case 'csv':
        const csvContent = generateCSVContent(data, config);
        files.push({ name: config.filename, content: csvContent });
        break;
      case 'json':
        const jsonContent = generateJSONContent(data, config);
        files.push({ name: config.filename, content: jsonContent });
        break;
      case 'xlsx':
        const excelBlob = generateExcelBlob(data, config);
        files.push({ name: config.filename, content: excelBlob });
        break;
    }
  }
  
  if (zipFilename && files.length > 1) {
    const zipBlob = await createZipFile(files);
    downloadBlob(zipBlob, zipFilename, 'application/zip');
  } else {
    files.forEach(file => {
      if (typeof file.content === 'string') {
        downloadFile(file.content, file.name, 'text/plain');
      } else {
        downloadBlob(file.content, file.name, file.content.type);
      }
    });
  }
};

// Template-based export
export const exportWithTemplate = (
  data: any[],
  templateConfig: {
    headers: { key: string; label: string; width?: number }[];
    formatting: { [key: string]: (value: any) => string };
    styling?: { [key: string]: any };
  },
  config: ExportConfig
): void => {
  const processedData = data.map(row => {
    const processedRow: any = {};
    
    templateConfig.headers.forEach(header => {
      const value = row[header.key];
      const formatter = templateConfig.formatting[header.key];
      
      processedRow[header.key] = formatter ? formatter(value) : value;
    });
    
    return processedRow;
  });
  
  const customHeaders: { [key: string]: string } = {};
  templateConfig.headers.forEach(header => {
    customHeaders[header.key] = header.label;
  });
  
  const finalConfig = {
    ...config,
    customHeaders
  };
  
  switch (config.format) {
    case 'csv':
      exportToCSV(processedData, finalConfig);
      break;
    case 'xlsx':
      exportToExcel(processedData, finalConfig);
      break;
    case 'json':
      exportToJSON(processedData, finalConfig);
      break;
    case 'pdf':
      exportToPDF(processedData, finalConfig as PDFConfig);
      break;
  }
};

// Helper functions
const formatDateForExport = (date: Date, format?: string): string => {
  if (!format) {
    return date.toISOString();
  }
  
  switch (format) {
    case 'dd-mm-yyyy':
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    case 'mm-dd-yyyy':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`;
    case 'yyyy-mm-dd':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    default:
      return date.toISOString();
  }
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename, mimeType);
};

const downloadBlob = (blob: Blob, filename: string, mimeType: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const createExcelContent = (data: any[][]): string => {
  // Simplified Excel XML format
  let xml = '<?xml version="1.0"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Sheet1">\n';
  xml += '<Table>\n';
  
  data.forEach(row => {
    xml += '<Row>\n';
    row.forEach(cell => {
      xml += `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
  });
  
  xml += '</Table>\n';
  xml += '</Worksheet>\n';
  xml += '</Workbook>';
  
  return xml;
};

const createPDFContent = (data: any[], config: PDFConfig, chartElements?: HTMLElement[]): any => {
  return {
    title: config.title,
    orientation: config.orientation,
    pageSize: config.pageSize,
    data: data,
    charts: chartElements || [],
    metadata: config.includeMetadata ? {
      generatedBy: 'FreshFlow Admin Dashboard',
      generatedOn: new Date().toISOString(),
      recordCount: data.length
    } : null
  };
};

const generatePDFBlob = async (content: any, config: PDFConfig): Promise<Blob> => {
  // This would typically use a library like jsPDF or Puppeteer
  // For now, return a mock blob
  return new Blob(['PDF content placeholder'], { type: 'application/pdf' });
};

const convertElementToCanvas = async (element: HTMLElement, canvas: HTMLCanvasElement, config: ChartExportConfig): Promise<void> => {
  // This would typically use html2canvas or similar library
  return Promise.resolve();
};

const exportSVG = (element: HTMLElement): void => {
  const svgElement = element.querySelector('svg');
  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    downloadBlob(blob, 'chart.svg', 'image/svg+xml');
  }
};

const exportChartToPDF = (canvas: HTMLCanvasElement): void => {
  // Convert canvas to PDF
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'chart.pdf', 'application/pdf');
  });
};

const createWorksheet = (data: any[][]): any => {
  // Simplified worksheet creation
  return {
    '!ref': `A1:${String.fromCharCode(65 + data[0].length - 1)}${data.length}`,
    ...data.reduce((acc, row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellAddress = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        acc[cellAddress] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };
      });
      return acc;
    }, {} as any)
  };
};

const createExcelBuffer = (workbook: any): ArrayBuffer => {
  // This would typically use SheetJS or similar library
  return new ArrayBuffer(0);
};

const generateCSVContent = (data: any[], config: ExportConfig): string => {
  const headers = Object.keys(data[0] || {});
  const rows = [
    config.includeHeaders ? headers.join(',') : null,
    ...data.map(row => headers.map(h => row[h] || '').join(','))
  ].filter(Boolean);
  
  return rows.join('\n');
};

const generateJSONContent = (data: any[], config: ExportConfig): string => {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    data
  }, null, 2);
};

const generateExcelBlob = (data: any[], config: ExportConfig): Blob => {
  const content = createExcelContent([Object.keys(data[0] || {}), ...data.map(row => Object.values(row))]);
  return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const createZipFile = async (files: { name: string; content: string | Blob }[]): Promise<Blob> => {
  // This would typically use JSZip or similar library
  return new Blob(['ZIP content placeholder'], { type: 'application/zip' });
};

// exportHelpers.ts
export const exportHelpers = {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
  exportMultipleSheets,
  batchExport,
  exportWithTemplate,
  // Add other functions here
};
