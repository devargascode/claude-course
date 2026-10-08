import { TestBed } from '@angular/core/testing'
import { CartStore, Dish } from './cart.store'

const makeDish = (id: string, restaurantId = 'r1'): Dish => ({
  id,
  name: `Dish ${id}`,
  description: null,
  price: 10,
  category: 'Principal',
  available: true,
  restaurantId,
  ingredients: []
})

describe('CartStore table handling', () => {
  let store: CartStore

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(CartStore)
  })

  it('starts without a table', () => {
    expect(store.tableId()).toBeNull()
  })

  it('stores the table and its restaurant', () => {
    store.setTable('r1', 't1')
    expect(store.tableId()).toBe('t1')
    expect(store.restaurantId()).toBe('r1')
  })

  it('clear removes the table', () => {
    store.setTable('r1', 't1')
    store.clear()
    expect(store.tableId()).toBeNull()
    expect(store.restaurantId()).toBeNull()
  })

  it('adding a dish from another restaurant clears the table and items', () => {
    store.setTable('r1', 't1')
    store.addItem(makeDish('d1', 'r2'))
    expect(store.tableId()).toBeNull()
    expect(store.items().length).toBe(1)
  })

  it('setTable for another restaurant clears existing items', () => {
    store.addItem(makeDish('d1', 'r1'))
    store.setTable('r2', 't9')
    expect(store.items()).toEqual([])
    expect(store.tableId()).toBe('t9')
  })

  it('keeps the table when the cart becomes empty', () => {
    store.setTable('r1', 't1')
    store.addItem(makeDish('d1'))
    store.removeItem('d1')
    expect(store.tableId()).toBe('t1')
    expect(store.restaurantId()).toBe('r1')
  })

  it('clearItems empties the cart but keeps the table', () => {
    store.setTable('r1', 't1')
    store.addItem(makeDish('d1'))
    store.clearItems()
    expect(store.items()).toEqual([])
    expect(store.tableId()).toBe('t1')
    expect(store.restaurantId()).toBe('r1')
  })
})
