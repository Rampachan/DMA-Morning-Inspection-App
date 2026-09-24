import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import InspectionScreen from '../src/screens/InspectionScreen';
import * as categoryService from '../src/services/categoryService';
import * as secureStorage from '../src/utils/secureStorage';
import { Category, User } from '../src/types';

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('../src/services/categoryService');
jest.mock('../src/services/submissionService');
jest.mock('../src/services/offlineQueue');
jest.mock('../src/services/authService');
jest.mock('../src/utils/secureStorage');
jest.mock('../src/hooks/useNetwork', () => ({
  useNetwork: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock('../src/hooks/useCountdown', () => ({
  useCountdown: () => ({ phase: 'open', secondsRemaining: 5400, formatted: '01:30:00' }),
}));

const mockGetCategories = categoryService.getCategories as jest.MockedFunction<
  typeof categoryService.getCategories
>;
const mockGetUser = secureStorage.getUser as jest.MockedFunction<
  typeof secureStorage.getUser
>;

const MOCK_CATEGORIES: Category[] = [
  { category_id: 'cat-1', name: 'Road Inspection', display_order: 1 },
  { category_id: 'cat-2', name: 'Drain Inspection', display_order: 2 },
];

const MOCK_USER: User = {
  user_id: 'u-1',
  name: 'John Commissioner',
  role: 'commissioner',
  ulb_id: 'ulb-99',
  ulb_name: 'City Municipal Corp',
};

describe('InspectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCategories.mockResolvedValue(MOCK_CATEGORIES);
    mockGetUser.mockResolvedValue(MOCK_USER);
  });

  it('renders the category picker label', async () => {
    const { getByText } = render(
      <InspectionScreen
        navigation={mockNavigation as any}
        route={{ key: 'Inspection', name: 'Inspection' } as any}
      />,
    );

    await waitFor(() => {
      expect(getByText('Inspection Category *')).toBeTruthy();
    });
  });

  it('shows the photo counter at 0 / 10 photos', async () => {
    const { getByText } = render(
      <InspectionScreen
        navigation={mockNavigation as any}
        route={{ key: 'Inspection', name: 'Inspection' } as any}
      />,
    );

    await waitFor(() => {
      expect(getByText(/0 \/ 10 photos/i)).toBeTruthy();
    });
  });

  it('shows ULB name in header after user loads', async () => {
    const { getByText } = render(
      <InspectionScreen
        navigation={mockNavigation as any}
        route={{ key: 'Inspection', name: 'Inspection' } as any}
      />,
    );

    await waitFor(() => {
      expect(getByText(/City Municipal Corp/i)).toBeTruthy();
    });
  });
});
