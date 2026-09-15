import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/handler.mjs';
import { party } from '../../src/config';

export default createHandler({
  getStore: () => getStore({name:'after-dark-invitations',consistency:'strong'}),
  password: () => process.env.ADMIN_PASSWORD,
  party: {location:party.location,address:party.address},
});

export const config = {
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
