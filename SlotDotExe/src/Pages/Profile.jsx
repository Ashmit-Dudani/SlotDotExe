import React, { useEffect, useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import { apiFetch } from '../lib/api'

function Profile({ darkMode = false }) {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    // Theme-aware classes
    const bgClass = darkMode ? 'bg-black' : 'bg-zinc-50'
    const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
    const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
    const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('slotDotExeToken')
            if (!token) {
                setLoading(false)
                return
            }

            try {
                const res = await apiFetch('/api/auth/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setProfile(data)
                }
            } catch (error) {
                console.error("Failed to fetch profile", error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    return (
        <>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="max-w-md mx-auto">
                    {/* Profile Card */}
                    <div className={`${cardClass} rounded-2xl border p-6`}>
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                                darkMode ? 'bg-zinc-800' : 'bg-zinc-200'
                            }`}>
                                <span className={`text-2xl font-bold ${
                                    darkMode ? 'text-sky-400' : 'text-zinc-800'
                                }`}>
                                    {profile?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div>
                                <h1
                                    className={`text-2xl font-bold tracking-tight ${textClass}`}
                                    style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                                >
                                    {profile?.name || 'User Profile'}
                                </h1>
                                <p className={textSecondary}>{profile?.email}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-zinc-400 animate-pulse">Loading profile...</div>
                        ) : profile ? (
                            <div className="space-y-5">
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary} mb-2`}>Role</label>
                                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${
                                        profile.role === 'professor'
                                            ? darkMode
                                                ? 'bg-blue-900/30 text-blue-400 border-blue-700'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                            : darkMode
                                                ? 'bg-sky-900/30 text-sky-400 border-sky-700'
                                                : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                                    }`}>
                                        {profile.role}
                                    </span>
                                </div>

                                {profile.role === 'student' && (
                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                        <div>
                                            <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary} mb-2`}>Roll No. / Batch</label>
                                            <p className={`text-base font-medium ${textClass} uppercase`}>{profile.batch || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary} mb-2`}>Branch</label>
                                            <p className={`text-base font-medium ${textClass} uppercase`}>{profile.branch || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}

                                {profile.role === 'professor' && (
                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                        <div>
                                            <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary} mb-2`}>Department</label>
                                            <p className={`text-base font-medium ${textClass}`}>{profile.department || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary} mb-2`}>Office Details</label>
                                            <p className={`text-base font-medium ${textClass}`}>{profile.office || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-red-700">Failed to load profile details.</div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}

export default Profile