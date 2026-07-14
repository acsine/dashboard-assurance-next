import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ExampleState {
  count: number
  isLoading: boolean
  increment: () => void
  decrement: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useExampleStore = create<ExampleState>()(
  devtools(
    (set) => ({
      count: 0,
      isLoading: false,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      setLoading: (loading) => set({ isLoading: loading }),
      reset: () => set({ count: 0, isLoading: false }),
    }),
    {
      name: 'example-store',
    }
  )
)
