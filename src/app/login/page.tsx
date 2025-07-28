'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  Shield, 
  Cpu, 
  Network, 
  ChevronRight,
  Globe,
  Lock,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export default function LoginPage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && mounted) {
      router.push('/dashboard')
    }
  }, [isConnected, mounted, router])

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-neon-green rounded-full opacity-60 data-stream"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center shadow-lg shadow-neon-green/20">
                  <Zap className="w-6 h-6 text-dark-950" />
                </div>
                <Badge variant="secondary" className="bg-neon-green/10 text-neon-green border-neon-green/30 px-3 py-1">
                  Abstract L2
                </Badge>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Next-Gen
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-neon-green via-neon-blue to-neon-green bg-clip-text text-transparent neon-text">
                    Token Hub
                  </span>
                </h1>
                
                <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                  Discover, analyze, and trade the latest token deployments on Abstract L2 
                  with real-time intelligence and advanced filtering.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Shield, label: 'Token-Gated Access' },
                  { icon: Cpu, label: 'Real-Time Data' },
                  { icon: Network, label: 'Telegram Integration' },
                  { icon: Sparkles, label: 'Advanced Analytics' }
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-dark-900/50 border border-dark-800/50 backdrop-blur-sm"
                  >
                    <feature.icon className="w-4 h-4 text-neon-green" />
                    <span className="text-sm text-gray-300">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-dark-800/50">
              {[
                { label: 'Active Tokens', value: '1,247+' },
                { label: 'Daily Volume', value: '$2.4M+' },
                { label: 'Live Traders', value: '8,932+' }
              ].map((stat, index) => (
                <div key={index} className="text-center space-y-1">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-dark-900/50 border border-dark-800/50 backdrop-blur-xl shadow-2xl shadow-neon-green/5">
              <div className="p-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-neon-green/20 to-neon-blue/20 flex items-center justify-center border border-neon-green/20">
                    <Lock className="w-8 h-8 text-neon-green" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                      Connect Your Wallet
                    </h2>
                    <p className="text-gray-400">
                      Secure access to the Abstract Token Hub
                    </p>
                  </div>
                </div>

                {/* Connect Button */}
                <div className="space-y-6">
                  <div className="relative">
                    <w3m-button size="md" />
                    {/* Custom styling overlay */}
                    <style jsx>{`
                      w3m-button {
                        --w3m-color-fg-1: #00ff88;
                        --w3m-color-bg-1: rgba(0, 255, 136, 0.1);
                        --w3m-border-radius-master: 12px;
                      }
                    `}</style>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-300">Access Requirements:</div>
                    
                    <div className="space-y-3">
                      {[
                        { 
                          icon: Globe, 
                          label: 'Abstract L2 Network',
                          description: 'Switch to Abstract testnet',
                          status: 'required'
                        },
                        { 
                          icon: Shield, 
                          label: 'Token Ownership',
                          description: 'Hold required tokens for access',
                          status: 'required'
                        },
                        { 
                          icon: Zap, 
                          label: 'Wallet Signature',
                          description: 'Verify ownership via signature',
                          status: 'required'
                        }
                      ].map((req, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-dark-800/30 border border-dark-700/50">
                          <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                            <req.icon className="w-4 h-4 text-neon-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">{req.label}</div>
                            <div className="text-xs text-gray-400">{req.description}</div>
                          </div>
                          <Badge variant="outline" className="text-xs border-neon-green/30 text-neon-green">
                            Required
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Network Info */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-neon-blue/5 to-neon-green/5 border border-neon-blue/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-white">Abstract Testnet</div>
                        <div className="text-xs text-gray-400">Chain ID: 11124</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        <span className="text-xs text-neon-green">Live</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-dark-800/50">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500">
                      By connecting, you agree to our terms of service
                    </p>
                    <div className="flex items-center justify-center space-x-1 text-xs text-gray-400">
                      <span>Powered by</span>
                      <span className="text-neon-green font-medium">Abstract L2</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-16 pt-8 border-t border-dark-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              {
                title: 'Real-Time Monitoring',
                description: 'Live Telegram channel integration for instant token deployment alerts',
                icon: Network
              },
              {
                title: 'Advanced Analytics',
                description: 'Comprehensive token metrics, market data, and performance insights',
                icon: Cpu
              },
              {
                title: 'Secure Access',
                description: 'Token-gated authentication ensuring exclusive access to verified holders',
                icon: Shield
              }
            ].map((item, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-neon-green/10 to-neon-blue/10 flex items-center justify-center border border-neon-green/20">
                  <item.icon className="w-6 h-6 text-neon-green" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}