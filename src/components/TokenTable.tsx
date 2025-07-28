'use client'

import { useState } from 'react'
import { 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  Star,
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TokenPair {
  address: string
  name: string
  symbol: string
  chain: string
  deployer: string
  deployTime: string
  marketCap?: number
  price?: number
  volume24h?: number
  liquidity?: number
  priceChange24h?: number
}

interface TokenTableProps {
  tokens: TokenPair[]
  loading: boolean
}

type SortField = 'name' | 'price' | 'marketCap' | 'volume24h' | 'priceChange24h' | 'deployTime'
type SortDirection = 'asc' | 'desc'

export function TokenTable({ tokens, loading }: TokenTableProps) {
  const [sortField, setSortField] = useState<SortField>('deployTime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleFavorite = (address: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(address)) {
      newFavorites.delete(address)
    } else {
      newFavorites.add(address)
    }
    setFavorites(newFavorites)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatNumber = (num: number | undefined) => {
    if (!num) return '-'
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatPercentage = (num: number | undefined) => {
    if (!num) return '-'
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const sortedTokens = [...tokens].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === 'deployTime') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    const numA = Number(aValue) || 0
    const numB = Number(bValue) || 0

    return sortDirection === 'asc' ? numA - numB : numB - numA
  })

  const SortHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <th 
      onClick={() => handleSort(field)}
      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-neon-green transition-colors group"
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp className={`w-3 h-3 ${sortField === field && sortDirection === 'asc' ? 'text-neon-green' : 'text-gray-600'}`} />
          <ChevronDown className={`w-3 h-3 -mt-1 ${sortField === field && sortDirection === 'desc' ? 'text-neon-green' : 'text-gray-600'}`} />
        </div>
      </div>
    </th>
  )

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin" />
          <span className="text-gray-400">Loading tokens...</span>
        </div>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No tokens found</h3>
        <p className="text-gray-400">Try adjusting your filters or check back later for new deployments.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-dark-800/50">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4" />
                  <span>Token</span>
                </div>
              </th>
              <SortHeader field="price">Price</SortHeader>
              <SortHeader field="priceChange24h">24h Change</SortHeader>
              <SortHeader field="marketCap">Market Cap</SortHeader>
              <SortHeader field="volume24h">Volume 24h</SortHeader>
              <SortHeader field="deployTime">Age</SortHeader>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/30">
            {sortedTokens.map((token, index) => (
              <tr 
                key={token.address} 
                className="hover:bg-dark-800/30 transition-all duration-300 group"
              >
                {/* Token Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleFavorite(token.address)}
                      className={`p-1 rounded transition-colors ${
                        favorites.has(token.address)
                          ? 'text-neon-green hover:text-neon-green/80'
                          : 'text-gray-500 hover:text-neon-green/50'
                      }`}
                    >
                      <Star className="w-4 h-4" fill={favorites.has(token.address) ? 'currentColor' : 'none'} />
                    </button>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green/20 to-neon-blue/20 flex items-center justify-center border border-neon-green/20">
                        <span className="text-sm font-bold text-neon-green">
                          {token.symbol?.charAt(0) || 'T'}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{token.name || 'Unknown Token'}</span>
                          <Badge variant="outline" className="text-xs text-neon-blue border-neon-blue/30">
                            {token.symbol || 'UNKNOWN'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            onClick={() => copyToClipboard(token.address)}
                            className="text-xs text-gray-400 hover:text-neon-green transition-colors flex items-center space-x-1"
                          >
                            <span className="font-mono">
                              {token.address.slice(0, 6)}...{token.address.slice(-4)}
                            </span>
                            <Copy className="w-3 h-3" />
                          </button>
                          <Badge variant="secondary" className="text-xs bg-dark-800 text-gray-400">
                            {token.chain}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Price */}
                <td className="px-6 py-4">
                  <div className="text-white font-medium">
                    {token.price ? `$${token.price.toFixed(6)}` : '-'}
                  </div>
                </td>

                {/* 24h Change */}
                <td className="px-6 py-4">
                  {token.priceChange24h !== undefined ? (
                    <div className={`flex items-center space-x-1 ${
                      token.priceChange24h >= 0 ? 'text-neon-green' : 'text-red-400'
                    }`}>
                      {token.priceChange24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">{formatPercentage(token.priceChange24h)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Market Cap */}
                <td className="px-6 py-4">
                  <span className="text-white font-medium">
                    {formatNumber(token.marketCap)}
                  </span>
                </td>

                {/* Volume 24h */}
                <td className="px-6 py-4">
                  <span className="text-white font-medium">
                    {formatNumber(token.volume24h)}
                  </span>
                </td>

                {/* Deploy Time */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      {getTimeAgo(token.deployTime)}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://explorer.testnet.abs.xyz/address/${token.address}`, '_blank')}
                      className="border-dark-700 hover:border-neon-blue/50 text-gray-300 hover:text-neon-blue"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-neon-green/20 to-neon-blue/20 border border-neon-green/30 text-neon-green hover:from-neon-green/30 hover:to-neon-blue/30 hover:shadow-lg hover:shadow-neon-green/20"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Trade
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-4 border-t border-dark-800/50 bg-dark-900/30">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span>Showing {tokens.length} tokens</span>
          </div>
          <div className="text-xs">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}