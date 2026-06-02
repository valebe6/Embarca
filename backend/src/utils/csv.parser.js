import { parse } from 'csv-parse/sync';

export function parseCSV(csvContent) {
  if (!csvContent) return [];
  
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map(record => {
      const parsed = {};
      for (const [key, value] of Object.entries(record)) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        
        if (trimmedKey === 'valor' || trimmedKey === 'pago_recibido') {
          parsed[trimmedKey] = Number(trimmedValue) || 0;
        } else {
          parsed[trimmedKey] = trimmedValue;
        }
      }
      return parsed;
    });
  } catch (error) {
    throw new Error('Error al parsear el archivo CSV: ' + error.message);
  }
}
