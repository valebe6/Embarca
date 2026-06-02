export function runConciliation(pedidos, pagos) {
  const conciliados = [];
  const inconsistencias = [];

  const pedidosMap = new Map();
  pedidos.forEach(p => {
    pedidosMap.set(String(p.pedido), p);
  });

  const pagosMap = new Map();
  pagos.forEach(p => {
    pagosMap.set(String(p.pedido), p);
  });

  // 1. Process orders
  pedidos.forEach(order => {
    const orderId = String(order.pedido);
    const payment = pagosMap.get(orderId);

    if (order.estado === 'entregado') {
      if (!payment) {
        // Regla 1: Pedido entregado y sin pago
        inconsistencias.push({
          pedido: orderId,
          tipo: 'Pago faltante',
          descripcion: `El pedido por $${order.valor} está marcado como "entregado" pero no tiene ningún pago asociado.`
        });
      } else {
        // Regla 3: Pedido entregado con pago correcto
        if (order.valor === payment.pago_recibido) {
          conciliados.push({
            pedido: orderId,
            valor: order.valor,
            pago_recibido: payment.pago_recibido,
            estado: order.estado
          });
        } else {
          // Caso extra razonable: existe pago pero el valor difiere
          inconsistencias.push({
            pedido: orderId,
            tipo: 'Diferencia de valor',
            descripcion: `El pedido tiene un valor de $${order.valor} pero se recibió un pago de $${payment.pago_recibido}.`
          });
        }
      }
    } else if (order.estado === 'devuelto') {
      if (payment) {
        // Regla 2: Pedido devuelto con pago registrado
        inconsistencias.push({
          pedido: orderId,
          tipo: 'Pago sobre devolución',
          descripcion: `El pedido está "devuelto" pero se registró un pago de $${payment.pago_recibido}.`
        });
      }
    }
  });

  // 2. Process orphan payments (Regla 4)
  pagos.forEach(payment => {
    const paymentOrderId = String(payment.pedido);
    if (!pedidosMap.has(paymentOrderId)) {
      inconsistencias.push({
        pedido: paymentOrderId,
        tipo: 'Pago huérfano',
        descripcion: `Se registró un pago de $${payment.pago_recibido} para un pedido que no existe en el sistema.`
      });
    }
  });

  // Calculate metrics
  const totalPedidos = pedidos.length;
  const totalPagos = pagos.length;
  const totalConciliados = conciliados.length;
  const totalInconsistencias = inconsistencias.length;

  let indicadorRiesgo = 'Bajo';
  if (totalInconsistencias > 0) {
    const ratio = totalInconsistencias / (totalPedidos || 1);
    if (ratio > 0.3 || totalInconsistencias >= 3) {
      indicadorRiesgo = 'Alto';
    } else {
      indicadorRiesgo = 'Medio';
    }
  }

  // Simulated metrics
  const tiempoManual = 120; // 2 horas en minutos
  const tiempoIA = 5;       // 5 minutos
  const ahorroTiempo = tiempoManual - tiempoIA;
  const reduccionEsfuerzo = Math.round((ahorroTiempo / tiempoManual) * 100);

  return {
    conciliados,
    inconsistencias,
    metrics: {
      pedidosProcesados: totalPedidos,
      pagosProcesados: totalPagos,
      pedidosConciliados: totalConciliados,
      inconsistenciasDetectadas: totalInconsistencias,
      indicadorRiesgo,
      tiempoManualEstimadoMinutos: tiempoManual,
      tiempoIAEstimadoMinutos: tiempoIA,
      reduccionEsfuerzoPorcentaje: reduccionEsfuerzo
    }
  };
}
