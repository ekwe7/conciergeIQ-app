import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { ArrowLeft, CheckCircle2, ShieldCheck, DoorClosed, Clock } from 'lucide-react';

export interface CheckoutPageProperties {
  roomNumber?: string;
  onOrderCompleted?: (orderId: string) => void;
}

/**
 * Express checkout and room confirmation page for the guest web experience.
 */
export const CheckoutPage: React.FC<CheckoutPageProperties> = ({
  roomNumber = '402',
  onOrderCompleted,
}) => {
  const navigate = useNavigate();
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');

  const handleConfirmOrder = () => {
    setIsSubmittingOrder(true);
    const generatedOrderId = `ord_CONFIRMED_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    setTimeout(() => {
      setIsSubmittingOrder(false);
      if (onOrderCompleted) {
        onOrderCompleted(generatedOrderId);
      } else {
        navigate(`/orders/${generatedOrderId}`);
      }
    }, 600);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Back to Cart"
          onClick={() => navigate('/cart')}
          className="p-1.5 rounded-full hover:bg-surface-muted text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text">Confirm Delivery</h2>
          <p className="text-xs text-text-muted">Direct to room checkout</p>
        </div>
      </div>

      <Card className="p-4 space-y-3 shadow-elevation-low">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-brand" />
            <span className="font-semibold text-sm text-text">Delivery Destination</span>
          </div>
          <Badge variant="success">
            Room {roomNumber}
          </Badge>
        </div>

        <div className="text-xs text-text-muted space-y-1">
          <p className="flex items-center gap-1.5 font-medium text-text">
            <Clock className="w-3.5 h-3.5 text-brand" />
            Estimated delivery: 25 - 35 minutes
          </p>
          <p>
            Charges will be automatically applied to your room stay folio. No payment card is required at delivery.
          </p>
        </div>

        <div>
          <label
            htmlFor="deliveryNotes"
            className="block text-xs font-semibold text-text mb-1"
          >
            Special Delivery Instructions (Optional)
          </label>
          <textarea
            id="deliveryNotes"
            rows={2}
            value={deliveryInstructions}
            onChange={(changeEvent) => setDeliveryInstructions(changeEvent.target.value)}
            placeholder="e.g. Please leave on the tray stand by the door, no knocking"
            className="w-full text-xs p-2.5 rounded-md border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </Card>

      <div className="p-3 bg-surface-muted rounded-lg border border-border flex items-center gap-2 text-xs text-text-muted">
        <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
        <span>Verified room stay &bull; Billed to Room {roomNumber}</span>
      </div>

      <Button
        variant="primary"
        size="lg"
        disabled={isSubmittingOrder}
        className="w-full flex items-center justify-center gap-2"
        onClick={handleConfirmOrder}
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{isSubmittingOrder ? 'Submitting Order...' : 'Place Room Service Order'}</span>
      </Button>
    </div>
  );
};
