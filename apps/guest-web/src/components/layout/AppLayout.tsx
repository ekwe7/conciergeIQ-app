import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageContainer } from './PageContainer';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { ToastContainer, BackgroundOrderNotificationListener } from '../feedback';

export interface AppLayoutProperties {
  hotelTitle?: string;
  roomNumber?: string;
  guestName?: string;
}

/**
 * Primary responsive layout shell for the Guest Web application.
 * Composes the top safe-area header, the main scrollable content container,
 * sticky bottom navigation bar, and toast notification container.
 */
export const AppLayout: React.FC<AppLayoutProperties> = ({
  hotelTitle,
  roomNumber,
  guestName,
}) => {
  return (
    <PageContainer>
      <ToastContainer />
      <BackgroundOrderNotificationListener />
      <MobileHeader
        hotelTitle={hotelTitle}
        roomNumber={roomNumber}
        guestName={guestName}
      />
      <main
        data-testid="guest-main-content"
        className="flex-1 w-full flex flex-col overflow-y-auto print:overflow-visible"
      >
        <Outlet />
      </main>
      <BottomNavigation />
    </PageContainer>
  );
};
