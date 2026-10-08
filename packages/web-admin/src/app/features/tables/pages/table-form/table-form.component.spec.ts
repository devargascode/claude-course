import { TestBed, ComponentFixture } from '@angular/core/testing'
import { importProvidersFrom } from '@angular/core'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, ChevronLeft } from 'lucide-angular'
import { TableFormComponent } from './table-form.component'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'

describe('TableFormComponent', () => {
  let fixture: ComponentFixture<TableFormComponent>
  let component: TableFormComponent
  let router: Router
  const store = { create: vi.fn(), update: vi.fn() }
  const service = { getAll: vi.fn() }

  function setup(id: string | null = null) {
    TestBed.configureTestingModule({
      imports: [TableFormComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick({ ChevronLeft })),
        { provide: TableStore, useValue: store },
        { provide: TableService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { params: { restaurantId: 'r1' } } },
            snapshot: { paramMap: { get: () => id } }
          }
        }
      ]
    })
    router = TestBed.inject(Router)
    vi.spyOn(router, 'navigate').mockResolvedValue(true)
    fixture = TestBed.createComponent(TableFormComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    store.create.mockReset().mockResolvedValue(undefined)
    store.update.mockReset().mockResolvedValue(undefined)
    service.getAll.mockReset()
  })

  it('does not submit when the table number is invalid', async () => {
    setup()
    component.form.number = 0

    await component.onSubmit()

    expect(store.create).not.toHaveBeenCalled()
    expect(component.error()).toBeTruthy()
  })

  it('does not submit when the capacity is invalid', async () => {
    setup()
    component.form.capacity = -3

    await component.onSubmit()

    expect(store.create).not.toHaveBeenCalled()
    expect(component.error()).toBeTruthy()
  })

  it('creates with a valid DTO (trimmed description) and navigates to the list', async () => {
    setup()
    component.form = { number: 5, description: '  Window  ', capacity: 4 }

    await component.onSubmit()

    expect(store.create).toHaveBeenCalledWith('r1', { number: 5, description: 'Window', capacity: 4 })
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 'r1', 'tables'])
  })

  it('shows the API error message and stays on the page', async () => {
    store.create.mockRejectedValue({ error: { message: 'Table number already exists' } })
    setup()

    await component.onSubmit()
    fixture.detectChanges()

    expect(router.navigate).not.toHaveBeenCalled()
    const alert = (fixture.nativeElement as HTMLElement).querySelector('.alert-error')
    expect(alert?.textContent).toContain('Table number already exists')
  })

  it('in edit mode loads the table and updates instead of creating', async () => {
    service.getAll.mockReturnValue(
      of([{ id: 't1', number: 3, description: 'Bar', capacity: 2, status: 'libre', restaurantId: 'r1', createdAt: '', updatedAt: '' }])
    )
    setup('t1')
    await fixture.whenStable()
    expect(component.form).toEqual({ number: 3, description: 'Bar', capacity: 2 })

    component.form.capacity = 6
    await component.onSubmit()

    expect(store.update).toHaveBeenCalledWith('r1', 't1', { number: 3, description: 'Bar', capacity: 6 })
    expect(store.create).not.toHaveBeenCalled()
  })
})
