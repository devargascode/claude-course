import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { API_URL } from '@resttek/web-shared'
import { TableService } from './table.service'
import { Table } from '../models/table.model'

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  const table: Table = {
    id: 't1',
    number: 1,
    description: 'Window',
    capacity: 4,
    status: 'libre',
    restaurantId: 'r1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('gets available tables with partySize', () => {
    let result: Table[] = []
    service.getAvailable('r1', 3).subscribe(t => (result = t))

    const req = http.expectOne('/api/v1/public/restaurants/r1/tables/available?partySize=3')
    expect(req.request.method).toBe('GET')
    req.flush([table])
    expect(result).toEqual([table])
  })

  it('occupies a table with POST', () => {
    let result: Table | undefined
    service.occupy('r1', 't1').subscribe(t => (result = t))

    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1/occupy')
    expect(req.request.method).toBe('POST')
    req.flush({ ...table, status: 'ocupada' })
    expect(result?.status).toBe('ocupada')
  })
})
