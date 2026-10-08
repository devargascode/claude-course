import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { CartComponent } from './cart.component'
import { OrderService } from '../../core/services/order.service'
import { CartStore, Dish } from '../../core/store/cart.store'

const dish: Dish = {
  id: 'd1',
  name: 'Dish',
  description: null,
  price: 5,
  category: 'Principal',
  available: true,
  restaurantId: 'r1',
  ingredients: []
}

describe('CartComponent confirmOrder', () => {
  let orderService: { createOrder: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    orderService = { createOrder: vi.fn().mockReturnValue(of({ id: 'o1' })) }
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: OrderService, useValue: orderService }]
    })
  })

  it('sends the table id and keeps the table after confirming', () => {
    const store = TestBed.inject(CartStore)
    store.setTable('r1', 't1')
    store.addItem(dish, 2)
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)

    TestBed.createComponent(CartComponent).componentInstance.confirmOrder()

    expect(orderService.createOrder).toHaveBeenCalledWith('r1', 't1', [
      { dishId: 'd1', quantity: 2, notes: null }
    ])
    expect(store.items()).toEqual([])
    expect(store.tableId()).toBe('t1')
    expect(navigate).toHaveBeenCalledWith(['/orders', 'o1'])
  })
})
