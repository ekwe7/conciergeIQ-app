/**
 * Every cached query starts with the hotel id, so data from one hotel can
 * never be served to a session for another. The cache is also cleared on
 * sign-in and sign-out.
 */
export const queryKeys = {
  hotel: (hotelId: string) => ['hotel', hotelId] as const,
  orders: (hotelId: string) => ['hotel', hotelId, 'orders'] as const,
  order: (hotelId: string, orderId: string) => ['hotel', hotelId, 'orders', orderId] as const,
  rooms: (hotelId: string) => ['hotel', hotelId, 'rooms'] as const,
  stays: (hotelId: string) => ['hotel', hotelId, 'stays'] as const,
  stayBill: (hotelId: string, stayId: string) => ['hotel', hotelId, 'stays', stayId, 'bill'] as const,
  menu: (hotelId: string) => ['hotel', hotelId, 'menu'] as const,
  payments: (hotelId: string) => ['hotel', hotelId, 'payments'] as const,
  staff: (hotelId: string) => ['hotel', hotelId, 'staff'] as const,
  activity: (hotelId: string) => ['hotel', hotelId, 'activity'] as const,
  branding: (hotelId: string) => ['hotel', hotelId, 'branding'] as const,
  escalations: (hotelId: string) => ['hotel', hotelId, 'escalations'] as const,
  articles: (hotelId: string) => ['hotel', hotelId, 'articles'] as const,
};
