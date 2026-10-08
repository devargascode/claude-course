import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Table, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';
import { Order } from '../../orders/models/order.model';
import { OrderStore } from '../../orders/store/order.store';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);
  private readonly orderStore = inject(OrderStore);

  private readonly _tables = signal<Table[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Active orders grouped by table id, only for tables currently occupied.
   * Occupied tables without orders get an empty list; orders of tables that
   * are not occupied (or have no table) are ignored.
   */
  readonly ordersByTable = computed<Record<string, Order[]>>(() => {
    const grouped: Record<string, Order[]> = {};
    for (const table of this._tables()) {
      if (table.status === 'ocupada') {
        grouped[table.id] = [];
      }
    }
    for (const order of this.orderStore.orders()) {
      if (order.tableId && grouped[order.tableId]) {
        grouped[order.tableId].push(order);
      }
    }
    return grouped;
  });

  async loadTables(restaurantId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const tables = await firstValueFrom(this.tableService.getAll(restaurantId));
      this._tables.set(tables);
    } catch (err: any) {
      this._error.set(err.message || 'Error al cargar mesas');
    } finally {
      this._loading.set(false);
    }
  }

  async updateStatus(restaurantId: string, tableId: string, status: TableStatus): Promise<void> {
    const previous = this._tables();
    this._error.set(null);
    this._tables.update(tables =>
      tables.map(table => (table.id === tableId ? { ...table, status } : table))
    );
    try {
      const updated = await firstValueFrom(this.tableService.updateStatus(restaurantId, tableId, status));
      this._tables.update(tables =>
        tables.map(table => (table.id === tableId ? { ...table, ...updated } : table))
      );
    } catch (err: any) {
      this._tables.set(previous);
      this._error.set(err.message || 'Error al actualizar el estado de la mesa');
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.loadTables(restaurantId);
    this.pollingInterval = setInterval(() => {
      this.loadTables(restaurantId);
    }, 30000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
