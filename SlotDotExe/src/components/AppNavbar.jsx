import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const navItems = [
	{ label: 'Home', href: '#' },
	{ label: 'Library', href: '#library' },
	{ label: 'Lecture Halls', href: '#lecture-halls' },
	{ label: 'Projects', href: '#projects' },
	{ label: 'Bus', href: '#bus' },
]

function AppNavbar({ darkMode, onToggleDarkMode }) {
	console.log('[AppNavbar] Rendering, darkMode:', darkMode)
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [userProfile, setUserProfile] = useState(null)

	useEffect(() => {
		const fetchProfile = async () => {
			const token = localStorage.getItem('slotDotExeToken')
			if (!token) return

			try {
				const res = await apiFetch('/api/auth/profile', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					const data = await res.json()
					setUserProfile(data)
				}
			} catch (error) {
				console.error('Failed to fetch profile', error)
			}
		}

		fetchProfile()
	}, [])

	const handleLogout = (e) => {
		e.preventDefault()
		localStorage.removeItem('slotDotExeToken')
		localStorage.removeItem('slotDotExeAuth')
		window.location.reload()
	}

	return (
		<header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-300 ${
			darkMode ? 'bg-black/80 border-zinc-800' : 'bg-white/80 border-zinc-200/60'
		}`}>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Logo */}
					<a
						href="#"
						className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
							darkMode ? 'text-sky-400' : 'text-zinc-800'
						}`}
						style={{ fontFamily: '"Space Grotesk", sans-serif' }}
					>
						SlotDotExe
					</a>

					{/* Desktop Nav */}
					<nav className="hidden md:flex items-center gap-5">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className={`px-4 py-2 text-sm font-medium rounded-lg border-2 border-transparent transition-all duration-200 ${
									darkMode
										? 'text-zinc-300 hover:text-sky-400 hover:bg-zinc-900 hover:border-sky-400'
										: 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 hover:border-zinc-500'
								}`}
							>
								{item.label}
							</a>
						))}
					</nav>

					{/* Right side actions */}
					<div className="flex items-center gap-2">
						{/* Dark mode toggle */}
						<button
							type="button"
							onClick={onToggleDarkMode}
							className={`p-2 rounded-lg transition-colors duration-200 cursor-pointer ${
								darkMode
									? 'text-zinc-300 hover:bg-zinc-900 hover:text-sky-400'
									: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
							}`}
							aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
						>
							{darkMode ? (
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							) : (
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
								</svg>
							)}
						</button>

						{/* User Menu */}
						<div className="relative group">
							<button
								type="button"
								className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
									darkMode
										? 'text-zinc-300 hover:bg-zinc-900'
										: 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100'
								}`}
							>
								<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
									darkMode ? 'bg-zinc-900' : 'bg-zinc-200'
								}`}>
									<span className={`text-sm font-semibold ${
										darkMode ? 'text-sky-400' : 'text-zinc-800'
									}`}>
										{userProfile?.name?.charAt(0) || 'U'}
									</span>
								</div>
								<span className={darkMode ? 'text-zinc-300' : 'text-zinc-700'}>
									{userProfile?.name || 'Account'}
								</span>
							</button>

							{/* Dropdown - visible on hover with group */}
							<div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
								<div className={`w-56 rounded-xl shadow-xl border overflow-hidden ${
									darkMode
										? 'bg-zinc-900 border-zinc-800'
										: 'bg-white border-zinc-200'
								}`}>
									<a
										href="#profile"
										className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
											darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
										}`}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										View Profile
									</a>
									<hr className={darkMode ? 'my-0 border-zinc-800' : 'my-0 border-zinc-100'} />
									<a
										href="#logout"
										onClick={handleLogout}
										className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
											darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-700 hover:bg-red-50'
										}`}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
										</svg>
										Logout
									</a>
								</div>
							</div>
						</div>

						{/* Mobile menu button */}
						<button
							type="button"
							className={`md:hidden p-2 rounded-lg transition-colors ${
								darkMode
									? 'text-zinc-300 hover:bg-zinc-900'
									: 'text-zinc-600 hover:bg-zinc-100'
							}`}
							aria-controls="mobile-nav"
							aria-expanded={isMenuOpen}
							onClick={() => setIsMenuOpen((open) => !open)}
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									d={isMenuOpen ? 'M6 6L18 18M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'}
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Mobile nav */}
			<div
				id="mobile-nav"
				className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-200/60'}`}
			>
				<div className={`px-4 py-3 space-y-1 ${darkMode ? 'bg-black' : 'bg-white'}`}>
					{navItems.map((item) => (
						<a
							key={item.href}
							href={item.href}
							className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
								darkMode
									? 'text-zinc-300 hover:bg-zinc-900'
									: 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100'
							}`}
							onClick={() => setIsMenuOpen(false)}
						>
							{item.label}
						</a>
					))}
					<a
						href="#profile"
						className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
							darkMode
								? 'text-zinc-300 hover:bg-zinc-900'
								: 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100'
						}`}
						onClick={() => setIsMenuOpen(false)}
					>
						View Profile
					</a>
					<a
						href="#logout"
						className="block px-4 py-3 text-sm font-medium text-red-700 rounded-lg hover:bg-red-100 transition-colors"
						onClick={(e) => { handleLogout(e); setIsMenuOpen(false); }}
					>
						Logout
					</a>
				</div>
			</div>
		</header>
	)
}

export default AppNavbar