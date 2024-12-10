// tests/clients/dbClient.test.js
const dbClient = require('../utils/db');

import {
  expect, use, should, request,
} from 'chai';

describe('DB Client', () => {
  it('should connect to MongoDB', async () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('should retrieve the number of documents in a collection', async () => {
    const count = await dbClient.nbUsers();
    expect(count).to.be.at.least(0);
  });
});

