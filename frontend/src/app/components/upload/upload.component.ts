import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ConciliationService } from '../../services/conciliation.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  private conciliationService = inject(ConciliationService);
  private router = inject(Router);

  pedidosFile = signal<File | null>(null);
  pagosFile = signal<File | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  onPedidosSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        this.pedidosFile.set(file);
        this.errorMessage.set('');
      } else {
        this.errorMessage.set('El archivo de pedidos debe ser un archivo CSV válido (.csv)');
      }
    }
  }

  onPagosSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        this.pagosFile.set(file);
        this.errorMessage.set('');
      } else {
        this.errorMessage.set('El archivo de pagos debe ser un archivo CSV válido (.csv)');
      }
    }
  }

  uploadAndConciliate(): void {
    const pedidos = this.pedidosFile();
    const pagos = this.pagosFile();

    if (!pedidos || !pagos) {
      this.errorMessage.set('Por favor, selecciona ambos archivos CSV para continuar.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.conciliationService.uploadFiles(pedidos, pagos).subscribe({
      next: () => {
        // Ejecutar la conciliación inmediatamente después de subir los archivos
        this.conciliationService.conciliate().subscribe({
          next: () => {
            this.isLoading.set(false);
            this.router.navigate(['/results']);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set('Error durante el proceso de conciliación: ' + (err.error?.error || err.message));
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar los archivos: ' + (err.error?.error || err.message));
      }
    });
  }

  // Cargar escenarios de demostración predefinidos con un click
  loadScenario(scenario: number): void {
    let pedidosCsv = '';
    let pagosCsv = '';
    let scenarioName = '';

    if (scenario === 1) {
      scenarioName = 'Escenario_1_Conciliado';
      pedidosCsv = `pedido,valor,estado
1001,50000,entregado
1002,30000,entregado
1003,45000,entregado`;
      pagosCsv = `pedido,pago_recibido
1001,50000
1002,30000
1003,45000`;
    } else if (scenario === 2) {
      scenarioName = 'Escenario_2_Inconsistencias';
      pedidosCsv = `pedido,valor,estado
1001,50000,entregado
1002,80000,entregado
1003,60000,devuelto`;
      pagosCsv = `pedido,pago_recibido
1001,50000
1003,60000`;
    } else if (scenario === 3) {
      scenarioName = 'Escenario_3_Critico';
      pedidosCsv = `pedido,valor,estado
1001,50000,entregado
1002,80000,entregado
1003,60000,devuelto
1004,120000,entregado`;
      pagosCsv = `pedido,pago_recibido
1001,50000
1003,60000
1005,45000`;
    }

    // Convertir strings CSV a archivos Blob/File en JS
    const pedidosBlob = new Blob([pedidosCsv], { type: 'text/csv' });
    const pagosBlob = new Blob([pagosCsv], { type: 'text/csv' });

    const pFile = new File([pedidosBlob], `${scenarioName}_pedidos.csv`, { type: 'text/csv' });
    const payFile = new File([pagosBlob], `${scenarioName}_pagos.csv`, { type: 'text/csv' });

    this.pedidosFile.set(pFile);
    this.pagosFile.set(payFile);
    this.errorMessage.set('');

    // Disparar conciliación automáticamente al cargar un escenario rápido
    this.uploadAndConciliate();
  }
}
