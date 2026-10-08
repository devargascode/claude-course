import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TableSelectComponent } from './table-select.component'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

const makeTable = (id: string, number: number, capacity: number): Table => ({
  id,
  number,
  description: `Table ${number}`,
  capacity,
  status: 'libre',
  restaurantId: 'r1',
  createdAt: '',
  updatedAt: ''
})

describe('TableSelectComponent', () => {
  let tableService: { getAvailable: ReturnType<typeof vi.fn>; occupy: ReturnType<typeof vi.fn> }
  let router: { navigate: ReturnType<typeof vi.fn> }

  const create = () => {
    const fixture = TestBed.createComponent(TableSelectComponent)
    fixture.detectChanges()
    return fixture
  }

  const click = (fixture: ReturnType<typeof create>, selector: string) => {
    ;(fixture.nativeElement.querySelector(selector) as HTMLButtonElement).click()
    fixture.detectChanges()
  }

  const search = (fixture: ReturnType<typeof create>, size: string) => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    input.value = size
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    click(fixture, '.party-row button')
  }

  const selectFirstAndContinue = (fixture: ReturnType<typeof create>) => {
    click(fixture, '.table-card')
    click(fixture, '.actions button')
  }

  beforeEach(() => {
    tableService = { getAvailable: vi.fn(), occupy: vi.fn() }
    router = { navigate: vi.fn() }
    TestBed.configureTestingModule({
      providers: [
        { provide: TableService, useValue: tableService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', 'r1']]) } }
        }
      ]
    })
  })

  it('does not search with an invalid party size', () => {
    const fixture = create()
    search(fixture, '0')
    expect(tableService.getAvailable).not.toHaveBeenCalled()
    expect(fixture.nativeElement.textContent).toContain('Indica al menos 1 persona')
  })

  it('lists available tables for the party size', () => {
    tableService.getAvailable.mockReturnValue(of([makeTable('t1', 1, 2), makeTable('t2', 2, 4)]))
    const fixture = create()
    search(fixture, '2')
    expect(tableService.getAvailable).toHaveBeenCalledWith('r1', 2)
    const cards = fixture.nativeElement.querySelectorAll('.table-card')
    expect(cards.length).toBe(2)
    expect(cards[0].textContent).toContain('Mesa 1')
    expect(cards[0].textContent).toContain('Table 1')
    expect(cards[0].textContent).toContain('2 personas')
  })

  it('shows the empty state', () => {
    tableService.getAvailable.mockReturnValue(of([]))
    const fixture = create()
    search(fixture, '6')
    expect(fixture.nativeElement.textContent).toContain('No hay mesas disponibles para 6 personas')
  })

  it('keeps Continuar disabled until a table is selected', () => {
    tableService.getAvailable.mockReturnValue(of([makeTable('t1', 1, 2)]))
    const fixture = create()
    search(fixture, '2')
    const button = fixture.nativeElement.querySelector('.actions button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('occupies the selected table, stores it and navigates to the menu', () => {
    tableService.getAvailable.mockReturnValue(of([makeTable('t1', 1, 2)]))
    tableService.occupy.mockReturnValue(of({ ...makeTable('t1', 1, 2), status: 'ocupada' }))
    const fixture = create()
    search(fixture, '2')
    selectFirstAndContinue(fixture)

    expect(tableService.occupy).toHaveBeenCalledWith('r1', 't1')
    expect(TestBed.inject(CartStore).tableId()).toBe('t1')
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 'r1', 'menu'])
  })

  it('on 409 shows the notice, reloads the list and does not navigate', () => {
    tableService.getAvailable.mockReturnValue(of([makeTable('t1', 1, 2)]))
    tableService.occupy.mockReturnValue(throwError(() => ({ status: 409 })))
    const fixture = create()
    search(fixture, '2')
    selectFirstAndContinue(fixture)

    expect(tableService.getAvailable).toHaveBeenCalledTimes(2)
    expect(fixture.nativeElement.textContent).toContain('La mesa ya no está disponible')
    expect(router.navigate).not.toHaveBeenCalled()
    expect(TestBed.inject(CartStore).tableId()).toBeNull()
  })
})
