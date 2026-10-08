import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import type { Table } from '../models/table.model'

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 't1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    restaurantId: 'r1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('TableStore', () => {
  let store: TableStore
  let service: {
    getAll: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    service = { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
    TestBed.configureTestingModule({
      providers: [{ provide: TableService, useValue: service }]
    })
    store = TestBed.inject(TableStore)
  })

  it('loadByRestaurant fills tables and clears loading', async () => {
    service.getAll.mockReturnValue(of([makeTable()]))

    await store.loadByRestaurant('r1')

    expect(service.getAll).toHaveBeenCalledWith('r1')
    expect(store.tables()).toHaveLength(1)
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('loadByRestaurant sets error when the service fails', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('boom')))

    await store.loadByRestaurant('r1')

    expect(store.error()).toBeTruthy()
    expect(store.tables()).toEqual([])
    expect(store.loading()).toBe(false)
  })

  it('create appends the new table', async () => {
    service.getAll.mockReturnValue(of([makeTable()]))
    await store.loadByRestaurant('r1')
    const created = makeTable({ id: 't2', number: 2 })
    service.create.mockReturnValue(of(created))

    await store.create('r1', { number: 2, capacity: 4 })

    expect(service.create).toHaveBeenCalledWith('r1', { number: 2, capacity: 4 })
    expect(store.tables().map(t => t.id)).toEqual(['t1', 't2'])
  })

  it('create propagates the API error and keeps the list', async () => {
    service.create.mockReturnValue(throwError(() => ({ error: { message: 'duplicate' } })))

    await expect(store.create('r1', { number: 1, capacity: 4 })).rejects.toBeTruthy()
    expect(store.tables()).toEqual([])
  })

  it('update replaces only the matching table', async () => {
    service.getAll.mockReturnValue(of([makeTable(), makeTable({ id: 't2', number: 2 })]))
    await store.loadByRestaurant('r1')
    service.update.mockReturnValue(of(makeTable({ capacity: 8 })))

    await store.update('r1', 't1', { number: 1, capacity: 8 })

    expect(store.tables().find(t => t.id === 't1')?.capacity).toBe(8)
    expect(store.tables().find(t => t.id === 't2')?.capacity).toBe(4)
  })

  it('delete removes the table from the list', async () => {
    service.getAll.mockReturnValue(of([makeTable(), makeTable({ id: 't2', number: 2 })]))
    await store.loadByRestaurant('r1')
    service.delete.mockReturnValue(of(undefined))

    await store.delete('r1', 't1')

    expect(service.delete).toHaveBeenCalledWith('r1', 't1')
    expect(store.tables().map(t => t.id)).toEqual(['t2'])
  })
})
