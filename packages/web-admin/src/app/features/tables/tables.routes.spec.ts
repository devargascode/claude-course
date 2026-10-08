import { TestBed } from '@angular/core/testing'
import { importProvidersFrom, signal } from '@angular/core'
import { provideRouter, type Route } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { of } from 'rxjs'
import { LucideAngularModule, Plus, Edit, Trash2, LayoutGrid, ChevronLeft } from 'lucide-angular'
import { TABLE_ROUTES } from './tables.routes'
import { routes as appRoutes } from '../../app.routes'
import { TableListComponent } from './pages/table-list/table-list.component'
import { TableFormComponent } from './pages/table-form/table-form.component'
import { TableStore } from './store/table.store'
import { TableService } from './services/table.service'

function findRoute(list: Route[], path: string): Route | undefined {
  for (const route of list) {
    if (route.path === path) return route
    const found = route.children ? findRoute(route.children, path) : undefined
    if (found) return found
  }
  return undefined
}

describe('tables routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'restaurants/:restaurantId/tables', children: TABLE_ROUTES }]),
        importProvidersFrom(LucideAngularModule.pick({ Plus, Edit, Trash2, LayoutGrid, ChevronLeft })),
        {
          provide: TableStore,
          useValue: {
            tables: signal([]),
            loading: signal(false),
            error: signal(null),
            loadByRestaurant: vi.fn().mockResolvedValue(undefined)
          }
        },
        { provide: TableService, useValue: { getAll: () => of([]) } }
      ]
    })
  })

  it('resolves the list at the base path', async () => {
    const harness = await RouterTestingHarness.create()
    const component = await harness.navigateByUrl('/restaurants/r1/tables')
    expect(component).toBeInstanceOf(TableListComponent)
  })

  it('resolves the form at /new', async () => {
    const harness = await RouterTestingHarness.create()
    const component = await harness.navigateByUrl('/restaurants/r1/tables/new')
    expect(component).toBeInstanceOf(TableFormComponent)
  })

  it('resolves the form at /:id/edit', async () => {
    const harness = await RouterTestingHarness.create()
    const component = await harness.navigateByUrl('/restaurants/r1/tables/t1/edit')
    expect(component).toBeInstanceOf(TableFormComponent)
  })

  it('is mounted under restaurants/:restaurantId in the app routes', async () => {
    const tables = findRoute(appRoutes, 'tables')
    expect(tables).toBeDefined()
    const loaded = await (tables!.loadChildren as () => Promise<Route[]>)()
    expect(loaded).toBe(TABLE_ROUTES)
  })
})
