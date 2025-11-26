'use client'

import { useState, useEffect } from 'react'

interface License {
  id: string
  licenseKey: string
  planType: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  createdAt: string
  expiresAt: string
  isUsed: boolean
}

interface AvailablePlan {
  planType: string
  availableCount: number
}

export default function LicensePage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPlanType, setSelectedPlanType] = useState<'30d' | '90d' | ''>('')
  const [licenseCount, setLicenseCount] = useState<number>(1)
  const [creating, setCreating] = useState(false)
  const [selectedLicenses, setSelectedLicenses] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'available' | 'expired'>('all')

  const fetchLicenses = async () => {
    try {
      const response = await fetch('/api/licenses')
      const data = await response.json()
      if (data.success) {
        setLicenses(data.licenses)
      }
    } catch (error) {
      console.error('Error fetching licenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/plans/available')
      const data = await response.json()
      if (data.success) {
        setAvailablePlans(data.allPlanTypes || [
          { planType: '30d', availableCount: 0 },
          { planType: '90d', availableCount: 0 },
        ])
      }
    } catch (error) {
      console.error('Error fetching available plans:', error)
      setAvailablePlans([
        { planType: '30d', availableCount: 0 },
        { planType: '90d', availableCount: 0 },
      ])
    }
  }

  useEffect(() => {
    fetchLicenses()
    fetchAvailablePlans()
  }, [])

  const handleCreateLicense = async () => {
    if (!selectedPlanType) {
      alert('Please select a plan type')
      return
    }

    if (licenseCount < 1 || licenseCount > 100) {
      alert('License count must be between 1 and 100')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planType: selectedPlanType,
          count: licenseCount 
        }),
      })

      const data = await response.json()
      if (data.success) {
        await fetchLicenses()
        await fetchAvailablePlans()
        setShowAddModal(false)
        setSelectedPlanType('')
        setLicenseCount(1)
        alert(`Successfully created ${data.count} license${data.count > 1 ? 's' : ''}`)
      } else {
        alert('Failed to create license: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating license:', error)
      alert('Failed to create license')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteLicense = async (licenseId: string, licenseKey: string) => {
    if (!confirm(`Are you sure you want to delete license "${licenseKey}"?`)) {
      return
    }

    setDeletingId(licenseId)
    try {
      const response = await fetch(`/api/licenses/${licenseId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        await fetchLicenses()
        await fetchAvailablePlans()
      } else {
        alert('Failed to delete license: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting license:', error)
      alert('Failed to delete license')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedLicenses.size === 0) {
      alert('Please select at least one license to delete')
      return
    }

    // Filter to only available licenses (not in use)
    const availableSelected = licenses.filter(
      (l) => selectedLicenses.has(l.id) && !l.isUsed
    )

    if (availableSelected.length === 0) {
      alert('No available licenses selected. Only unused licenses can be deleted.')
      return
    }

    const inUseSelected = licenses.filter(
      (l) => selectedLicenses.has(l.id) && l.isUsed
    )

    let confirmMessage = `Are you sure you want to delete ${availableSelected.length} license(s)?`
    if (inUseSelected.length > 0) {
      confirmMessage += `\n\nNote: ${inUseSelected.length} selected license(s) are in use and will be skipped.`
    }

    if (!confirm(confirmMessage)) {
      return
    }

    setDeletingIds(new Set(availableSelected.map((l) => l.id)))
    try {
      const response = await fetch('/api/licenses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: availableSelected.map((l) => l.id) }),
      })

      const data = await response.json()
      if (data.success) {
        await fetchLicenses()
        await fetchAvailablePlans()
        setSelectedLicenses(new Set())
        alert(`Successfully deleted ${data.deletedCount} license(s)`)
      } else {
        alert('Failed to delete licenses: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting licenses:', error)
      alert('Failed to delete licenses')
    } finally {
      setDeletingIds(new Set())
    }
  }

  const handleSelectLicense = (licenseId: string) => {
    setSelectedLicenses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(licenseId)) {
        newSet.delete(licenseId)
      } else {
        newSet.add(licenseId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedLicenses.size === licenses.length) {
      setSelectedLicenses(new Set())
    } else {
      setSelectedLicenses(new Set(licenses.map((l) => l.id)))
    }
  }

  const handleExport = (exportAll: boolean = false) => {
    const licensesToExport = exportAll
      ? filteredLicenses
      : filteredLicenses.filter((l) => selectedLicenses.has(l.id))

    if (licensesToExport.length === 0) {
      alert('No licenses selected for export')
      return
    }

    const headers = ['License Key', 'Plan Type', 'Status', 'User', 'Created At', 'Expires At']
    const rows = licensesToExport.map((license) => [
      license.licenseKey,
      license.planType,
      license.isUsed ? 'In Use' : 'Available',
      license.userName || 'N/A',
      new Date(license.createdAt).toLocaleString(),
      license.expiresAt ? new Date(license.expiresAt).toLocaleString() : 'Never',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `licenses_${exportAll ? 'all' : 'selected'}_${new Date().toISOString().split('T')[0]}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stats = {
    total: licenses.length,
    active: licenses.filter((l) => l.isUsed).length,
    expired: licenses.filter((l) => {
      if (!l.expiresAt) return false
      return new Date(l.expiresAt) < new Date()
    }).length,
    available: licenses.filter((l) => !l.isUsed).length,
  }

  // Filter licenses
  const filteredLicenses = licenses.filter((license) => {
    const matchesSearch = license.licenseKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (license.userName && license.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && license.isUsed) ||
      (statusFilter === 'available' && !license.isUsed) ||
      (statusFilter === 'expired' && license.expiresAt && new Date(license.expiresAt) < new Date())
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white mx-auto"></div>
          <p className="text-zinc-400 mt-2">Loading licenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Licenses</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and monitor all license keys
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors"
        >
          Create License
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Total</div>
          <div className="text-2xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Active</div>
          <div className="text-2xl font-semibold text-green-400">{stats.active}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Available</div>
          <div className="text-2xl font-semibold text-blue-400">{stats.available}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Expired</div>
          <div className="text-2xl font-semibold text-red-400">{stats.expired}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search licenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="available">Available</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedLicenses.size > 0 && (
              <>
                <button
                  onClick={handleBatchDelete}
                  disabled={deletingIds.size > 0}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingIds.size > 0 ? `Deleting ${deletingIds.size}...` : `Delete Selected (${selectedLicenses.size})`}
                </button>
                <button
                  onClick={() => handleExport(false)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Export Selected ({selectedLicenses.size})
                </button>
              </>
            )}
            <button
              onClick={() => handleExport(true)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Export All
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredLicenses.length > 0 &&
                      selectedLicenses.size === filteredLicenses.length &&
                      filteredLicenses.every(l => selectedLicenses.has(l.id))
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-white/20 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  License Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-zinc-400 font-medium">No licenses found</p>
                      <p className="text-sm text-zinc-500 mt-1">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Try adjusting your filters' 
                          : 'Create your first license to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => (
                  <tr
                    key={license.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${
                      selectedLicenses.has(license.id) ? 'bg-zinc-800/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLicenses.has(license.id)}
                        onChange={() => handleSelectLicense(license.id)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-white font-medium">
                        {license.licenseKey}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {license.planType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          license.isUsed
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}
                      >
                        {license.isUsed ? 'In Use' : 'Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300">
                        {license.userName || (
                          <span className="text-zinc-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-400">
                        {new Date(license.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-400">
                        {license.expiresAt
                          ? new Date(license.expiresAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!license.isUsed ? (
                        <button
                          onClick={() => handleDeleteLicense(license.id, license.licenseKey)}
                          disabled={deletingId === license.id || deletingIds.has(license.id)}
                          className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === license.id || deletingIds.has(license.id) ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create License Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Create License</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Select a plan type to generate a new license key
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Plan Type Selection */}
              <div className="space-y-3">
                {availablePlans.map((plan) => (
                  <label
                    key={plan.planType}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPlanType === plan.planType
                        ? 'border-white/20 bg-zinc-800/50'
                        : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="planType"
                      value={plan.planType}
                      checked={selectedPlanType === plan.planType}
                      onChange={(e) =>
                        setSelectedPlanType(e.target.value as '30d' | '90d')
                      }
                      className="w-4 h-4 text-white border-zinc-700 focus:ring-2 focus:ring-white/20 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {plan.planType === '30d' ? '30 Days' : '90 Days'}
                      </div>
                      <div className="text-sm text-zinc-400 mt-0.5">
                        {plan.planType === '30d' ? '30 days validity period' : '90 days validity period'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={licenseCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setLicenseCount(Math.max(1, Math.min(100, value)))
                    }}
                    className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                  />
                  <span className="text-sm text-zinc-400">
                    license{licenseCount !== 1 ? 's' : ''} (max 100)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedPlanType('')
                  setLicenseCount(1)
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLicense}
                disabled={!selectedPlanType || creating || licenseCount < 1 || licenseCount > 100}
                className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? `Creating ${licenseCount} license${licenseCount > 1 ? 's' : ''}...` : `Create ${licenseCount} License${licenseCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
