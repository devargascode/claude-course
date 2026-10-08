import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TableService } from './table.service'
import type { Table } from '../models/table.model'

const table: Table = {
  id: 't1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  restaurantId: 'r1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('getAll sends GET to the restaurant tables URL', () => {
    let result: Table[] | undefined
    service.getAll('r1').subscribe(r => (result = r))

    const req = http.expectOne('/api/v1/restaurants/r1/tables')
    expect(req.request.method).toBe('GET')
    req.flush([table])
    expect(result).toEqual([table])
  })

  it('create sends POST with the DTO', () => {
    const dto = { number: 1, capacity: 4 }
    service.create('r1', dto).subscribe()

    const req = http.expectOne('/api/v1/restaurants/r1/tables')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(dto)
    req.flush(table)
  })

  it('update sends PUT to the table URL with the DTO', () => {
    const dto = { number: 2, capacity: 6 }
    service.update('r1', 't1', dto).subscribe()

    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1')
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(dto)
    req.flush(table)
  })

  it('delete sends DELETE to the table URL', () => {
    service.delete('r1', 't1').subscribe()

    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1')
    expect(req.request.method).toBe('DELETE')
    req.flush(null)
  })
})
