import { NextResponse } from 'next/server';
import { abstractMainnetMonitor, startAbstractMainnetMonitoring } from '@/lib/abstract-mainnet-monitor';

// Enhanced mock data as fallback
const generateMockTokens = (count: number = 20) => {
  const tokens = [];
  const now = Date.now();
  
  const tokenNames = [
    'Abstract Coin', 'Pengu Token', 'Abstract Gaming', 'ZK Pool',
    'Consumer Coin', 'Abstract AI', 'Layer Token', 'Pudgy Finance',
    'ZK Rewards', 'Abstract Social', 'Gaming Protocol', 'Abstract DeFi',
    'Consumer Protocol', 'Abstract NFT', 'ZK Gaming', 'Layer Finance',
    'Abstract Metaverse', 'Digital Asset', 'Protocol Token', 'Abstract Yield'
  ];
  
  const symbols = [
    'ABS', 'PENG', 'AGM', 'ZKP', 'CONS', 'AAI', 'LAYER', 'PUDGY',
    'ZKR', 'ASOC', 'GAME', 'ADEFI', 'CPROT', 'ANFT', 'ZKGM', 'LFIN',
    'AMET', 'DIGITAL', 'PROT', 'AYIELD'
  ];
  
  const dexSources = ['PancakeSwap', 'Abstract DEX', 'ZK Swap', 'Native Pool', 'Cross Bridge'];
  
  for (let i = 0; i < count; i++) {
    const price = Math.random() * 0.1;
    const volume24h = Math.random() * 50000;
    const marketCap = price * (Math.random() * 10000000 + 100000);
    
    tokens.push({
      id: `0x${Math.random().toString(16).substr(2, 40)}`,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: tokenNames[i % tokenNames.length],
      symbol: symbols[i % symbols.length],
      price: price,
      priceChange24h: (Math.random() - 0.5) * 30,
      volume24h: volume24h,
      marketCap: marketCap,
      liquidity: volume24h * (0.5 + Math.random()),
      createdAt: now - (Math.random() * 86400000 * 7), // Last 7 days
      dex: dexSources[Math.floor(Math.random() * dexSources.length)],
      discoveryMethod: ['deployment', 'mint', 'dex'][Math.floor(Math.random() * 3)],
    });
  }
  
  return tokens.sort((a, b) => b.createdAt - a.createdAt);
};

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const useMainnet = searchParams.get('mainnet') === 'true';
    
    let realTokens = [];
    let monitoringStatus = 'inactive';
    let monitoringStats = {};
    
    if (useMainnet) {
      try {
        // Start mainnet monitoring if not already running
        await startAbstractMainnetMonitoring();
        
        // Get real discovered tokens
        realTokens = abstractMainnetMonitor.getUITokens();
        monitoringStatus = 'active';
        monitoringStats = abstractMainnetMonitor.getStats();
        
        console.log(`📊 Real tokens found: ${realTokens.length}`);
        
      } catch (error) {
        console.error('Mainnet monitoring error:', error);
        monitoringStatus = 'error';
      }
    }
    
    // Generate mock tokens to fill remaining slots
    const mockTokensNeeded = Math.max(0, limit - realTokens.length);
    const mockTokens = generateMockTokens(mockTokensNeeded);
    
    // Combine real and mock data
    let allTokens = [...realTokens, ...mockTokens].slice(0, limit);
    
    // Apply sorting
    switch (sortBy) {
      case 'volume':
        allTokens.sort((a, b) => b.volume24h - a.volume24h);
        break;
      case 'price':
        allTokens.sort((a, b) => b.price - a.price);
        break;
      case 'gainers':
        allTokens.sort((a, b) => b.priceChange24h - a.priceChange24h);
        break;
      case 'newest':
      default:
        allTokens.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: allTokens,
      meta: {
        total: allTokens.length,
        realTokens: realTokens.length,
        mockTokens: mockTokens.length,
        lastUpdate: new Date().toISOString(),
        monitoring: monitoringStatus,
        responseTime: `${responseTime}ms`,
        source: useMainnet ? 'Abstract Mainnet Monitor + Mock Data' : 'Mock Data Only',
        stats: monitoringStats,
        endpoints: {
          mainnet: '?mainnet=true',
          testnet: '?mainnet=false',
          sorting: '?sortBy=newest|volume|price|gainers',
        }
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback to mock data only
    const mockTokens = generateMockTokens(parseInt(new URL(request.url).searchParams.get('limit') || '50'));
    
    return NextResponse.json({
      success: true,
      data: mockTokens,
      meta: {
        total: mockTokens.length,
        realTokens: 0,
        mockTokens: mockTokens.length,
        lastUpdate: new Date().toISOString(),
        monitoring: 'error',
        source: 'Mock Data Only (Monitoring Failed)',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}