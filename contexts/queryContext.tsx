import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // Data is fresh for 30 seconds
            gcTime: 5 * 60 * 1000, // Cache for 5 minutes (was cacheTime)
            retry: (failureCount, error: any) => {
                // Don't retry on 4xx errors (client errors)
                if (error?.status >= 400 && error?.status < 500) {
                    return false;
                }
                // Retry up to 3 times for other errors
                return failureCount < 3;
            },
            refetchOnWindowFocus: false, // Disable on mobile
            refetchOnReconnect: true, // Refetch when network reconnects
        },
        mutations: {
            retry: 1,
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

export { queryClient };