import {
  GuestServiceRequestCategory,
  GuestServiceRequestCreate,
  GuestServiceRequestResponse,
  ServiceRequestItem,
} from '@conciergeiq/contracts';

export type AmenityCategory = GuestServiceRequestCategory;

export interface AmenityCatalogOption {
  identifier: string;
  name: string;
  category: AmenityCategory;
  iconEmoji: string;
  description: string;
  maximumQuantity: number;
}

export type SelectedAmenitiesMap = Record<string, number>;

export interface ServiceRequestSubmissionPayload extends GuestServiceRequestCreate {
  roomNumber: string;
  stayId: string;
  items: ServiceRequestItem[];
  specialInstructions?: string;
  notes?: string;
  category?: AmenityCategory;
}

export interface ServiceRequestExecutionResult {
  isSuccessful: boolean;
  isMockFallbackActivated: boolean;
  requestIdentifier: string;
  estimatedDeliveryMinutes: number;
  creationTimestamp: string;
  confirmedItems: ServiceRequestItem[];
  roomNumber: string;
  errorMessage?: string | null;
}

/**
 * Canonical in-room amenities and housekeeping catalog matching UI: G06.
 */
export const DEFAULT_AMENITIES_CATALOG: AmenityCatalogOption[] = [
  {
    identifier: 'amenity_extra_towels',
    name: 'Extra towels',
    category: 'TOWELS',
    iconEmoji: '🛁',
    description: 'Fresh, plush bath and hand towels brought to your room door.',
    maximumQuantity: 4,
  },
  {
    identifier: 'amenity_toiletries',
    name: 'Toiletries',
    category: 'TOILETRIES',
    iconEmoji: '🧴',
    description: 'Luxury shampoo, body wash, dental care kit, and shaving set.',
    maximumQuantity: 4,
  },
  {
    identifier: 'amenity_extra_pillow',
    name: 'Extra pillow',
    category: 'HOUSEKEEPING',
    iconEmoji: '🛏️',
    description: 'Choice of soft down or firm hypoallergenic sleeping pillows.',
    maximumQuantity: 3,
  },
  {
    identifier: 'amenity_room_cleaning',
    name: 'Room cleaning',
    category: 'HOUSEKEEPING',
    iconEmoji: '🧹',
    description: 'Full refresh including bed making, linen change, and trash removal.',
    maximumQuantity: 1,
  },
  {
    identifier: 'amenity_ice_bucket',
    name: 'Ice bucket',
    category: 'OTHER',
    iconEmoji: '🧊',
    description: 'Chilled insulated bucket filled with clean ice cubes.',
    maximumQuantity: 2,
  },
  {
    identifier: 'amenity_phone_charger',
    name: 'Phone charger',
    category: 'OTHER',
    iconEmoji: '🔌',
    description: 'USB-C or Lightning high-speed multi-adapter charger cable.',
    maximumQuantity: 2,
  },
  {
    identifier: 'amenity_iron_and_board',
    name: 'Iron & board',
    category: 'OTHER',
    iconEmoji: '👔',
    description: 'Full-size steam iron and compact folding ironing board.',
    maximumQuantity: 1,
  },
  {
    identifier: 'amenity_do_not_disturb',
    name: 'Do not disturb',
    category: 'HOUSEKEEPING',
    iconEmoji: '🌙',
    description: 'Digital privacy notice placed on room profile to suspend services.',
    maximumQuantity: 1,
  },
];
