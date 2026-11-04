import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ApplicationProviders } from './app/providers';
import { createApplicationRouter, applicationRouter } from './app/router';

export interface ApplicationProperties {
  initialEntries?: string[];
  router?: ReturnType<typeof createApplicationRouter>;
}

/**
 * Root Guest Web Application component.
 * Configures the mobile-first application shell, safe-area viewport insets,
 * query client providers, and declarative React Router DOM routes.
 */
export const App: React.FC<ApplicationProperties> = ({
  initialEntries,
  router: customRouter,
}) => {
  const routerInstance = React.useMemo(() => {
    if (customRouter) {
      return customRouter;
    }
    if (initialEntries && initialEntries.length > 0) {
      return createApplicationRouter({ initialEntries });
    }
    return applicationRouter;
  }, [customRouter, initialEntries]);

  return (
    <ApplicationProviders>
      <RouterProvider router={routerInstance} />
    </ApplicationProviders>
  );
};

export default App;
