import { resetNetworkMock } from './__mocks__/netinfo';
import { resetNativeMocks } from './__mocks__/react-native';

beforeEach(() => {
  resetNativeMocks();
  resetNetworkMock();
});

afterEach(() => {
  jest.restoreAllMocks();
});
