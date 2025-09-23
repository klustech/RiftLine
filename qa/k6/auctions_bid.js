import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '2m',
};

export default function () {
  const payload = JSON.stringify({ amount: 1000 });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': __ENV.KEY,
    },
  };

  const response = http.post(`${__ENV.API}/auctions/123/bid`, payload, params);
  check(response, {
    'status is 200': (res) => res.status === 200,
  });

  sleep(1);
}
