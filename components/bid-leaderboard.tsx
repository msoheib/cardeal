'use client'

import { useEffect, useState } from 'react'
import { BidAggregate } from '@/lib/supabase'
import { getBidLeaderboard } from '@/lib/cars'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BidLeaderboardProps {
  carId: string
  wakalaPrice: number
  currentUserBid?: number
}

export function BidLeaderboard({ carId, wakalaPrice, currentUserBid }: BidLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<BidAggregate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalBids, setTotalBids] = useState(0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const loadLeaderboard = async () => {
    const { data, error } = await getBidLeaderboard(carId)
    if (data) {
      setLeaderboard(data)
      setTotalBids(data.reduce((sum, item) => sum + item.bid_count, 0))
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadLeaderboard()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`bid-aggregates-${carId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_aggregates',
          filter: `car_id=eq.${carId}`
        },
        () => {
          loadLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [carId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            قائمة المتصدرين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 1: return 'text-gray-600 bg-gray-50 border-gray-200'
      case 2: return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
  }

  const getCompetitivenessText = (bidPrice: number) => {
    const percentage = (bidPrice / wakalaPrice) * 100
    if (percentage >= 98) return { text: 'منافسة عالية جداً', color: 'text-red-600' }
    if (percentage >= 95) return { text: 'منافسة عالية', color: 'text-orange-600' }
    if (percentage >= 90) return { text: 'منافسة متوسطة', color: 'text-yellow-600' }
    return { text: 'منافسة منخفضة', color: 'text-green-600' }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            قائمة المتصدرين
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalBids} مزايدة
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد مزايدات حتى الآن</p>
            <p className="text-sm">كن أول من يضع مزايدة!</p>
          </div>
        ) : (
          leaderboard.map((bid, index) => {
            const savings = wakalaPrice - bid.bid_price
            const competitiveness = getCompetitivenessText(bid.bid_price)
            const isUserBid = currentUserBid === bid.bid_price
            
            return (
              <div 
                key={bid.id} 
                className={`
                  relative p-4 rounded-lg border transition-all duration-300
                  ${getRankColor(index)}
                  ${isUserBid ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
                  hover:scale-105 transform
                `}
              >
                {isUserBid && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                    مزايدتك
                  </Badge>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold min-w-[40px]">
                      {getRankIcon(index)}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {formatPrice(bid.bid_price)}
                      </div>
                      <div className="text-sm opacity-75">
                        وفر {formatPrice(savings)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3" />
                      <span className="font-medium">{bid.bid_count}</span>
                      <span className="text-sm">مزايد</span>
                    </div>
                    <div className={`text-xs ${competitiveness.color}`}>
                      {competitiveness.text}
                    </div>
                  </div>
                </div>

                {/* Visual indicator bar */}
                <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (bid.bid_count / Math.max(...leaderboard.map(b => b.bid_count))) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            )
          })
        )}

        {currentUserBid && !leaderboard.some(bid => bid.bid_price === currentUserBid) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-sm font-medium">مزايدتك الحالية</span>
              <span className="font-semibold">{formatPrice(currentUserBid)}</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              مزايدتك خارج قائمة الأعلى 5 مزايدات
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}