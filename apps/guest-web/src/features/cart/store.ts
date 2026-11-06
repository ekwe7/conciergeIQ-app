import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GuestMenuItem } from '../menu/types';
import {
  CartStoreState,
  CartLineItem,
  generateCartLineIdentifier,
  calculateCartTotals,
} from './types';

export const GUEST_CART_STORAGE_KEY: string = 'conciergeiq_guest_cart';
export const MAXIMUM_CART_ITEM_QUANTITY: number = 20;
export const MINIMUM_CART_ITEM_QUANTITY: number = 1;

/**
 * Zustand Shopping Cart Store persisted in browser sessionStorage.
 * Scoped to the active hotel stay session.
 */
export const useCartStore = create<CartStoreState>()(
  persist(
    (setStoreState, getStoreState) => ({
      stayIdentifier: null,
      lineItems: [],

      addItem: (
        menuItem: GuestMenuItem,
        requestedQuantity: number = 1,
        specialInstructions: string = ''
      ) => {
        const sanitizedQuantity = Math.min(
          MAXIMUM_CART_ITEM_QUANTITY,
          Math.max(MINIMUM_CART_ITEM_QUANTITY, requestedQuantity)
        );

        const targetLineIdentifier = generateCartLineIdentifier(
          menuItem.id,
          specialInstructions
        );

        setStoreState((currentStoreState) => {
          const existingLineItemIndex = currentStoreState.lineItems.findIndex(
            (candidateLine) => candidateLine.lineIdentifier === targetLineIdentifier
          );

          if (existingLineItemIndex !== -1) {
            // Merge duplicate line item with identical preparation notes
            const existingLineItem = currentStoreState.lineItems[existingLineItemIndex];
            const updatedQuantity = Math.min(
              MAXIMUM_CART_ITEM_QUANTITY,
              existingLineItem.quantity + sanitizedQuantity
            );

            const updatedLineItems = currentStoreState.lineItems.map(
              (candidateLine, candidateIndex) => {
                if (candidateIndex === existingLineItemIndex) {
                  return {
                    ...candidateLine,
                    quantity: updatedQuantity,
                  };
                }
                return candidateLine;
              }
            );

            return { lineItems: updatedLineItems };
          }

          // Distinct notes create a new line item
          const newLineItem: CartLineItem = {
            lineIdentifier: targetLineIdentifier,
            item: menuItem,
            quantity: sanitizedQuantity,
            specialInstructions: specialInstructions.trim() || undefined,
          };

          return {
            lineItems: [...currentStoreState.lineItems, newLineItem],
          };
        });
      },

      removeItem: (targetLineIdentifier: string) => {
        setStoreState((currentStoreState) => ({
          lineItems: currentStoreState.lineItems.filter(
            (candidateLine) => candidateLine.lineIdentifier !== targetLineIdentifier
          ),
        }));
      },

      updateQuantity: (targetLineIdentifier: string, newQuantity: number) => {
        if (newQuantity <= 0) {
          getStoreState().removeItem(targetLineIdentifier);
          return;
        }

        const clampedQuantity = Math.min(MAXIMUM_CART_ITEM_QUANTITY, newQuantity);

        setStoreState((currentStoreState) => ({
          lineItems: currentStoreState.lineItems.map((candidateLine) => {
            if (candidateLine.lineIdentifier === targetLineIdentifier) {
              return {
                ...candidateLine,
                quantity: clampedQuantity,
              };
            }
            return candidateLine;
          }),
        }));
      },

      updateSpecialInstructions: (
        targetLineIdentifier: string,
        newSpecialInstructions: string
      ) => {
        setStoreState((currentStoreState) => {
          const targetLineItem = currentStoreState.lineItems.find(
            (candidateLine) => candidateLine.lineIdentifier === targetLineIdentifier
          );

          if (!targetLineItem) {
            return currentStoreState;
          }

          const newLineIdentifier = generateCartLineIdentifier(
            targetLineItem.item.id,
            newSpecialInstructions
          );

          // If the new instructions collide with another existing line, merge them
          const conflictingLineIndex = currentStoreState.lineItems.findIndex(
            (candidateLine) =>
              candidateLine.lineIdentifier === newLineIdentifier &&
              candidateLine.lineIdentifier !== targetLineIdentifier
          );

          if (conflictingLineIndex !== -1) {
            const conflictingLine = currentStoreState.lineItems[conflictingLineIndex];
            const mergedQuantity = Math.min(
              MAXIMUM_CART_ITEM_QUANTITY,
              conflictingLine.quantity + targetLineItem.quantity
            );

            return {
              lineItems: currentStoreState.lineItems
                .filter((candidateLine) => candidateLine.lineIdentifier !== targetLineIdentifier)
                .map((candidateLine) => {
                  if (candidateLine.lineIdentifier === newLineIdentifier) {
                    return {
                      ...candidateLine,
                      quantity: mergedQuantity,
                    };
                  }
                  return candidateLine;
                }),
            };
          }

          // Otherwise update in place
          return {
            lineItems: currentStoreState.lineItems.map((candidateLine) => {
              if (candidateLine.lineIdentifier === targetLineIdentifier) {
                return {
                  ...candidateLine,
                  lineIdentifier: newLineIdentifier,
                  specialInstructions: newSpecialInstructions.trim() || undefined,
                };
              }
              return candidateLine;
            }),
          };
        });
      },

      clearCart: () => {
        setStoreState({ lineItems: [] });
      },

      setStayIdentifier: (newStayIdentifier: string | null) => {
        setStoreState((currentStoreState) => {
          if (
            currentStoreState.stayIdentifier &&
            newStayIdentifier &&
            currentStoreState.stayIdentifier !== newStayIdentifier
          ) {
            // Stay changed, flush stale cart
            return {
              stayIdentifier: newStayIdentifier,
              lineItems: [],
            };
          }
          return { stayIdentifier: newStayIdentifier };
        });
      },

      getTotals: () => {
        return calculateCartTotals(getStoreState().lineItems);
      },

      getTotalItemCount: () => {
        return getStoreState().getTotals().totalItemCount;
      },

      getSubtotalMinor: () => {
        return getStoreState().getTotals().subtotalMinorUnits;
      },

      getEstimatedServiceChargeMinor: () => {
        return getStoreState().getTotals().serviceChargeMinorUnits;
      },

      getEstimatedTaxMinor: () => {
        return getStoreState().getTotals().estimatedTaxMinorUnits;
      },

      getEstimatedTotalMinor: () => {
        return getStoreState().getTotals().estimatedTotalMinorUnits;
      },
    }),
    {
      name: GUEST_CART_STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
