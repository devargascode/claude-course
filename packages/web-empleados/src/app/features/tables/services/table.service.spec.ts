import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TableService } from './table.service';
import { Table } from '../models/table.model';

const table: Table = {
  id: 't1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  restaurantId: 'r1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
};

describe('TableService', () => {
  let service: TableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getAll requests the tables of the restaurant', () => {
    let result: Table[] | undefined;
    service.getAll('r1').subscribe(t => (result = t));

    const req = http.expectOne('/api/v1/restaurants/r1/tables');
    expect(req.request.method).toBe('GET');
    req.flush([table]);

    expect(result).toEqual([table]);
  });

  it('updateStatus patches the table status', () => {
    let result: Table | undefined;
    service.updateStatus('r1', 't1', 'ocupada').subscribe(t => (result = t));

    const req = http.expectOne('/api/v1/restaurants/r1/tables/t1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'ocupada' });
    req.flush({ ...table, status: 'ocupada' });

    expect(result?.status).toBe('ocupada');
  });
});
