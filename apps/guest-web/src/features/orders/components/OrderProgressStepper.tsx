import React from 'react';
import { OrderStatus } from '@conciergeiq/contracts';
import { Card } from '@conciergeiq/ui';
import { Clock, ChefHat, CheckCircle2, Check } from 'lucide-react';
import { formatTimeOnly } from '@conciergeiq/utils';

export interface OrderProgressStepperProperties {
  orderStatus: OrderStatus;
  createdAtIsoTimestamp?: string;
  updatedAtIsoTimestamp?: string;
  className?: string;
}

interface StepperStageDefinition {
  statusKey: OrderStatus;
  stepNumber: number;
  label: string;
  description: string;
  iconComponent: React.ComponentType<{ className?: string }>;
}

const ORDER_LIFECYCLE_STAGES: StepperStageDefinition[] = [
  {
    statusKey: 'PENDING',
    stepNumber: 1,
    label: 'Order received',
    description: 'Sent to kitchen staff instantly',
    iconComponent: Clock,
  },
  {
    statusKey: 'IN_PROGRESS',
    stepNumber: 2,
    label: 'In the kitchen',
    description: 'Staff accepted order, meal being prepared',
    iconComponent: ChefHat,
  },
  {
    statusKey: 'DELIVERED',
    stepNumber: 3,
    label: 'Delivered',
    description: 'Brought to your room door',
    iconComponent: CheckCircle2,
  },
];

/**
 * Resolves current numeric stage index (0 = PENDING, 1 = IN_PROGRESS, 2 = DELIVERED).
 */
function resolveCurrentStageIndex(orderStatus: OrderStatus): number {
  switch (orderStatus) {
    case 'PENDING':
      return 0;
    case 'IN_PROGRESS':
      return 1;
    case 'DELIVERED':
      return 2;
    case 'CANCELLED':
    default:
      return -1;
  }
}

/**
 * Multi-step vertical progress indicator displaying real-time order transitions
 * with animated connection lines, stage icons, and timestamp labels conforming to G05 prototype.
 */
export const OrderProgressStepper: React.FC<OrderProgressStepperProperties> = ({
  orderStatus,
  createdAtIsoTimestamp,
  updatedAtIsoTimestamp,
  className = '',
}) => {
  const currentStageIndex: number = resolveCurrentStageIndex(orderStatus);
  const isOrderHaltedOrCancelled: boolean = orderStatus === 'CANCELLED';

  const formattedPlacedTime: string = createdAtIsoTimestamp
    ? formatTimeOnly(createdAtIsoTimestamp)
    : '';
  const formattedUpdatedTime: string = updatedAtIsoTimestamp
    ? formatTimeOnly(updatedAtIsoTimestamp)
    : '';

  return (
    <Card className={`p-5 bg-surface border-border shadow-elevation-low ${className}`}>
      <ol
        aria-label="Order fulfillment progress"
        className="relative space-y-6 list-none p-0 m-0"
      >
        {ORDER_LIFECYCLE_STAGES.map((stageDefinition, stageIndex) => {
          const isCompletedStage: boolean =
            !isOrderHaltedOrCancelled && currentStageIndex > stageIndex;
          const isCurrentActiveStage: boolean =
            !isOrderHaltedOrCancelled && currentStageIndex === stageIndex;
          const isUpcomingPendingStage: boolean =
            isOrderHaltedOrCancelled || currentStageIndex < stageIndex;

          const isLastStageInList: boolean =
            stageIndex === ORDER_LIFECYCLE_STAGES.length - 1;

          let resolvedTimestampLabel: string = '';
          if (stageIndex === 0 && formattedPlacedTime.length > 0) {
            resolvedTimestampLabel = formattedPlacedTime;
          } else if (
            (stageIndex === 1 || stageIndex === 2) &&
            (isCompletedStage || isCurrentActiveStage) &&
            formattedUpdatedTime.length > 0
          ) {
            resolvedTimestampLabel = formattedUpdatedTime;
          }

          const StageIcon = stageDefinition.iconComponent;

          return (
            <li
              key={stageDefinition.statusKey}
              aria-current={isCurrentActiveStage ? 'step' : undefined}
              className="relative flex items-start gap-4"
            >
              {/* Vertical connecting line */}
              {!isLastStageInList && (
                <div
                  aria-hidden="true"
                  className="absolute left-4 top-8 -bottom-6 w-0.5 -translate-x-1/2 bg-border transition-colors duration-500 overflow-hidden"
                >
                  <div
                    className={`w-full transition-all duration-700 ease-in-out ${
                      isCompletedStage
                        ? 'h-full bg-brand'
                        : isCurrentActiveStage
                        ? 'h-1/2 bg-brand animate-pulse'
                        : 'h-0 bg-transparent'
                    }`}
                  />
                </div>
              )}

              {/* Indicator Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-300 ${
                  isCompletedStage
                    ? 'bg-brand text-white shadow-elevation-low ring-2 ring-brand/20'
                    : isCurrentActiveStage
                    ? 'bg-brand/10 border-2 border-brand text-brand ring-4 ring-brand/10'
                    : 'bg-surface-muted border border-border text-text-muted opacity-70'
                }`}
              >
                {isCompletedStage ? (
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                ) : isCurrentActiveStage ? (
                  <StageIcon className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span>{stageDefinition.stepNumber}</span>
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h4
                    className={`text-sm font-semibold tracking-tight transition-colors ${
                      isCurrentActiveStage
                        ? 'text-text font-bold'
                        : isCompletedStage
                        ? 'text-text font-medium'
                        : 'text-text-muted opacity-60 font-normal'
                    }`}
                  >
                    {stageDefinition.label}
                  </h4>

                  {resolvedTimestampLabel.length > 0 && (
                    <span className="text-[11px] font-mono text-text-muted shrink-0">
                      {resolvedTimestampLabel}
                    </span>
                  )}
                </div>

                <p
                  className={`text-xs mt-0.5 leading-relaxed transition-colors ${
                    isCurrentActiveStage
                      ? 'text-text-muted'
                      : isCompletedStage
                      ? 'text-text-muted'
                      : 'text-text-muted opacity-50'
                  }`}
                >
                  {stageDefinition.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
