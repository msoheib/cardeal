'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarCard } from "@/components/car-card"
import { Car } from "@/lib/supabase"
import { getCars, getCarMakes } from "@/lib/cars"
import { Search, Filter } from "lucide-react"

export default function CarsBrowsePage() {
  const [cars, setCars] = useState<Car[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    make: "all",
    priceFrom: "",
    priceTo: "",
    search: "",
  })

  const loadCars = async () => {
    setIsLoading(true)
    const filtersToApply: Record<string, any> = {}

    const selectedMake = filters.make === "all" ? "" : filters.make
    if (selectedMake) filtersToApply.make = selectedMake
    if (filters.priceFrom) filtersToApply.priceFrom = parseInt(filters.priceFrom, 10)
    if (filters.priceTo) filtersToApply.priceTo = parseInt(filters.priceTo, 10)

    const { data } = await getCars(filtersToApply)
    if (data) {
      let filteredCars = data
      if (filters.search) {
        filteredCars = data.filter((car) =>
          car.make.toLowerCase().includes(filters.search.toLowerCase()) ||
          car.model.toLowerCase().includes(filters.search.toLowerCase())
        )
      }
      setCars(filteredCars)
    }
    setIsLoading(false)
  }

  const loadMakes = async () => {
    const { data } = await getCarMakes()
    if (data) setMakes(data)
  }

  useEffect(() => {
    loadCars()
    loadMakes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handle = setTimeout(loadCars, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">???? ???????? ???????</h1>
            <p className="text-sm text-gray-600">???? ?? ???????? ???????? ??? ?????? ????? ?????</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">?????? ????? ??????</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ????? ???????
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="???? ???????? ?? ???????..."
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  className="pr-10"
                />
              </div>

              <Select
                value={filters.make}
                onValueChange={(value) => setFilters({ ...filters, make: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="???? ???????" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">???? ????????</SelectItem>
                  {makes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="????? ??????"
                value={filters.priceFrom}
                onChange={(event) => setFilters({ ...filters, priceFrom: event.target.value })}
              />

              <Input
                type="number"
                placeholder="????? ??????"
                value={filters.priceTo}
                onChange={(event) => setFilters({ ...filters, priceTo: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Card key={item} className="animate-pulse">
                <div className="h-48 rounded-t-lg bg-gray-200" />
                <CardContent className="space-y-3 p-4">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                  <div className="h-8 rounded bg-gray-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cars.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">?? ???? ?????? ?????? ??????</h2>
              <p className="text-gray-600">???? ????? ?????? ??????? ?? ????? ?? ?????? ????.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} showBidStats />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


