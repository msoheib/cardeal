'use client'

import { useEffect, useState } from 'react'
import { CarCard } from '@/components/car-card'
import { getAvailableConfigurations } from '@/lib/cars'
import { AvailableVehicleListing } from '@/lib/supabase'

/** The newest available listings, straight from the marketplace. Renders nothing if there are none. */
export function LatestListings({ limit = 3 }: { limit?: number }) {
  const [listings, setListings] = useState<AvailableVehicleListing[] | null>(null)

  useEffect(() => {
    getAvailableConfigurations().then(({ data }) => setListings((data || []).slice(0, limit)))
  }, [limit])

  if (listings === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-muted/50" />
        ))}
      </div>
    )
  }
  if (listings.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => <CarCard key={listing.id} config={listing} />)}
    </div>
  )
}
