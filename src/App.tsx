/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './AppRouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}
