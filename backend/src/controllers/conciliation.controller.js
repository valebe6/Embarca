import { parseCSV } from '../utils/csv.parser.js';
import { runConciliation } from '../services/conciliation.service.js';
import { analyzeInconsistencies } from '../services/gemini.service.js';

// Base de datos temporal en memoria
const db = {
  pedidos: [],
  pagos: []
};

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || (!req.files.pedidos && !req.files.pagos)) {
      return res.status(400).json({ error: 'Debes cargar los archivos pedidos.csv y pagos.csv.' });
    }

    const pedidosFile = req.files.pedidos ? req.files.pedidos[0] : null;
    const pagosFile = req.files.pagos ? req.files.pagos[0] : null;

    if (!pedidosFile || !pagosFile) {
      return res.status(400).json({ error: 'Ambos archivos (pedidos.csv y pagos.csv) son obligatorios.' });
    }

    // Parsear pedidos
    const pedidosCsvContent = pedidosFile.buffer.toString('utf-8');
    const parsedPedidos = parseCSV(pedidosCsvContent);

    // Parsear pagos
    const pagosCsvContent = pagosFile.buffer.toString('utf-8');
    const parsedPagos = parseCSV(pagosCsvContent);

    // Validar columnas requeridas
    if (parsedPedidos.length > 0) {
      const firstRow = parsedPedidos[0];
      if (!('pedido' in firstRow) || !('valor' in firstRow) || !('estado' in firstRow)) {
        return res.status(400).json({ error: 'El archivo de pedidos debe contener las columnas: pedido, valor, estado' });
      }
    }

    if (parsedPagos.length > 0) {
      const firstRow = parsedPagos[0];
      if (!('pedido' in firstRow) || !('pago_recibido' in firstRow)) {
        return res.status(400).json({ error: 'El archivo de pagos debe contener las columnas: pedido, pago_recibido' });
      }
    }

    // Guardar en la base de datos temporal
    db.pedidos = parsedPedidos;
    db.pagos = parsedPagos;

    return res.status(200).json({
      message: 'Archivos CSV procesados y cargados exitosamente.',
      pedidos: db.pedidos,
      pagos: db.pagos
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const conciliate = async (req, res) => {
  try {
    // Si el cliente envía datos directamente en el body, los priorizamos. Si no, usamos lo que esté en memoria.
    const pedidos = req.body.pedidos || db.pedidos;
    const pagos = req.body.pagos || db.pagos;

    if (!pedidos || pedidos.length === 0) {
      return res.status(400).json({ error: 'No hay pedidos cargados para conciliar. Sube los archivos primero.' });
    }

    const result = runConciliation(pedidos, pagos);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const analyze = async (req, res) => {
  try {
    const { inconsistencias } = req.body;
    
    // Si no se envían inconsistencias en el body, podemos tomar las que resultarían de conciliar lo que hay en db
    let dataToAnalyze = inconsistencias;
    if (!dataToAnalyze) {
      const result = runConciliation(db.pedidos, db.pagos);
      dataToAnalyze = result.inconsistencias;
    }

    const analysis = await analyzeInconsistencies(dataToAnalyze);
    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
