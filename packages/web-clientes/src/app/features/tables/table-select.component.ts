import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Table } from '../../core/models/table.model'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
        </div>
      </div>

      <div class="card party-card">
        <label for="party-size">¿Cuántas personas sois?</label>
        <div class="party-row">
          <input
            id="party-size"
            type="number"
            min="1"
            step="1"
            [value]="partySize() ?? ''"
            (input)="onPartySizeInput($any($event.target).value)"
          />
          <button
            class="btn btn-primary"
            [disabled]="!isPartySizeValid() || loading()"
            (click)="search()"
          >
            Ver mesas
          </button>
        </div>
        @if (partySizeError()) {
          <p class="error-msg">{{ partySizeError() }}</p>
        }
      </div>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas disponibles para {{ searchedPartySize() }} personas</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button
                type="button"
                class="table-card card"
                [class.selected]="selectedTableId() === table.id"
                (click)="selectTable(table.id)"
              >
                <h3>Mesa {{ table.number }}</h3>
                @if (table.description) {
                  <p class="table-description">{{ table.description }}</p>
                }
                <p class="table-capacity">Capacidad: {{ table.capacity }} personas</p>
              </button>
            }
          </div>
          <div class="actions">
            <button
              class="btn btn-primary"
              [disabled]="!selectedTableId() || occupying()"
              (click)="continue()"
            >
              @if (occupying()) {
                Reservando mesa...
              } @else {
                Continuar
              }
            </button>
          </div>
        }
      }
      @if (notice()) {
        <div class="alert-error notice">{{ notice() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 900px;
        margin: 0 auto;
      }
      .back-link {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 8px;
        display: inline-block;
      }
      .party-card {
        margin-bottom: 24px;
      }
      .party-row {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }
      .party-row input {
        width: 120px;
      }
      .error-msg {
        color: var(--red);
        margin-top: 8px;
        font-size: 13px;
      }
      .tables-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      }
      .table-card {
        text-align: left;
        cursor: pointer;
        border: 2px solid transparent;
      }
      .table-card.selected {
        border-color: var(--green-light);
      }
      .actions {
        margin-top: 24px;
        display: flex;
        justify-content: flex-end;
      }
      .notice {
        margin-top: 16px;
      }
      .table-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .table-description,
      .table-capacity {
        color: var(--text-muted);
        font-size: 13px;
      }
    `
  ]
})
export class TableSelectComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  readonly partySize = signal<number | null>(null)
  readonly tables = signal<Table[]>([])
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)
  readonly searched = signal(false)
  readonly searchedPartySize = signal<number | null>(null)
  readonly selectedTableId = signal<string | null>(null)
  readonly occupying = signal(false)
  readonly notice = signal<string | null>(null)

  private get restaurantId(): string {
    return this.route.snapshot.paramMap.get('id')!
  }

  isPartySizeValid(): boolean {
    const size = this.partySize()
    return size !== null && Number.isInteger(size) && size >= 1
  }

  partySizeError(): string | null {
    return this.partySize() !== null && !this.isPartySizeValid()
      ? 'Indica al menos 1 persona'
      : null
  }

  onPartySizeInput(value: string): void {
    this.partySize.set(value === '' ? null : Number(value))
  }

  search(): void {
    const size = this.partySize()
    if (!this.isPartySizeValid() || size === null) return

    this.loading.set(true)
    this.error.set(null)
    this.notice.set(null)
    this.selectedTableId.set(null)
    this.tableService.getAvailable(this.restaurantId, size).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPartySize.set(size)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }
  selectTable(tableId: string): void {
    this.selectedTableId.set(tableId)
  }

  continue(): void {
    const tableId = this.selectedTableId()
    if (!tableId || this.occupying()) return

    this.occupying.set(true)
    this.notice.set(null)
    this.tableService.occupy(this.restaurantId, tableId).subscribe({
      next: (table) => {
        this.cartStore.setTable(table.restaurantId, table.id)
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId, 'menu'])
      },
      error: (err) => {
        this.occupying.set(false)
        if (err?.status === 409) {
          this.search()
          this.notice.set('La mesa ya no está disponible')
        } else {
          this.notice.set('Error al ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
