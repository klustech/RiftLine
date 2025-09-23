import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import WalletScreen from '../screens/Wallet';

describe('WalletScreen', () => {
  beforeEach(() => {
    (global as any).authToken = 'test-token';
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: 'https://auth.example/start', wallet: '0xabc' })
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockReset();
    jest.restoreAllMocks();
  });

  it('renders default state', () => {
    const { getByText } = render(<WalletScreen />);
    expect(getByText(/not linked/i)).toBeTruthy();
  });

  it('initiates wallet flow', async () => {
    const { getByText } = render(<WalletScreen />);
    const beginButton = getByText('Begin Social Login');
    fireEvent.press(beginButton);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/wallet/begin'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
