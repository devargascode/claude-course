import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, provideRouter, Router, UrlTree } from '@angular/router'
import { tableSelectedGuard } from './table-selected.guard'
import { CartStore } from '../store/cart.store'

describe('tableSelectedGuard', () => {
  let store: CartStore
  let router: Router

  const run = () => {
    const route = { paramMap: new Map([['id', 'r1']]) } as unknown as ActivatedRouteSnapshot
    return TestBed.runInInjectionContext(() => tableSelectedGuard(route, {} as never))
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] })
    store = TestBed.inject(CartStore)
    router = TestBed.inject(Router)
  })

  it('allows access when the table of this restaurant is selected', () => {
    store.setTable('r1', 't1')
    expect(run()).toBe(true)
  })

  it('redirects to table selection when there is no table', () => {
    const result = run() as UrlTree
    expect(router.serializeUrl(result)).toBe('/restaurants/r1')
  })

  it('redirects when the table belongs to another restaurant', () => {
    store.setTable('r2', 't1')
    const result = run() as UrlTree
    expect(router.serializeUrl(result)).toBe('/restaurants/r1')
  })
})
