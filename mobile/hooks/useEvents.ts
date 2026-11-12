import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeEventStatus,
  createEvent,
  getEvent,
  getEvents,
} from '../lib/api'
import { queryKeys } from '../lib/query'
import type { CreateEventInput, PlannerEvent } from '../lib/types'

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: getEvents,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => getEvent(id),
    enabled: Boolean(id),
  })
}

export function useCreateEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}

export function useChangeEventStatus(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (status: PlannerEvent['status']) => changeEventStatus(id, status),
    onSuccess: (event) => {
      client.setQueryData(queryKeys.event(id), event)
      void client.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}
