import { TestBed, ComponentFixture } from '@angular/core/testing'
import { signal, importProvidersFrom } from '@angular/core'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { LucideAngularModule, Plus, Edit, Trash2, LayoutGrid } from 'lucide-angular'
import { TableListComponent } from './table-list.component'
import { TableStore } from '../../store/table.store'
import type { Table } from '../../models/table.model'

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 't1',
    number: 1,
    description: 'Window',
    capacity: 4,
    status: 'libre',
    restaurantId: 'r1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('TableListComponent', () => {
  let fixture: ComponentFixture<TableListComponent>
  const tables = signal<Table[]>([])
  const loading = signal(false)
  const error = signal<string | null>(null)
  const store = {
    tables,
    loading,
    error,
    loadByRestaurant: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(async () => {
    tables.set([])
    loading.set(false)
    error.set(null)
    store.loadByRestaurant.mockClear()
    store.delete.mockClear()

    await TestBed.configureTestingModule({
      imports: [TableListComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ Plus, Edit, Trash2, LayoutGrid })),
        { provide: TableStore, useValue: store },
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { params: { restaurantId: 'r1' } } } } }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(TableListComponent)
  })

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement
  }

  it('loads the tables of the route restaurant on init', async () => {
    fixture.detectChanges()
    expect(store.loadByRestaurant).toHaveBeenCalledWith('r1')
  })

  it('renders one row per table with number, capacity and status badge', async () => {
    tables.set([
      makeTable(),
      makeTable({ id: 't2', number: 2, capacity: 6, status: 'ocupada', description: null })
    ])
    fixture.detectChanges()

    const rows = el().querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Window')
    expect(rows[1].querySelector('.badge')?.textContent?.trim()).toBe('Ocupada')
    expect(rows[1].querySelector('.badge')?.className).toContain('status-ocupada')
  })

  it('renders the empty state when there are no tables', () => {
    fixture.detectChanges()

    expect(el().querySelector('.empty-state')).not.toBeNull()
    expect(el().querySelectorAll('tbody tr')).toHaveLength(0)
  })

  it('does not delete when the confirmation is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fixture.detectChanges()

    await fixture.componentInstance.onDelete('t1')

    expect(store.delete).not.toHaveBeenCalled()
  })

  it('deletes when the confirmation is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fixture.detectChanges()

    await fixture.componentInstance.onDelete('t1')

    expect(store.delete).toHaveBeenCalledWith('r1', 't1')
  })
})
