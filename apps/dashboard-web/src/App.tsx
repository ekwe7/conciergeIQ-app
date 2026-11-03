import React, { useState } from 'react';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney, formatDate } from '@conciergeiq/utils';
import { Order, OrderStatus, Room, StaffUser } from '@conciergeiq/contracts';
import {
  LayoutDashboard,
  DoorOpen,
  QrCode,
  Activity,
  LogOut,
  CheckCircle,
  ChefHat,
  XCircle,
  Search,
  Bell,
} from 'lucide-react';

const CURRENT_USER: StaffUser = {
  id: 'usr_mgr_01',
  name: 'Marcus Vance',
  email: 'marcus.vance@lagosgrand.com',
  role: 'MANAGER',
  active: true,
};

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-8821',
    roomNumber: '402',
    stayId: 'stay_demo_9921',
    hotelId: 'htl_lagos_grand',
    status: 'PENDING',
    items: [
      { itemId: 'item_1', name: 'Artisan Avocado & Poached Egg Toast', quantity: 2, unitPriceMinor: 1600, totalMinor: 3200 },
      { itemId: 'item_4', name: 'Freshly Brewed Espresso & Croissant', quantity: 2, unitPriceMinor: 950, totalMinor: 1900 },
    ],
    subtotalMinor: 5100,
    taxMinor: 408,
    totalMinor: 5508,
    createdAt: new Date(Date.now() - 400000).toISOString(),
    updatedAt: new Date(Date.now() - 400000).toISOString(),
  },
  {
    id: 'ORD-8819',
    roomNumber: '215',
    stayId: 'stay_demo_9844',
    hotelId: 'htl_lagos_grand',
    status: 'IN_PROGRESS',
    items: [
      { itemId: 'item_2', name: 'Truffle Wagyu Burger & Crisp Fries', quantity: 1, unitPriceMinor: 2400, totalMinor: 2400 },
    ],
    subtotalMinor: 2400,
    taxMinor: 192,
    totalMinor: 2592,
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'ORD-8814',
    roomNumber: '108',
    stayId: 'stay_demo_9711',
    hotelId: 'htl_lagos_grand',
    status: 'DELIVERED',
    items: [
      { itemId: 'item_3', name: 'Pan-Seared Atlantic Salmon', quantity: 1, unitPriceMinor: 2800, totalMinor: 2800 },
    ],
    subtotalMinor: 2800,
    taxMinor: 224,
    totalMinor: 3024,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

const INITIAL_ROOMS: Room[] = [
  { id: 'rm_101', roomNumber: '101', floor: 1, type: 'Deluxe Suite', status: 'OCCUPIED' },
  { id: 'rm_108', roomNumber: '108', floor: 1, type: 'Executive King', status: 'OCCUPIED' },
  { id: 'rm_215', roomNumber: '215', floor: 2, type: 'Penthouse Suite', status: 'OCCUPIED' },
  { id: 'rm_301', roomNumber: '301', floor: 3, type: 'Standard Double', status: 'VACANT' },
  { id: 'rm_402', roomNumber: '402', floor: 4, type: 'Presidential Suite', status: 'OCCUPIED' },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'rooms' | 'activity'>('orders');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
    );
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = orderFilter === 'ALL' || o.status === orderFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.roomNumber.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2 py-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-base">
              CQ
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">ConciergeIQ</h2>
              <p className="text-[11px] text-slate-400">Hotel Staff Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Live Orders KDS</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'rooms'
                  ? 'bg-emerald-600 text-white font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              <span>Rooms & QR Tent Cards</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'activity'
                  ? 'bg-emerald-600 text-white font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audit Activity Logs</span>
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">{CURRENT_USER.name}</p>
            <div className="flex items-center space-x-1 mt-0.5">
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                {CURRENT_USER.role}
              </Badge>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1 rounded">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {activeTab === 'orders' && 'Live Kitchen & Order Dispatch Board'}
              {activeTab === 'rooms' && 'Rooms & QR Key Management'}
              {activeTab === 'activity' && 'Security & Operational Activity Logs'}
            </h1>
            <p className="text-xs text-slate-500">The Lagos Grand Hotel & Suites &bull; Property #HTL-88</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search room or order #..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60"
              />
            </div>
            <div className="p-2 text-slate-500 hover:bg-slate-100 rounded-full cursor-pointer relative">
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5" />
              )}
            </div>
          </div>
        </header>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex space-x-2">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      orderFilter === filter
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                    {filter === 'PENDING' && pendingCount > 0 && (
                      <span className="ml-1.5 bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Order Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map(order => (
                  <Card key={order.id} className="p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-sm">{order.id}</span>
                        <Badge
                          variant={
                            order.status === 'DELIVERED'
                              ? 'success'
                              : order.status === 'IN_PROGRESS'
                              ? 'warning'
                              : order.status === 'PENDING'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pb-2 border-b border-slate-100">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          Room {order.roomNumber}
                        </span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-800">
                              <span className="font-bold text-slate-900 mr-1">{it.quantity}x</span>
                              {it.name}
                            </span>
                            <span className="text-slate-600 font-medium">{formatMoney(it.totalMinor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                        <span>Total Folio Charge:</span>
                        <span className="text-sm text-emerald-600">{formatMoney(order.totalMinor)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex space-x-2">
                        {order.status === 'PENDING' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')}
                            >
                              <ChefHat className="w-3.5 h-3.5 mr-1" /> Send to Kitchen
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="px-2"
                              onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs bg-emerald-600"
                            onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Delivered
                          </Button>
                        )}
                        {order.status === 'DELIVERED' && (
                          <div className="w-full text-center text-xs text-emerald-600 font-medium py-1 bg-emerald-50 rounded">
                            Order Completed & Settled
                          </div>
                        )}
                        {order.status === 'CANCELLED' && (
                          <div className="w-full text-center text-xs text-rose-600 font-medium py-1 bg-rose-50 rounded">
                            Order Voided
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {INITIAL_ROOMS.map(rm => (
                  <Card key={rm.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-900">Room {rm.roomNumber}</span>
                      <Badge variant={rm.status === 'OCCUPIED' ? 'success' : 'neutral'}>
                        {rm.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">Floor {rm.floor} &bull; {rm.type}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Scan URL: /g/{rm.roomNumber}</span>
                      <Button variant="outline" size="sm" className="text-xs">
                        <QrCode className="w-3.5 h-3.5 mr-1" /> Tent Card
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <Card className="p-4 divide-y divide-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3">Recent Hotel Events</h3>
              <div className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Order #ORD-8821 Created by Guest</p>
                  <p className="text-slate-400">Room 402 &bull; Total: $55.08</p>
                </div>
                <span className="text-slate-400 text-[11px]">6 mins ago</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Order #ORD-8819 Moved to Kitchen</p>
                  <p className="text-slate-400">By Marcus Vance &bull; Room 215</p>
                </div>
                <span className="text-slate-400 text-[11px]">10 mins ago</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Guest Check-In Verified</p>
                  <p className="text-slate-400">Adeola Johnson assigned to Room 402</p>
                </div>
                <span className="text-slate-400 text-[11px]">2 hours ago</span>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
