import React, { useState, useEffect } from 'react';
import AppNavbar from '../components/AppNavbar';
import TimeInput from './TimeInput';
import { apiFetch } from '../lib/api';

const allVenues = Array.from({ length: 20 }, (_, i) => `LT-${i + 1}`);
const ltVenuePattern = /^LT-(?:[1-9]|1\d|20)$/i;

const normalizeLtVenue = (venue) => {
    const normalized = String(venue || '').trim().toUpperCase();
    return ltVenuePattern.test(normalized) ? normalized : '';
};

const getCurrentUserIdFromToken = () => {
    const token = localStorage.getItem('slotDotExeToken');
    if (!token) return '';

    try {
        const payload = token.split('.')[1];
        if (!payload) return '';

        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const decoded = JSON.parse(atob(padded));

        return decoded?.user?.id || '';
    } catch (error) {
        return '';
    }
};

function LectureHalls({ darkMode = false }) {
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [eventName, setEventName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [activeTimePicker, setActiveTimePicker] = useState(null);
    const [selectedVenue, setSelectedVenue] = useState('');
    const [availableVenues, setAvailableVenues] = useState([]);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const currentUserId = getCurrentUserIdFromToken();

    // Theme-aware classes
    const bgClass = darkMode ? 'bg-black' : 'bg-zinc-50'
    const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
    const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
    const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    const inputClass = darkMode
        ? 'bg-black border-zinc-700 text-zinc-100'
        : 'bg-white border-zinc-200 text-zinc-900'

    useEffect(() => {
        if (!activeTimePicker) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setActiveTimePicker(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeTimePicker]);

    const openTimePicker = (field) => {
        setActiveTimePicker({ field });
    };

    const confirmTimePicker = (timeValue) => {
        if (!activeTimePicker) return;
        if (activeTimePicker.field === 'startTime') setStartTime(timeValue);
        if (activeTimePicker.field === 'endTime') setEndTime(timeValue);
        setActiveTimePicker(null);
    };

    const canCancelBooking = (booking) => {
        if (!booking || booking.isTask) return false;
        const bookingUserId = String(booking.user?._id || booking.user || '');
        return bookingUserId !== '' && bookingUserId === currentUserId;
    };

    const refreshBookings = async (date = selectedDate) => {
        if (!date) return;
        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        setLoading(true);
        try {
            const res = await apiFetch(`/api/bookings?date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(
                    data.map((booking) => ({
                        ...booking,
                        venue: normalizeLtVenue(booking.venue),
                    }))
                );
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        refreshBookings(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (!selectedDate || !startTime || !endTime) {
            setAvailableVenues([]);
            return;
        }

        if (startTime >= endTime) {
            setError('End time must be after start time');
            setAvailableVenues([]);
            return;
        } else {
            setError('');
        }

        const occupiedVenuesSet = new Set();

        bookings.forEach(booking => {
            const venue = normalizeLtVenue(booking.venue);
            if (!venue || !allVenues.includes(venue)) return;

            if (startTime < booking.endTime && endTime > booking.startTime) {
                occupiedVenuesSet.add(venue);
            }
        });

        const freeVenues = allVenues.filter(v => !occupiedVenuesSet.has(v));
        setAvailableVenues(freeVenues);

        if (selectedVenue && occupiedVenuesSet.has(selectedVenue)) {
            setSelectedVenue('');
        }
    }, [bookings, selectedDate, startTime, endTime, selectedVenue]);

    const handleBookLT = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!selectedDate || !startTime || !endTime || !eventName || !selectedVenue) {
            setError('Please fill all fields and select an available venue.');
            return;
        }

        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        const payload = {
            eventName,
            date: selectedDate,
            venue: selectedVenue,
            startTime,
            endTime
        };

        try {
            const res = await apiFetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMsg(`Successfully booked ${selectedVenue}!`);
                await refreshBookings(selectedDate);
                setEventName('');
                setSelectedVenue('');
            } else {
                setError(data.message || 'Booking failed');
            }
        } catch (error) {
            console.error(error);
            setError('Server error during booking.');
        }
    };

    const cancelBooking = async (booking) => {
        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        if (!canCancelBooking(booking)) {
            setError('You can only cancel your own bookings.');
            return;
        }

        if (!window.confirm("Are you sure you want to cancel this booking?")) return;

        try {
            const res = await apiFetch(`/api/bookings/${booking._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                await refreshBookings(selectedDate);
            } else {
                const data = await res.json();
                alert(data.message || "Failed to cancel");
            }
        } catch (error) {
            console.error("Cancel failed:", error);
        }
    };

    const isCurrentSelectionConflict = (booking) => {
        if (!startTime || !endTime) return false;
        const venue = normalizeLtVenue(booking.venue);
        return venue && venue === selectedVenue && startTime < booking.endTime && endTime > booking.startTime;
    };

    return (
        <>
            {activeTimePicker ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default"
                        onClick={() => setActiveTimePicker(null)}
                        aria-label="Close time picker"
                    />
                    <div
                        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveTimePicker(null)}
                            className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 shadow-lg hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <TimeInput
                            value={activeTimePicker.field === 'startTime' ? startTime : endTime}
                            onConfirm={confirmTimePicker}
                            format="24h"
                        />
                    </div>
                </div>
            ) : null}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1
                        className={`text-2xl font-bold tracking-tight ${textClass}`}
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                        Lecture Hall Booking
                    </h1>
                    <p className={`mt-1 ${textSecondary}`}>Reserve lecture halls for your classes and events</p>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Booking Form Card */}
                    <div className={`${cardClass} rounded-2xl border p-5`}>
                        <h2 className={`text-lg font-semibold ${textClass}`}>Book a Venue</h2>

                        {error && (
                            <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${darkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-green-100 text-green-800 border border-emerald-200'}`}>
                                {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleBookLT} className="mt-4 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${textClass} mb-1.5`}>Event / Class Name</label>
                                <input
                                    type="text"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder="e.g., Data Structures Midterm"
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputClass}`}
                                    required
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${textClass} mb-1.5`}>Select Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputClass}`}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block text-sm font-medium ${textClass} mb-1.5`}>Start Time</label>
                                    <button
                                        type="button"
                                        onClick={() => openTimePicker('startTime')}
                                        className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputClass} text-left flex items-center justify-between cursor-pointer`}
                                    >
                                        {startTime || 'Select start'}
                                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${textClass} mb-1.5`}>End Time</label>
                                    <button
                                        type="button"
                                        onClick={() => openTimePicker('endTime')}
                                        className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputClass} text-left flex items-center justify-between cursor-pointer`}
                                    >
                                        {endTime || 'Select end'}
                                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${textClass} mb-1.5`}>Available Venues</label>
                                <select
                                    value={selectedVenue}
                                    onChange={(e) => setSelectedVenue(e.target.value)}
                                    disabled={!startTime || !endTime || availableVenues.length === 0}
                                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    required
                                >
                                    <option value="" disabled>
                                        {!startTime || !endTime
                                            ? "Select times first..."
                                            : availableVenues.length === 0
                                                ? "No venues available!"
                                                : "Choose an available LT"}
                                    </option>
                                    {availableVenues.map(lt => (
                                        <option key={lt} value={lt}>{lt}</option>
                                    ))}
                                </select>
                                {startTime && endTime && availableVenues.length > 0 && (
                                    <p className="mt-2 text-sm font-medium text-green-800 dark:text-emerald-400">
                                        {availableVenues.length} halls available
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedDate || !startTime || !endTime || !eventName || !selectedVenue}
                                className="w-full py-2.5 mt-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Book LT
                            </button>
                        </form>
                    </div>

                    {/* Bookings Preview Card */}
                    <div className={`${cardClass} rounded-2xl border p-5`}>
                        <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
                            Bookings on {selectedDate}
                        </h2>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-400 py-12">Loading schedules...</div>
                        ) : bookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                                    <svg className={`w-7 h-7 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <p className={textSecondary}>No lecture halls booked for this date yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {bookings.map((booking) => {
                                    const canCancel = canCancelBooking(booking);

                                    return (
                                        <div
                                            key={booking._id}
                                            className={`p-4 rounded-xl border transition-colors ${
                                                isCurrentSelectionConflict(booking)
                                                    ? darkMode
                                                        ? 'border-red-800 bg-red-900/20'
                                                        : 'border-red-200 bg-red-100'
                                                    : darkMode
                                                        ? 'border-zinc-700 bg-black'
                                                        : 'border-zinc-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-bold ${
                                                        darkMode ? 'bg-sky-900/50 text-sky-400' : 'bg-zinc-200 text-zinc-800'
                                                    }`}>
                                                        {booking.venue}
                                                    </span>
                                                    <span className={`text-sm font-medium ${textClass}`}>
                                                        {booking.startTime} - {booking.endTime}
                                                    </span>
                                                </div>
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    isCurrentSelectionConflict(booking)
                                                        ? darkMode
                                                            ? 'bg-red-900/50 text-red-400'
                                                            : 'bg-red-100 text-red-700'
                                                        : darkMode
                                                            ? 'bg-emerald-900/50 text-emerald-400'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {isCurrentSelectionConflict(booking) ? 'Conflict' : 'Booked'}
                                                </span>
                                            </div>
                                            <h3 className={`mt-2 text-sm font-semibold ${textClass}`}>{booking.eventName}</h3>
                                            {!booking.isTask && (
                                                <p className={`mt-1 text-xs ${textSecondary}`}>Booked by: {booking.user?.name || 'Unknown'}</p>
                                            )}

                                            {canCancel && (
                                                <button
                                                    type="button"
                                                    onClick={() => cancelBooking(booking)}
                                                    className="mt-3 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition-colors cursor-pointer"
                                                >
                                                    Cancel Booking
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default LectureHalls;