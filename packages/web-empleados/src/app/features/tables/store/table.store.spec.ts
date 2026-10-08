import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TableStore } from './table.store';
import { TableService } from '../services/table.service';
import { OrderStore } from '../../orders/store/order.store';
import { Table, TableStatus } from '../models/table.model';
import { Order } from '../../orders/models/order.model';

function makeTable(id: string, status: TableStatus): Table {
  return {
    id,
    number: Number(id.replace('t', '')),
    description: null,
    capacity: 4,
    status,
    restaurantId: 'r1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };
}

function makeOrder(id: string, tableId: string | null): Order {
  return { id, restaurantId: 'r1', tableId, clientId: null, createdAt: '2026-01-01', items: [] };
}

describe('TableStore', () => {
  let store: TableStore;
  let service: { getAll: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn> };
  const orders = signal<Order[]>([]);

  beforeEach(() => {
    vi.useFakeTimers();
    orders.set([]);
    service = { getAll: vi.fn(), updateStatus: vi.fn() };
    service.getAll.mockReturnValue(of([makeTable('t1', 'libre'), makeTable('t2', 'ocupada')]));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TableService, useValue: service },
        { provide: OrderStore, useValue: { orders: orders.asReadonly() } }
      ]
    });
    store = TestBed.inject(TableStore);
  });

  afterEach(() => {
    store.stopPolling();
    vi.useRealTimers();
  });

  describe('loadTables', () => {
    it('loads tables into the store', async () => {
      await store.loadTables('r1');

      expect(store.tables().map(t => t.id)).toEqual(['t1', 't2']);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('sets the error when loading fails', async () => {
      service.getAll.mockReturnValue(throwError(() => new Error('boom')));

      await store.loadTables('r1');

      expect(store.error()).toBe('boom');
      expect(store.loading()).toBe(false);
    });
  });

  describe('updateStatus', () => {
    beforeEach(async () => {
      await store.loadTables('r1');
    });

    it('applies the new status and keeps it on success', async () => {
      service.updateStatus.mockReturnValue(of(makeTable('t1', 'reservada')));

      await store.updateStatus('r1', 't1', 'reservada');

      expect(service.updateStatus).toHaveBeenCalledWith('r1', 't1', 'reservada');
      expect(store.tables().find(t => t.id === 't1')?.status).toBe('reservada');
    });

    it('applies the status optimistically before the response', () => {
      service.updateStatus.mockReturnValue(new (class {
        subscribe() { return { unsubscribe() {} }; }
      })());

      void store.updateStatus('r1', 't1', 'reservada');

      expect(store.tables().find(t => t.id === 't1')?.status).toBe('reservada');
    });

    it('rolls back and sets the error when the request fails', async () => {
      service.updateStatus.mockReturnValue(throwError(() => new Error('fail')));

      await store.updateStatus('r1', 't1', 'reservada');

      expect(store.tables().find(t => t.id === 't1')?.status).toBe('libre');
      expect(store.error()).toBe('fail');
    });
  });

  describe('polling', () => {
    it('loads immediately and then every 30 seconds', async () => {
      store.startPolling('r1');
      expect(service.getAll).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(29999);
      expect(service.getAll).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(service.getAll).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(30000);
      expect(service.getAll).toHaveBeenCalledTimes(3);
    });

    it('stops loading after stopPolling', async () => {
      store.startPolling('r1');
      store.stopPolling();

      await vi.advanceTimersByTimeAsync(90000);

      expect(service.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('ordersByTable', () => {
    beforeEach(async () => {
      service.getAll.mockReturnValue(
        of([makeTable('t1', 'libre'), makeTable('t2', 'ocupada'), makeTable('t3', 'ocupada')])
      );
      await store.loadTables('r1');
    });

    it('gives an empty list to an occupied table without orders', () => {
      expect(store.ordersByTable()['t2']).toEqual([]);
    });

    it('groups orders by occupied table', () => {
      orders.set([makeOrder('o1', 't2'), makeOrder('o2', 't2'), makeOrder('o3', 't3')]);

      const grouped = store.ordersByTable();

      expect(grouped['t2']?.map(o => o.id)).toEqual(['o1', 'o2']);
      expect(grouped['t3']?.map(o => o.id)).toEqual(['o3']);
    });

    it('ignores orders of non-occupied tables and orders without table', () => {
      orders.set([makeOrder('o1', 't1'), makeOrder('o2', null), makeOrder('o3', 'unknown')]);

      const grouped = store.ordersByTable();

      expect(grouped['t1']).toBeUndefined();
      expect(Object.keys(grouped).sort()).toEqual(['t2', 't3']);
      expect(grouped['t2']).toEqual([]);
    });
  });
});
