import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

try {
  if (apiKey && !apiKey.startsWith('YOUR_')) {
    ai = new GoogleGenerativeAI(apiKey);
  }
} catch (e) {
  console.error('Error al inicializar Google Generative AI:', e.message);
}

export async function analyzeInconsistencies(inconsistencias) {
  if (!inconsistencias || inconsistencias.length === 0) {
    return {
      resumen: 'No se detectaron inconsistencias en la conciliación. Todos los cobros coinciden con sus respectivos pedidos entregados.',
      riesgo: 'Bajo',
      recomendacion: 'Mantener el flujo operativo actual. No se requiere ninguna acción correctiva.',
      confianza: 100
    };
  }

  // Generador de fallback inteligente si la API falla o no está configurada
  const getFallbackData = () => {
    const types = inconsistencias.map(inc => inc.tipo);
    const hasOrphan = types.includes('Pago huérfano');
    const hasMissing = types.includes('Pago faltante');
    const hasRefund = types.includes('Pago sobre devolución');
    const hasDiff = types.includes('Diferencia de valor');

    let riesgo = 'Bajo';
    if (inconsistencias.length >= 3) {
      riesgo = 'Alto';
    } else if (inconsistencias.length > 0) {
      riesgo = 'Medio';
    }

    const totalIncs = inconsistencias.length;
    let resumen = `Análisis (Simulación IA): Se han detectado ${totalIncs} inconsistencias en este lote. `;
    const hallazgos = [];
    if (hasMissing) hallazgos.push('pedidos entregados que no registran ningún pago');
    if (hasRefund) hallazgos.push('pagos aplicados sobre pedidos devueltos');
    if (hasOrphan) hallazgos.push('pagos registrados para pedidos inexistentes en la base de datos');
    if (hasDiff) hallazgos.push('discrepancias entre el valor facturado y el pago real recibido');
    resumen += `Esto incluye principalmente: ${hallazgos.join(', ')}.`;

    const recomendacionesList = [];
    inconsistencias.forEach(inc => {
      if (inc.tipo === 'Pago faltante') {
        recomendacionesList.push(`- Solicitar cobro a la transportadora para el pedido #${inc.pedido} que ya fue entregado.`);
      } else if (inc.tipo === 'Pago sobre devolución') {
        recomendacionesList.push(`- Iniciar reclamo de devolución del pago para el pedido #${inc.pedido} debido a que fue retornado al inventario.`);
      } else if (inc.tipo === 'Pago huérfano') {
        recomendacionesList.push(`- Rastrear en la pasarela de pagos el origen del ID de pedido #${inc.pedido} para asociarlo al cliente correcto.`);
      } else if (inc.tipo === 'Diferencia de valor') {
        recomendacionesList.push(`- Ajustar la cuenta corriente del pedido #${inc.pedido} con la transportadora para recuperar el valor faltante.`);
      }
    });

    const recomendacion = `Acciones recomendadas urgentes:\n${recomendacionesList.join('\n')}\n\nSe sugiere auditar los estados logísticos con las transportadoras de inmediato para evitar pérdidas de caja.`;

    return {
      resumen,
      riesgo,
      recomendacion,
      confianza: 90
    };
  };

  if (!ai) {
    console.log('Gemini API key no está activa o tiene formato incorrecto. Usando análisis inteligente simulado.');
    return getFallbackData();
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Eres un analista financiero especializado en ecommerce y logística para dropshippers.
Analiza la siguiente lista de inconsistencias detectadas entre el reporte de pedidos y el reporte de pagos recibidos:

${JSON.stringify(inconsistencias, null, 2)}

Genera un reporte estructurado EXACTAMENTE en formato JSON. No escribas texto introductorio, ni bloques de código markdown adicionales (no uses \`\`\`json ni nada de eso), entrega el JSON puro.
La estructura del JSON debe ser exactamente:
{
  "resumen": "Resumen ejecutivo del análisis de las inconsistencias y su impacto potencial en el flujo de caja.",
  "riesgo": "Bajo" o "Medio" o "Alto" (dependiendo de la severidad),
  "recomendacion": "Una recomendación detallada y paso a paso sobre qué acciones operativas debe tomar el dropshipper (con pedidos específicos).",
  "confianza": un número entero de 0 a 100 que represente el nivel de confianza de la IA en su recomendación.
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    let cleanJson = text;
    // Si Gemini devuelve markdown, limpiarlo
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanJson);
      if (parsed.resumen && parsed.riesgo && parsed.recomendacion && parsed.confianza !== undefined) {
        return {
          resumen: parsed.resumen,
          riesgo: parsed.riesgo,
          recomendacion: parsed.recomendacion,
          confianza: Number(parsed.confianza) || 85
        };
      }
    } catch (parseError) {
      console.error('Error parseando JSON de Gemini, usando fallback:', text, parseError);
    }

    return getFallbackData();
  } catch (error) {
    console.error('Error llamando a la API de Gemini, usando fallback:', error.message);
    return getFallbackData();
  }
}
