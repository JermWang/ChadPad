'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TokenTable } from '@/components/TokenTable'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Zap, 
  DollarSign, 
  Clock,
  Activity,
  Star,
  Globe,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react'

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

interface FilterState {
  search: string
  chain: string
  minMarketCap: number
  sortBy: 'newest' | 'marketCap' | 'volume' | 'price' | 'liquidity'
  timeframe: '1h' | '24h' | '7d' | '30d'
  category: 'all' | 'trending' | 'new' | 'gainers' | 'losers'
}

const TABS = [
  { id: 'all', label: 'All Tokens', icon: Globe, count: 1247 },
  { id: 'trending', label: 'Trending', icon: TrendingUp, count: 42 },
  { id: 'new', label: 'New Launches', icon: Zap, count: 18 },
  { id: 'gainers', label: 'Top Gainers', icon: Activity, count: 35 },
  { id: 'favorites', label: 'Watchlist', icon: Star, count: 12 },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'volume', label: '24h Volume' },
  { value: 'price', label: 'Price' },
  { value: 'liquidity', label: 'Liquidity' },
]

const TIMEFRAMES = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
]

export default function Dashboard() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    chain: 'all',
    minMarketCap: 0,
    sortBy: 'newest',
    timeframe: '24h',
    category: 'all'
  })
  const [tokens, setTokens] = useState<TokenPair[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      redirect('/login')
    }
  }, [isConnected])

  useEffect(() => {
    fetchTokens()
  }, [activeTab, filters])

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pairs')
      const data = await response.json()
      setTokens(data)
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,136,0.05),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,212,255,0.03),transparent_50%)]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-dark-800/50 backdrop-blur-xl bg-dark-950/80">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                  <Zap className="w-6 h-6 text-dark-950" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
                    Abstract Token Hub
                  </h1>
                  <p className="text-sm text-gray-400">Real-time token discovery & analytics</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-900/50 border border-neon-green/20">
                  <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-sm text-neon-green">Live</span>
                </div>
                <w3m-button />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Tokens', value: '1,247', change: '+12%', icon: Globe, color: 'neon-green' },
              { label: '24h Volume', value: '$2.4M', change: '+8.3%', icon: DollarSign, color: 'neon-blue' },
              { label: 'Active Traders', value: '8,932', change: '+24%', icon: Activity, color: 'neon-green' },
              { label: 'New Today', value: '18', change: '+6', icon: Clock, color: 'neon-blue' },
            ].map((stat, index) => (
              <Card key={index} className="p-6 bg-dark-900/50 border border-dark-800/50 backdrop-blur-sm hover:border-neon-green/30 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    <p className={`text-sm mt-1 text-${stat.color}`}>{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}/10 group-hover:bg-${stat.color}/20 transition-colors`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex items-center space-x-1 p-1 bg-dark-900/50 rounded-xl border border-dark-800/50 backdrop-blur-sm overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-neon-green/20 to-neon-blue/20 border border-neon-green/30 text-neon-green shadow-lg shadow-neon-green/20'
                      : 'text-gray-400 hover:text-white hover:bg-dark-800/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                  <Badge variant="secondary" className={`${
                    activeTab === tab.id ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-dark-800 text-gray-400'
                  }`}>
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tokens by name, symbol, or address..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-12 pr-4 py-3 bg-dark-900/50 border border-dark-800/50 rounded-xl text-white placeholder-gray-400 focus:border-neon-green/50 focus:ring-2 focus:ring-neon-green/20 transition-all"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center space-x-3">
                {TIMEFRAMES.map((timeframe) => (
                  <button
                    key={timeframe.value}
                    onClick={() => updateFilter('timeframe', timeframe.value)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      filters.timeframe === timeframe.value
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'bg-dark-900/50 text-gray-400 border border-dark-800/50 hover:border-neon-blue/30'
                    }`}
                  >
                    {timeframe.label}
                  </button>
                ))}
                
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-900/50 text-gray-400 border border-dark-800/50 hover:border-neon-green/30 transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <Card className="p-6 bg-dark-900/50 border border-dark-800/50 backdrop-blur-sm animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-neon-green/50"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chain</label>
                    <select
                      value={filters.chain}
                      onChange={(e) => updateFilter('chain', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-neon-green/50"
                    >
                      <option value="all">All Chains</option>
                      <option value="abstract">Abstract L2</option>
                      <option value="ethereum">Ethereum</option>
                      <option value="base">Base</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Market Cap</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minMarketCap}
                      onChange={(e) => updateFilter('minMarketCap', Number(e.target.value))}
                      className="bg-dark-800 border border-dark-700 text-white focus:border-neon-green/50"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => setFilters({
                        search: '',
                        chain: 'all',
                        minMarketCap: 0,
                        sortBy: 'newest',
                        timeframe: '24h',
                        category: 'all'
                      })}
                      variant="outline"
                      className="w-full border-dark-700 hover:border-neon-green/50 text-gray-300 hover:text-neon-green"
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Token Table */}
          <Card className="bg-dark-900/50 border border-dark-800/50 backdrop-blur-sm overflow-hidden">
            <TokenTable tokens={tokens} loading={loading} />
          </Card>
        </main>
      </div>
    </div>
  )
}