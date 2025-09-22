'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface RealTimeContextType {
  isConnected: boolean
}

const RealTimeContext = createContext<RealTimeContextType>({
  isConnected: false
})

export const useRealTime = () => useContext(RealTimeContext)

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check connection status
    const channel = supabase.channel('connection-check')
    
    channel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <RealTimeContext.Provider value={{ isConnected }}>
      {children}
    </RealTimeContext.Provider>
  )
}