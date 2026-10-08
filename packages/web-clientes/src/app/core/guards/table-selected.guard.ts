import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { CartStore } from '../store/cart.store'

export const tableSelectedGuard: CanActivateFn = (route) => {
  const cartStore = inject(CartStore)
  const router = inject(Router)
  const restaurantId = route.paramMap.get('id')

  if (cartStore.tableId() && cartStore.restaurantId() === restaurantId) {
    return true
  }
  return router.createUrlTree(['/restaurants', restaurantId])
}
