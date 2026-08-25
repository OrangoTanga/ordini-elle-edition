import { useEffect, useState } from 'react'
import { api } from '../api'
import { DEFAULT_CATEGORIES } from '../categories'

export interface Category {
  id: number
  name: string
  sort_order: number
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const result = await api.categories.list()
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      setCategories(result.data.map((c: Category) => c.name))
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return { categories, loading, refresh }
}