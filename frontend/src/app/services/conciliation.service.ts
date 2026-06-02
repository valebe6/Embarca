import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Pedido {
  pedido: string;
  valor: number;
  estado: string;
}

export interface Pago {
  pedido: string;
  pago_recibido: number;
}

export interface Inconsistencia {
  pedido: string;
  tipo: string;
  descripcion: string;
}

export interface Metrics {
  pedidosProcesados: number;
  pagosProcesados: number;
  pedidosConciliados: number;
  inconsistenciasDetectadas: number;
  indicadorRiesgo: string;
  tiempoManualEstimadoMinutos: number;
  tiempoIAEstimadoMinutos: number;
  reduccionEsfuerzoPorcentaje: number;
}

export interface ConciliationResult {
  conciliados: any[];
  inconsistencias: Inconsistencia[];
  metrics: Metrics;
}

export interface AIAnalysis {
  resumen: string;
  riesgo: string;
  recomendacion: string;
  confianza: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConciliationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  // Signals para el manejo del estado reactivo
  readonly pedidos = signal<Pedido[]>([]);
  readonly pagos = signal<Pago[]>([]);
  readonly conciliationResult = signal<ConciliationResult | null>(null);
  readonly aiAnalysis = signal<AIAnalysis | null>(null);
  readonly approvalDecision = signal<'approved' | 'rejected' | null>(null);

  uploadFiles(pedidosFile: File, pagosFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('pedidos', pedidosFile);
    formData.append('pagos', pagosFile);

    return this.http.post<any>(`${this.apiUrl}/upload`, formData).pipe(
      tap(res => {
        this.pedidos.set(res.pedidos || []);
        this.pagos.set(res.pagos || []);
        // Limpiar resultados anteriores al subir nuevos archivos
        this.conciliationResult.set(null);
        this.aiAnalysis.set(null);
        this.approvalDecision.set(null);
      })
    );
  }

  conciliate(): Observable<ConciliationResult> {
    // Si no hay archivos cargados pero se quiere simular, el backend lo manejará o fallará.
    return this.http.post<ConciliationResult>(`${this.apiUrl}/conciliate`, {
      pedidos: this.pedidos(),
      pagos: this.pagos()
    }).pipe(
      tap(res => {
        this.conciliationResult.set(res);
      })
    );
  }

  analyze(inconsistencias?: Inconsistencia[]): Observable<AIAnalysis> {
    const data = {
      inconsistencias: inconsistencias || this.conciliationResult()?.inconsistencias || []
    };

    return this.http.post<AIAnalysis>(`${this.apiUrl}/analyze`, data).pipe(
      tap(res => {
        this.aiAnalysis.set(res);
      })
    );
  }

  setApprovalDecision(decision: 'approved' | 'rejected'): void {
    this.approvalDecision.set(decision);
  }

  clearState(): void {
    this.pedidos.set([]);
    this.pagos.set([]);
    this.conciliationResult.set(null);
    this.aiAnalysis.set(null);
    this.approvalDecision.set(null);
  }
}
