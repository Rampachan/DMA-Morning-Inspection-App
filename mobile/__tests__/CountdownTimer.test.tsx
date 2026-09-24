import React from 'react';
import { render } from '@testing-library/react-native';
import CountdownTimer from '../src/components/CountdownTimer';
import * as useCountdownModule from '../src/hooks/useCountdown';

jest.mock('../src/hooks/useCountdown');

const mockUseCountdown = useCountdownModule.useCountdown as jest.MockedFunction<
  typeof useCountdownModule.useCountdown
>;

describe('CountdownTimer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Window Closed" banner when phase is closed (e.g. 08:00)', () => {
    mockUseCountdown.mockReturnValue({
      phase: 'closed',
      secondsRemaining: 0,
      formatted: '00:00:00',
    });

    const { getByText } = render(<CountdownTimer />);
    expect(
      getByText(/Window Closed — Submission will be marked LATE/i),
    ).toBeTruthy();
  });

  it('renders countdown timer when phase is open (e.g. 06:00)', () => {
    mockUseCountdown.mockReturnValue({
      phase: 'open',
      secondsRemaining: 5400, // 1h30m remaining
      formatted: '01:30:00',
    });

    const { getByText } = render(<CountdownTimer />);
    expect(getByText(/Window closes in 01:30:00/i)).toBeTruthy();
  });

  it('renders "window opens" message when phase is before_open (e.g. 04:00)', () => {
    mockUseCountdown.mockReturnValue({
      phase: 'before_open',
      secondsRemaining: 0,
      formatted: '00:00:00',
    });

    const { getByText } = render(<CountdownTimer />);
    expect(getByText(/Inspection window opens at/i)).toBeTruthy();
  });
});
