/**
 * public/service-worker.js has to evaluate in a service worker's global scope.
 *
 * From 803b3f2 (June 2026) until this test, its header comment contained `**` + `/api/` + `**`.
 * The `*` + `/` in that closed the comment early and the next `/` + `**` opened a new one,
 * leaving a bare `api` between them. That is valid syntax, so the build and `node --check`
 * passed, but evaluating the script threw "ReferenceError: api is not defined": browsers
 * logged "ServiceWorker script evaluation failed" and no visitor ever installed the worker.
 *
 * The script is run here in a VM context with a stand-in for the worker's global scope.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SW_PATH = path.join(__dirname, '..', '..', 'public', 'service-worker.js');

function loadWorker() {
  const listeners = {};
  const self = {
    location: { origin: 'https://stickforstats.com' },
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn(() => Promise.resolve()), openWindow: jest.fn() },
    registration: { showNotification: jest.fn() },
  };
  const cache = { add: jest.fn(() => Promise.resolve()), put: jest.fn(() => Promise.resolve()) };
  const caches = {
    open: jest.fn(() => Promise.resolve(cache)),
    keys: jest.fn(() => Promise.resolve([])),
    match: jest.fn(() => Promise.resolve(undefined)),
    delete: jest.fn(() => Promise.resolve(true)),
  };
  const response = { status: 200, type: 'basic', clone: () => response };
  const fetch = jest.fn(() => Promise.resolve(response));
  vm.runInNewContext(fs.readFileSync(SW_PATH, 'utf8'), { self, caches, fetch, URL, Promise }, { filename: SW_PATH });
  return { listeners, cache, response };
}

function fetchEvent(url, mode = 'cors') {
  return { request: { url, method: 'GET', mode }, respondWith: jest.fn() };
}

test('the script evaluates and registers its handlers', () => {
  const { listeners } = loadWorker();
  expect(Object.keys(listeners)).toEqual(expect.arrayContaining(['install', 'activate', 'fetch']));
});

test('it leaves API calls to the network', () => {
  const { listeners } = loadWorker();
  const api = fetchEvent('https://stickforstats.com/api/v1/health/');
  listeners.fetch(api);
  expect(api.respondWith).not.toHaveBeenCalled();
});

test('a page load goes to the network first and keeps the fresh shell for offline use', async () => {
  const { listeners, cache, response } = loadWorker();
  const page = fetchEvent('https://stickforstats.com/modules/t-test', 'navigate');
  listeners.fetch(page);
  expect(page.respondWith).toHaveBeenCalledTimes(1);
  await expect(page.respondWith.mock.calls[0][0]).resolves.toBe(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(cache.put).toHaveBeenCalledWith('/index.html', response);
});
