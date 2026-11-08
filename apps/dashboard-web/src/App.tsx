import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { applicationRouter, createApplicationRouter } from './app/router';

export interface ApplicationProperties {
  initialEntries?: string[];
  router?: ReturnType<typeof createApplicationRouter>;
}

/**
 * Root Dashboard Web Application component.
 * Sets up providers, query client configuration, and responsive desktop/tablet shell routing.
 */
export function App({
  initialEntries,
  router: customRouter,
}: ApplicationProperties = {}) {
  const activeRouter =
    customRouter ??
    (initialEntries && initialEntries.length > 0
      ? createApplicationRouter({ initialEntries })
      : applicationRouter);

  return (
    <AppProviders>
      <RouterProvider
        router={activeRouter}
        future={{ v7_startTransition: true }}
      />
    </AppProviders>
  );
}

export default App;
