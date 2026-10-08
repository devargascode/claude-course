import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { OrderService } from './order.service'

describe('OrderService', () => {
  let service: OrderService
  let http: HttpTestingController
  const items = [{ dishId: 'd1', quantity: 2, notes: null }]

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(OrderService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('sends the tableId in the POST body', () => {
    service.createOrder('r1', 't1', items).subscribe()
    const req = http.expectOne('/api/v1/orders')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ restaurantId: 'r1', tableId: 't1', items })
    req.flush({})
  })

  it('sends null tableId when there is no table', () => {
    service.createOrder('r1', null, items).subscribe()
    const req = http.expectOne('/api/v1/orders')
    expect(req.request.body.tableId).toBeNull()
    req.flush({})
  })
})
