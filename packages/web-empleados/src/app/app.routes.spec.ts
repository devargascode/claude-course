import { routes } from './app.routes';
import { MesasComponent } from './features/tables/pages/mesas/mesas.component';

describe('app routes', () => {
  it('registers the mesas route under the shell', async () => {
    const shell = routes.find(r => r.path === '' && r.children);
    const mesas = shell?.children?.find(r => r.path === 'mesas');

    expect(mesas).toBeDefined();
    const component = await (mesas!.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(MesasComponent);
  });
});
