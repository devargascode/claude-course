import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { MesasComponent } from './mesas.component';
import { TableStore } from '../../store/table.store';
import { OrderStore } from '../../../orders/store/order.store';
import { Table } from '../../models/table.model';
import { Order } from '../../../orders/models/order.model';

const tables: Table[] = [
  { id: 't1', number: 1, description: 'Terraza', capacity: 2, status: 'libre', restaurantId: 'r1', createdAt: '', updatedAt: '' },
  { id: 't2', number: 2, description: null, capacity: 4, status: 'ocupada', restaurantId: 'r1', createdAt: '', updatedAt: '' },
  { id: 't3', number: 3, description: null, capacity: 6, status: 'ocupada', restaurantId: 'r1', createdAt: '', updatedAt: '' }
];

const order: Order = {
  id: 'abcdef123456',
  restaurantId: 'r1',
  tableId: 't2',
  clientId: null,
  createdAt: '',
  items: [
    { id: 'i1', dishId: 'd1', quantity: 2, notes: null, status: 'preparando', dishName: 'Paella' },
    { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'listo', dishName: 'Flan' }
  ]
};

describe('MesasComponent', () => {
  let fixture: ComponentFixture<MesasComponent>;
  let el: HTMLElement;
  let tableStore: {
    tables: ReturnType<typeof signal<Table[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    ordersByTable: ReturnType<typeof signal<Record<string, Order[]>>>;
    startPolling: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
  };
  let orderStore: { startPolling: ReturnType<typeof vi.fn>; stopPolling: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tableStore = {
      tables: signal(tables),
      loading: signal(false),
      error: signal<string | null>(null),
      ordersByTable: signal<Record<string, Order[]>>({ t2: [order], t3: [] }),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      updateStatus: vi.fn()
    };
    orderStore = { startPolling: vi.fn(), stopPolling: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MesasComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: TableStore, useValue: tableStore },
        { provide: OrderStore, useValue: orderStore },
        { provide: AuthStore, useValue: { user: signal({ restaurantId: 'r1' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MesasComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('starts polling tables and orders for the user restaurant', () => {
    expect(tableStore.startPolling).toHaveBeenCalledWith('r1');
    expect(orderStore.startPolling).toHaveBeenCalledWith('r1');
  });

  it('stops polling on destroy', () => {
    fixture.destroy();

    expect(tableStore.stopPolling).toHaveBeenCalled();
    expect(orderStore.stopPolling).toHaveBeenCalled();
  });

  it('renders a card per table with number, capacity and status', () => {
    const cards = el.querySelectorAll('.table-card');

    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Mesa 1');
    expect(cards[0].textContent).toContain('Capacidad: 2');
    expect(cards[0].textContent).toContain('libre');
  });

  it('calls the store when the status is changed', () => {
    const select = el.querySelector('#status-t1') as HTMLSelectElement;
    select.value = 'reservada';
    select.dispatchEvent(new Event('change'));

    expect(tableStore.updateStatus).toHaveBeenCalledWith('r1', 't1', 'reservada');
  });

  it('renders orders with item statuses on occupied tables', () => {
    const card = el.querySelectorAll('.table-card')[1];

    expect(card.textContent).toContain('Pedido #abcdef12');
    expect(card.textContent).toContain('2x Paella');
    expect(card.querySelector('.badge-preparando')).not.toBeNull();
    expect(card.querySelector('.badge-listo')).not.toBeNull();
  });

  it('shows an empty message for occupied tables without orders', () => {
    const card = el.querySelectorAll('.table-card')[2];

    expect(card.textContent).toContain('Sin pedidos activos');
  });

  it('does not show orders on tables that are not occupied', () => {
    const card = el.querySelectorAll('.table-card')[0];

    expect(card.querySelector('.table-orders')).toBeNull();
  });
});
