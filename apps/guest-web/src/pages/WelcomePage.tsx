import React from 'react';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { Utensils, Bell, Sparkles, MapPin, Clock } from 'lucide-react';
import { GuestSession } from '@conciergeiq/contracts';

interface WelcomePageProps {
  session: GuestSession;
  onNavigate: (page: string) => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ session, onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-12">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 pt-12 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="success" className="text-emerald-300 bg-emerald-950/60 border-emerald-500/30">
            Active Stay
          </Badge>
          <div className="flex items-center space-x-1 text-slate-300 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Service</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          {session.hotelName}
        </h1>
        <p className="text-sm text-slate-300 flex items-center mb-6">
          <MapPin className="w-4 h-4 mr-1 text-emerald-400" />
          Room {session.roomNumber} &bull; Welcome, {session.guestName || 'Valued Guest'}
        </p>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Folio Room Service</p>
            <p className="text-sm font-medium text-white">Direct-to-room delivery</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => onNavigate('menu')}>
            Order Now
          </Button>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="p-6 space-y-4 max-w-md mx-auto w-full flex-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Guest Services
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <Card
            className="p-4 flex items-center space-x-4 hover:border-emerald-500 transition-all cursor-pointer"
            onClick={() => onNavigate('menu')}
          >
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-base">In-Room Dining</h3>
              <p className="text-xs text-slate-500">Fresh cuisine, snacks & artisan beverages</p>
            </div>
          </Card>

          <Card
            className="p-4 flex items-center space-x-4 hover:border-emerald-500 transition-all cursor-pointer"
            onClick={() => onNavigate('tracking')}
          >
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-base">Live Order Status</h3>
              <p className="text-xs text-slate-500">Track kitchen preparation & delivery</p>
            </div>
          </Card>

          <Card
            className="p-4 flex items-center space-x-4 bg-slate-50/50 border-dashed"
          >
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-slate-700 text-base">Concierge Assistance</h3>
                <Badge variant="neutral">Desk: Dial 0</Badge>
              </div>
              <p className="text-xs text-slate-500">Towels, housekeeping & travel queries</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-xs text-slate-400">
        Powered by ConciergeIQ &bull; Seamless Hospitality Experience
      </div>
    </div>
  );
};
