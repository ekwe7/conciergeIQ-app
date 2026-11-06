import React from 'react';
import { Globe } from 'lucide-react';

export interface WelcomeHeaderProperties {
  hotelName: string;
  roomNumber: string;
  guestName?: string;
  className?: string;
}

/**
 * Returns a time-of-day appropriate greeting string (e.g. Good morning, Good evening).
 */
export function getTimeOfDayGreeting(currentDate: Date = new Date()): string {
  const currentHour = currentDate.getHours();
  if (currentHour < 12) {
    return 'Good morning';
  }
  if (currentHour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/**
 * Extracts two initials from a hotel name for avatar presentation.
 */
export function getHotelMonogram(hotelName: string): string {
  const words = hotelName.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }
  return hotelName.substring(0, 2).toUpperCase();
}

/**
 * Guest Welcome Hero Header matching prototype G01.
 * Features time-of-day greeting, hotel identity avatar, room number highlight,
 * and service value proposition.
 */
export const WelcomeHeader: React.FC<WelcomeHeaderProperties> = ({
  hotelName,
  roomNumber,
  guestName,
  className = '',
}) => {
  const greetingText = getTimeOfDayGreeting();
  const hotelMonogram = getHotelMonogram(hotelName);

  return (
    <div
      data-testid="guest-welcome-header"
      className={`relative overflow-hidden text-white rounded-b-3xl p-6 pt-7 shadow-elevation-mid ${className}`}
      style={{
        background: 'linear-gradient(160deg, #22305A 0%, #16213A 65%, #0f172a 100%)',
      }}
    >
      {/* Decorative Warm Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-12 w-64 h-64 rounded-full opacity-35"
        style={{
          background: 'radial-gradient(circle, #d3a050 0%, rgba(211, 160, 80, 0) 70%)',
        }}
      />

      {/* Top Identity Row */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 shrink-0 shadow-elevation-low"
            style={{ backgroundColor: '#d3a050' }}
          >
            {hotelMonogram}
          </div>
          <span className="font-bold text-sm text-white truncate max-w-[210px]">
            {hotelName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs backdrop-blur-md border border-white/10">
          <Globe className="w-3.5 h-3.5 text-white/80" />
          <span className="font-semibold text-[11px] tracking-wide">EN</span>
        </div>
      </div>

      {/* Greeting and Room Heading */}
      <div className="relative z-10 space-y-2 mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
          {greetingText},<br />
          welcome to Room {roomNumber}
        </h1>
        {guestName && (
          <p className="text-xs font-medium text-emerald-300">
            Welcome, {guestName}
          </p>
        )}
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm pt-1">
          Order food, request amenities and track everything live, with no app needed.
        </p>
      </div>
    </div>
  );
};
