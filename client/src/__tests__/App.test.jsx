// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import App from '../App';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App Component Smoke Test', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default mock response for cruises and services
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/cruises')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'CRZ-101',
              line: 'Royal Caribbean',
              name: 'Wonder of the Seas',
              destination: 'Caribbean',
              durationNights: 7,
              baseAdultFare: 1200,
              capacity: 12,
              availableSeats: 12,
            }
          ]),
        });
      }
      if (url.includes('/api/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'SVC-001',
              name: 'Insurance',
              price: 80,
              billingModel: 'per_passenger',
              description: 'Full travel protection',
            }
          ]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('renders app title and heading', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Check brand header is rendered
    expect(screen.getByText('Cruise Booking System')).toBeDefined();
    // Check main heading is rendered
    expect(screen.getByText('Book Your Voyage')).toBeDefined();
  });
});
