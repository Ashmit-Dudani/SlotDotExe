import React, { useState, useEffect } from 'react';
import AppNavbar from '../components/AppNavbar';
import { apiFetch } from '../lib/api';

function Bus({ darkMode = false }) {
    const [selectedDate, setSelectedDate] = useState('');
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Theme-aware classes
    const bgClass = darkMode ? 'bg-black' : 'bg-zinc-50';
    const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900';
    const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600';
    const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
    const inputClass = darkMode
        ? 'bg-black border-zinc-700 text-zinc-100'
        : 'bg-white border-zinc-200 text-zinc-900';
    const actionButtonClass = darkMode
        ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
        : 'bg-zinc-900 text-white hover:bg-zinc-800';
    const cancelButtonClass = darkMode
        ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
        : 'bg-red-100 text-red-700 hover:bg-red-200';
    const pastSlotButtonClass = darkMode
        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
        : 'bg-blue-200 text-zinc-800 border border-zinc-300 cursor-not-allowed';

    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseTimeSlotToMinutes = (timeSlot) => {
        const match = String(timeSlot || '').trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match) return null;

        let hours = Number(match[1]);
        const minutes = Number(match[2]);
        const period = match[3].toUpperCase();

        if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
            return null;
        }

        if (period === 'AM') {
            hours = hours === 12 ? 0 : hours;
        } else {
            hours = hours === 12 ? 12 : hours + 12;
        }

        return hours * 60 + minutes;
    };

    const isPastTimeSlot = (timeSlot) => {
        if (selectedDate !== getTodayDateString()) return false;

        const slotMinutes = parseTimeSlotToMinutes(timeSlot);
        if (slotMinutes === null) return true;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return slotMinutes <= currentMinutes;
    };

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        setSelectedDate(today);
    }, []);

    const fetchBuses = async (date) => {
        if (!date) return;
        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        setLoading(true);
        try {
            const res = await apiFetch(`/api/buses?date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBuses(data);
            }
        } catch (error) {
            console.error('Failed to fetch bus schedules:', error);
            setError('Failed to fetch buses.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDate) {
            fetchBuses(selectedDate);
            setError('');
            setSuccessMsg('');
            
            // Poll for live updates every 30 seconds
            const interval = setInterval(() => {
                fetchBuses(selectedDate);
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [selectedDate]);

    const handleBook = async (route, timeSlot) => {
        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        setError('');
        setSuccessMsg('');

        try {
            const res = await apiFetch('/api/buses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: selectedDate, timeSlot, route })
            });

            if (res.ok) {
                setSuccessMsg(`Successfully booked seat for ${route} at ${timeSlot}!`);
                fetchBuses(selectedDate);
            } else {
                const data = await res.json();
                setError(data.message || 'Booking failed');
            }
        } catch (error) {
            console.error(error);
            setError('Server error during booking.');
        }
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        const token = localStorage.getItem('slotDotExeToken');
        if (!token) return;

        setError('');
        setSuccessMsg('');

        try {
            const res = await apiFetch(`/api/buses/${bookingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setSuccessMsg('Booking cancelled successfully.');
                fetchBuses(selectedDate);
            } else {
                const data = await res.json();
                setError(data.message || 'Cancellation failed');
            }
        } catch (error) {
            console.error(error);
            setError('Server error during cancellation.');
        }
    };

    // Group buses by route
    const campusToCity = buses.filter(b => b.route === 'Campus to City');
    const cityToCampus = buses.filter(b => b.route === 'City to Campus');

    const renderBusList = (title, busList) => (
        <div className={`${cardClass} rounded-2xl border p-5 flex flex-col h-full`}>
            <h2 className={`text-lg font-bold mb-4 ${textClass}`}>{title}</h2>
            <div className="space-y-4 flex-1">
                {busList.length === 0 ? (
                    <p className={`text-sm ${textSecondary}`}>No schedules found.</p>
                ) : (
                    busList.map((bus, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                            bus.isBookedByUser 
                                ? (darkMode ? 'border-emerald-800 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50')
                                : (darkMode ? 'border-zinc-700 bg-black' : 'border-zinc-200 bg-white')
                        }`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-lg font-bold ${textClass}`}>{bus.timeSlot}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                    bus.availableSeats > 5 
                                        ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                        : bus.availableSeats > 0
                                            ? (darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700')
                                            : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                                }`}>
                                    {bus.availableSeats === 0 ? 'Full' : `${bus.availableSeats} seats left`}
                                </span>
                            </div>

                            <div className="mt-auto">
                                {bus.isBookedByUser ? (
                                    <button 
                                        onClick={() => handleCancel(bus.userBookingId)}
                                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${cancelButtonClass}`}
                                    >
                                        Cancel Booking
                                    </button>
                                ) : (
                                    (() => {
                                        const isPastSlot = isPastTimeSlot(bus.timeSlot);
                                        return (
                                    <button 
                                        onClick={() => handleBook(bus.route, bus.timeSlot)}
                                        disabled={bus.availableSeats === 0 || isPastSlot}
                                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                                            bus.availableSeats === 0 || isPastSlot
                                                ? pastSlotButtonClass
                                                : actionButtonClass
                                        }`}
                                    >
                                        {isPastSlot ? 'Past Slot' : 'Book Seat'}
                                    </button>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1
                        className={`text-2xl font-bold tracking-tight ${textClass}`}
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                    >
                        Bus Shuttle Booking
                    </h1>
                    <p className={`mt-1 text-sm ${textSecondary}`}>Reserve your seat on the campus shuttle.</p>
                </div>
                
                <div>
                    <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${inputClass}`}
                    />
                </div>
            </div>

            {error && (
                <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    {error}
                </div>
            )}
            
            {successMsg && (
                <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-green-100 text-green-800 border border-emerald-200'}`}>
                    {successMsg}
                </div>
            )}

            {loading && buses.length === 0 ? (
                <div className="flex justify-center items-center py-20 text-zinc-400">Loading schedules...</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 items-stretch">
                    {renderBusList('Campus → City', campusToCity)}
                    {renderBusList('City → Campus', cityToCampus)}
                </div>
            )}
        </div>
    );
}

export default Bus;
