import React from 'react';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import { Order } from '@conciergeiq/contracts';
import { Clock, ChefHat, CheckCircle2, ArrowLeft } from 'lucide-react';

interface OrderTrackingPageProps {
  order: Order | null;
  onBackToMenu: () => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ order, onBackToMenu }) => {
  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">No Active Order</h2>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          You don't have any orders currently processing. Order your favorite meal now!
        </p>
        <Button variant="primary" onClick={onBackToMenu}>
          Browse Menu
        </Button>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING', label: 'Order Received', icon: Clock, desc: 'Kitchen acknowledged ticket' },
    { key: 'IN_PROGRESS', label: 'In the Kitchen', icon: ChefHat, desc: 'Chef preparing your dishes' },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, desc: 'Delivered to room door' },
  ];

  const currentStepIndex = order.status === 'CANCELLED' ? -1 : steps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBackToMenu}
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900">Order #{order.id}</h1>
        <div className="w-5" />
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Status Stepper Banner */}
        <Card className="p-5 text-center bg-gradient-to-b from-white to-slate-50">
          <Badge
            variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'info'}
            className="mb-2"
          >
            Status: {order.status}
          </Badge>

          <h2 className="text-xl font-bold text-slate-900">
            {order.status === 'PENDING' && 'Order Transmitted to Kitchen'}
            {order.status === 'IN_PROGRESS' && 'Dish is Sizzling in Kitchen'}
            {order.status === 'DELIVERED' && 'Delivered to Room'}
            {order.status === 'CANCELLED' && 'Order Cancelled'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Room {order.roomNumber} &bull; Ordered at {formatDate(order.createdAt)}
          </p>

          {/* Stepper Visualization */}
          <div className="mt-6 flex items-center justify-between relative px-4">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
            {steps.map((step, idx) => {
              const isPastOrCurrent = currentStepIndex >= idx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isPastOrCurrent
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold mt-2 text-slate-700">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Order Details List */}
        <Card className="p-4 divide-y divide-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2">Order Items</h3>
          {order.items.map((line, idx) => (
            <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
              <span className="text-slate-800">
                <strong className="text-emerald-700 mr-1.5">{line.quantity}x</strong>
                {line.name}
              </span>
              <span className="font-semibold text-slate-900">{formatMoney(line.totalMinor)}</span>
            </div>
          ))}
          <div className="pt-3 flex justify-between items-center text-sm font-bold text-slate-900">
            <span>Total Billed</span>
            <span className="text-emerald-600">{formatMoney(order.totalMinor)}</span>
          </div>
        </Card>

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={onBackToMenu}>
            Back to In-Room Menu
          </Button>
        </div>
      </div>
    </div>
  );
};
