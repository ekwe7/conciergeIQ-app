import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { routes } from './app/routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppProviders>
  );
}

export default App;
