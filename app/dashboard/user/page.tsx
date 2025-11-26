'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  email: string
  plan: string
  license: string | null
  licenseExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | '30d' | '90d' | 'none'>('all')
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'with' | 'without'>('all')

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    setDeletingId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        await fetchUsers()
        setSelectedUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      } else {
        alert('Failed to delete user: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)?`)) {
      return
    }

    setDeletingIds(new Set(selectedUsers))
    try {
      const deletePromises = Array.from(selectedUsers).map((userId) =>
        fetch(`/api/users/${userId}`, { method: 'DELETE' })
      )

      const results = await Promise.allSettled(deletePromises)
      const successful = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      await fetchUsers()
      setSelectedUsers(new Set())

      if (failed > 0) {
        alert(`Deleted ${successful} user(s), ${failed} failed`)
      } else {
        alert(`Successfully deleted ${successful} user(s)`)
      }
    } catch (error) {
      console.error('Error deleting users:', error)
      alert('Failed to delete users')
    } finally {
      setDeletingIds(new Set())
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const handleExport = (exportAll: boolean = false) => {
    const usersToExport = exportAll
      ? filteredUsers
      : filteredUsers.filter((u) => selectedUsers.has(u.id))

    if (usersToExport.length === 0) {
      alert('No users selected for export')
      return
    }

    const headers = ['Username', 'Email', 'Plan', 'License', 'License Expires', 'Created At']
    const rows = usersToExport.map((user) => [
      user.username,
      user.email,
      user.plan,
      user.license || 'N/A',
      user.licenseExpiresAt ? new Date(user.licenseExpiresAt).toLocaleString() : 'N/A',
      new Date(user.createdAt).toLocaleString(),
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
      `users_${exportAll ? 'all' : 'selected'}_${new Date().toISOString().split('T')[0]}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stats = {
    total: users.length,
    withLicense: users.filter((u) => u.license !== null).length,
    withoutLicense: users.filter((u) => u.license === null).length,
    withPlan30d: users.filter((u) => u.plan === '30d').length,
    withPlan90d: users.filter((u) => u.plan === '90d').length,
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.license && user.license.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesPlan =
      planFilter === 'all' ||
      (planFilter === 'none' && user.plan === 'None') ||
      (planFilter === '30d' && user.plan === '30d') ||
      (planFilter === '90d' && user.plan === '90d')

    const matchesLicense =
      licenseFilter === 'all' ||
      (licenseFilter === 'with' && user.license !== null) ||
      (licenseFilter === 'without' && user.license === null)

    return matchesSearch && matchesPlan && matchesLicense
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white mx-auto"></div>
          <p className="text-zinc-400 mt-2">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and monitor all user accounts
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Total</div>
          <div className="text-2xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">With License</div>
          <div className="text-2xl font-semibold text-green-400">{stats.withLicense}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Without License</div>
          <div className="text-2xl font-semibold text-yellow-400">{stats.withoutLicense}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">30d Plan</div>
          <div className="text-2xl font-semibold text-blue-400">{stats.withPlan30d}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">90d Plan</div>
          <div className="text-2xl font-semibold text-purple-400">{stats.withPlan90d}</div>
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
                placeholder="Search users..."
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

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
            >
              <option value="all">All Plans</option>
              <option value="30d">30d Plan</option>
              <option value="90d">90d Plan</option>
              <option value="none">No Plan</option>
            </select>

            {/* License Filter */}
            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
            >
              <option value="all">All Licenses</option>
              <option value="with">With License</option>
              <option value="without">Without License</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedUsers.size > 0 && (
              <>
                <button
                  onClick={handleBatchDelete}
                  disabled={deletingIds.size > 0}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingIds.size > 0 ? `Deleting ${deletingIds.size}...` : `Delete Selected (${selectedUsers.size})`}
                </button>
                <button
                  onClick={() => handleExport(false)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Export Selected ({selectedUsers.size})
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
                      filteredUsers.length > 0 &&
                      selectedUsers.size === filteredUsers.length &&
                      filteredUsers.every((u) => selectedUsers.has(u.id))
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-white/20 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  License
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-zinc-400 font-medium">No users found</p>
                      <p className="text-sm text-zinc-500 mt-1">
                        {searchQuery || planFilter !== 'all' || licenseFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Users will appear here once created'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${
                      selectedUsers.has(user.id) ? 'bg-zinc-800/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white font-medium">{user.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.plan === 'None' ? (
                        <span className="text-sm text-zinc-500">—</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {user.plan}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.license ? (
                        <div className="font-mono text-sm text-white">{user.license}</div>
                      ) : (
                        <span className="text-sm text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-400">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={deletingId === user.id || deletingIds.has(user.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === user.id || deletingIds.has(user.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
