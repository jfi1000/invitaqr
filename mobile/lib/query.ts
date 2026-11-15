import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

export const queryKeys = {
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  guests: (id: string) => ['events', id, 'guests'] as const,
  staff: (id: string) => ['events', id, 'staff'] as const,
  me: ['me'] as const,
}
