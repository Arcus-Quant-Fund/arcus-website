'use client'

import { useEffect, useState } from 'react'
import type { ChainStats } from '@/app/api/chain-stats/route'

const REGIME_COLORS: Record<number, string> = {
  0: 'text-green-400',
  1: 'text-yellow-400',
  2: 'text-orange-400',
  3: 'text-red-400',
}

function fmt(n: number, decimals = 2): string {
  if (!n || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtUsd(n: number): string {
  if (!n || isNaN(n)) return '—'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtRate(n: number): string {
  if (isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(4)}%`
}

export default function LiveChainStats() {
  const [stats, setStats]       = useState<ChainStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  async function fetchStats() {
    try {
      const res = await fetch('/api/chain-stats', { cache: 'no-store' })
      if (!res.ok) throw new Error('bad response')
      const data: ChainStats = await res.json()
      setStats(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gold/20 rounded-2xl p-6 mb-8 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return null // fail silently — static content below still visible
  }

  const fundingColor = stats.fundingRate >= 0 ? 'text-red-400' : 'text-green-400'
  const regimeColor  = REGIME_COLORS[stats.regime] ?? 'text-green-400'

  return (
    <div className="bg-gray-900 border border-gold/20 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-white font-semibold text-sm">Live On-Chain — BTC-PERP</span>
        </div>
        <span className="text-gray-600 text-xs">
          Updated {stats.fetchedAt ? new Date(stats.fetchedAt).toLocaleTimeString() : '—'} · refreshes every 30s
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Mark price */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">Mark Price</div>
          <div className="text-white font-bold text-lg leading-none">{fmtUsd(stats.markPrice)}</div>
          <div className="text-gray-600 text-xs mt-1">BTC · 1e18 oracle</div>
        </div>

        {/* Funding rate */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">Funding Rate F</div>
          <div className={`font-bold text-lg leading-none ${fundingColor}`}>
            {fmtRate(stats.fundingRate)}
          </div>
          <div className="text-gray-600 text-xs mt-1">ι = {stats.iota} always</div>
        </div>

        {/* ι = 0 proof */}
        <div className="bg-gray-800/60 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">Interest Param ι</div>
          <div className="text-emerald-400 font-bold text-2xl leading-none">0</div>
          <div className="text-gray-600 text-xs mt-1">hardcoded · no riba</div>
        </div>

        {/* κ signal */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">κ Signal</div>
          <div className={`font-bold text-lg leading-none ${regimeColor}`}>
            {stats.kappa !== 0 ? fmt(stats.kappa * 100, 4) + '%' : '—'}
          </div>
          <div className={`text-xs mt-1 ${regimeColor}`}>{stats.regimeLabel}</div>
        </div>

        {/* Insurance fund */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">Insurance Fund</div>
          <div className="text-white font-bold text-lg leading-none">
            {stats.insuranceFund > 0 ? fmtUsd(stats.insuranceFund) : '—'}
          </div>
          <div className="text-gray-600 text-xs mt-1">USDC · Sepolia</div>
        </div>
      </div>
    </div>
  )
}
