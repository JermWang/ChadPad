'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Star,
  Copy,
  ExternalLink,
  Filter,
  Zap
} from 'lucide-react';

interface Token {
  id: string;
  address: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  createdAt: number;
  dex: string;
}

export default function HomePage() {
  const { isConnected } = useAccount();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [sortBy, setSortBy] = useState('newest');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Fetch tokens data
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/mockPairs?limit=50');
        const data = await response.json();
        
        if (data.success) {
          setTokens(data.data);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  // Filter and sort tokens
  const filteredTokens = tokens
    .filter(token => 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'price':
          return b.price - a.price;
        case 'gainers':
          return b.priceChange24h - a.priceChange24h;
        default:
          return b.createdAt - a.createdAt;
      }
    });

  const toggleFavorite = (tokenId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(tokenId)) {
      newFavorites.delete(tokenId);
    } else {
      newFavorites.add(tokenId);
    }
    setFavorites(newFavorites);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // You could add a toast notification here
  };

  const formatNumber = (num: number) => {
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
    return `${(num / 1000000000).toFixed(1)}B`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="grid-pattern opacity-20" />
        
        {/* Floating Orbs */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-32 h-32 rounded-full blur-3xl opacity-30 animate-pulse`}
            style={{
              background: i % 2 === 0 ? '#00ff88' : '#00d4ff',
              left: `${20 + (i * 15)}%`,
              top: `${10 + (i * 10)}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-neon-green" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
                Abstract Hub
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-800/50 rounded-full border border-neon-green/20">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>
          
          <ConnectButton />
        </header>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tokens, symbols, or addresses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:border-neon-green focus:outline-none focus:ring-1 focus:ring-neon-green/50 text-white placeholder-gray-400 backdrop-blur-sm"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg focus:border-neon-blue focus:outline-none text-white backdrop-blur-sm min-w-[140px]"
            >
              <option value="newest">🕒 Newest</option>
              <option value="volume">📊 Volume</option>
              <option value="price">💰 Price</option>
              <option value="gainers">📈 Gainers</option>
            </select>

            {/* Timeframe Buttons */}
            <div className="flex bg-slate-900/80 rounded-lg border border-slate-700 p-1">
              {['1h', '24h', '7d'].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    selectedTimeframe === timeframe
                      ? 'bg-neon-green text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Token Grid */}
        <div className="space-y-3">
          {loading ? (
            // Loading skeleton
            [...Array(10)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-1/4" />
                    <div className="h-3 bg-slate-700 rounded w-1/3" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-20" />
                    <div className="h-3 bg-slate-700 rounded w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Token List
            filteredTokens.map((token) => (
              <div
                key={token.id}
                className="glass rounded-xl p-4 hover:border-neon-green/40 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  {/* Token Info */}
                  <div className="flex items-center space-x-4">
                    {/* Token Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-neon-green/20 to-neon-blue/20 rounded-full flex items-center justify-center border border-neon-green/30">
                      <span className="text-lg font-bold text-neon-green">
                        {token.symbol.slice(0, 2)}
                      </span>
                    </div>

                    {/* Name and Details */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-white group-hover:text-neon-green transition-colors">
                          {token.name}
                        </h3>
                        <span className="text-neon-blue font-mono text-sm">
                          ${token.symbol}
                        </span>
                        {token.dex && (
                          <span className="px-2 py-1 text-xs bg-neon-blue/20 text-neon-blue rounded-full">
                            {token.dex}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-400">
                        <span className="font-mono">{formatAddress(token.address)}</span>
                        <span>•</span>
                        <span>{timeAgo(token.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Stats */}
                  <div className="flex items-center space-x-6">
                    {/* Price */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        ${token.price.toFixed(6)}
                      </div>
                      <div className={`text-sm ${
                        token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-400">Volume 24h</div>
                      <div className="text-white font-medium">
                        ${formatNumber(token.volume24h)}
                      </div>
                    </div>

                    {/* Market Cap */}
                    <div className="text-right hidden lg:block">
                      <div className="text-sm text-gray-400">Market Cap</div>
                      <div className="text-white font-medium">
                        ${formatNumber(token.marketCap)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleFavorite(token.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.has(token.id)
                            ? 'text-yellow-400 bg-yellow-400/20'
                            : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => copyAddress(token.address)}
                        className="p-2 text-gray-400 hover:text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <a
                        href={`https://explorer.testnet.abs.xyz/address/${token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button className="px-4 py-2 bg-gradient-to-r from-neon-green to-neon-blue text-black font-medium rounded-lg hover:shadow-lg hover:shadow-neon-green/25 transition-all">
                        Trade
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-8 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-neon-green" />
              <span>{tokens.length} tokens discovered</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-neon-blue" />
              <span>Updated {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}