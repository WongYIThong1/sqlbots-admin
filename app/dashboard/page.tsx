'use client'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          Welcome to the SQLBots Admin Panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
            </div>
            <div className="rounded-full bg-blue-500/10 p-3">
              <span className="text-2xl">👤</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Active Licenses</p>
              <p className="mt-2 text-3xl font-bold text-white">0</p>
            </div>
            <div className="rounded-full bg-green-500/10 p-3">
              <span className="text-2xl">🔑</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">System Status</p>
              <p className="mt-2 text-3xl font-bold text-green-400">Online</p>
            </div>
            <div className="rounded-full bg-green-500/10 p-3">
              <span className="text-2xl">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Pattern Background Card */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <svg
            className="h-full w-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-zinc-400"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <p className="mt-2 text-zinc-400">
            Manage users, licenses, and system settings from here.
          </p>
        </div>
      </div>
    </div>
  )
}
