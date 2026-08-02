'use client'

import { useParams } from 'next/navigation'
import { DealerVehicleForm } from '@/components/dealer-vehicle-form'

export default function EditDealerCarPage() {
  const params = useParams<{ inventoryId: string }>()
  return <DealerVehicleForm inventoryId={params?.inventoryId} />
}
