import React from 'react';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { formatMoney } from '@conciergeiq/utils';
import { Receipt, CreditCard, ShieldCheck, Download, HelpCircle } from 'lucide-react';

export interface FolioBillPageProperties {
  roomNumber?: string;
  guestName?: string;
}

interface FolioLineItem {
  id: string;
  description: string;
  category: 'ROOM' | 'DINING' | 'TAX' | 'SERVICE';
  dateString: string;
  amountMinor: number;
}

const SAMPLE_FOLIO_LINE_ITEMS: FolioLineItem[] = [
  {
    id: 'folio_1',
    description: 'Deluxe King Suite - Nightly Rate',
    category: 'ROOM',
    dateString: '2026-11-02',
    amountMinor: 28000,
  },
  {
    id: 'folio_2',
    description: 'Room Service: Artisan Avocado Toast & Espresso',
    category: 'DINING',
    dateString: '2026-11-03',
    amountMinor: 4482,
  },
  {
    id: 'folio_3',
    description: 'Room Service: Truffle Wagyu Burger',
    category: 'DINING',
    dateString: '2026-11-03',
    amountMinor: 2592,
  },
  {
    id: 'folio_4',
    description: 'Hospitality City Tax & Tourism Surcharge',
    category: 'TAX',
    dateString: '2026-11-03',
    amountMinor: 2800,
  },
];

/**
 * Guest folio bill summary page presenting charges and pending folio balance.
 */
export const FolioBillPage: React.FC<FolioBillPageProperties> = ({
  roomNumber = '402',
  guestName = 'Adeola Johnson',
}) => {
  const totalChargesMinor = SAMPLE_FOLIO_LINE_ITEMS.reduce(
    (runningTotal, currentItem) => runningTotal + currentItem.amountMinor,
    0
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Room Folio Bill</h2>
          <p className="text-xs text-text-muted">Room {roomNumber} &bull; {guestName}</p>
        </div>
        <Badge variant="neutral">
          Express Checkout
        </Badge>
      </div>

      {/* Balance Highlight Card */}
      <Card className="p-5 bg-gradient-to-br from-brand-strong to-brand text-white shadow-elevation-mid">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
            Current Outstanding Balance
          </span>
          <Receipt className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="text-3xl font-extrabold tracking-tight">
          {formatMoney(totalChargesMinor, 'USD')}
        </div>
        <p className="text-xs text-emerald-100 mt-2 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          Charged directly to card on file upon checkout
        </p>
      </Card>

      {/* Itemized Line Items */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Itemized Charges
        </h3>

        <div className="divide-y divide-border bg-surface border border-border rounded-lg overflow-hidden shadow-elevation-low">
          {SAMPLE_FOLIO_LINE_ITEMS.map((lineItem) => (
            <div key={lineItem.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-text truncate">{lineItem.description}</p>
                <p className="text-xs text-text-muted">{lineItem.dateString}</p>
              </div>
              <span className="font-semibold text-text shrink-0">
                {formatMoney(lineItem.amountMinor, 'USD')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Assistance Information */}
      <div className="p-3 bg-surface-muted rounded-lg border border-border text-xs text-text-muted space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span>Verified Room Charges</span>
        </div>
        <p>
          All dining orders are authenticated via your room QR session and automatically added to your stay folio.
        </p>
      </div>

      <div className="pt-2 flex gap-3">
        <Button
          variant="outline"
          size="md"
          className="flex-1 flex items-center justify-center gap-2"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          <span>Save Receipt</span>
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="flex items-center justify-center gap-1 text-xs text-text-muted"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Query Charge</span>
        </Button>
      </div>
    </div>
  );
};
