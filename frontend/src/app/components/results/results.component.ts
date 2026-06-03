import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ConciliationService, Inconsistencia } from '../../services/conciliation.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressBarModule
  ],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent {
  private conciliationService = inject(ConciliationService);
  private router = inject(Router);

  // Señales expuestas por el servicio
  result = this.conciliationService.conciliationResult;
  aiAnalysis = this.conciliationService.aiAnalysis;
  approvalDecision = this.conciliationService.approvalDecision;

  // Estados locales
  isLoadingAI = signal<boolean>(false);
  aiError = signal<string>('');

  // Columnas para tablas
  conciliadosColumns: string[] = ['pedido', 'valor', 'pago_recibido', 'estado'];
  inconsistenciasColumns: string[] = ['pedido', 'tipo', 'descripcion'];

  get conciliadosList() {
    return this.result()?.conciliados || [];
  }

  get inconsistenciasList(): Inconsistencia[] {
    return this.result()?.inconsistencias || [];
  }

  get metrics() {
    return this.result()?.metrics;
  }

  fetchAIAnalysis(): void {
    const list = this.inconsistenciasList;
    
    this.isLoadingAI.set(true);
    this.aiError.set('');

    this.conciliationService.analyze(list).subscribe({
      next: () => {
        this.isLoadingAI.set(false);
      },
      error: (err) => {
        this.isLoadingAI.set(false);
        this.aiError.set('Ocurrió un error al generar el análisis de la IA: ' + err.message);
      }
    });
  }

  approve(): void {
    this.conciliationService.setApprovalDecision('approved');
  }

  reject(): void {
    this.conciliationService.setApprovalDecision('rejected');
  }

  resetDecision(): void {
    this.conciliationService.approvalDecision.set(null);
  }

  backToUpload(): void {
    this.router.navigate(['/upload']);
  }

  getStrokeDashoffset(percent: number): number {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    return circumference - (percent / 100) * circumference;
  }
}
