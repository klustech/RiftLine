import React from 'react';
import { render } from '@testing-library/react-native';
import TravelStatusScreen from '../screens/TravelStatus';

describe('TravelStatusScreen', () => {
  it('shows provided state', () => {
    const { getByText } = render(<TravelStatusScreen route={{ params: { state: 'Streaming' } }} />);
    expect(getByText('Shard Transfer: Streaming')).toBeTruthy();
  });

  it('falls back to Pending', () => {
    const { getByText } = render(<TravelStatusScreen />);
    expect(getByText('Shard Transfer: Pending')).toBeTruthy();
  });
});
