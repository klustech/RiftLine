let token: string | undefined;

export function setAuthToken(value: string) {
  token = value;
}

export function getAuthToken() {
  return token;
}
