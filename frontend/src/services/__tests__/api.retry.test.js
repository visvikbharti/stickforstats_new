/**
 * Which answers of the server the client asks for again.
 *
 * The generic methods of services/api.js ask again, up to three times and a second apart, when the
 * server answers with a status of 500 or more: such an error may pass. Status 501 is not such an
 * error. The server says that it cannot do what was asked, and the question page, whose route
 * answers 501 with one sentence, sent its file four times before it showed the sentence.
 */
import axios from 'axios';

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: { create: jest.fn(() => instance), post: jest.fn() }, create: jest.fn(() => instance) };
});

// what the response interceptor of the client throws for an answer with an error status
const answered = (status, message) => Object.assign(new Error(message), { name: 'ApiError', code: `HTTP_${status}`, status });

describe('the generic methods of the client', () => {
  let api;
  let instance;

  beforeAll(() => {
    api = require('../api').default;
    instance = axios.create.mock.results[0].value;
  });

  beforeEach(() => {
    instance.post.mockReset();
    instance.get.mockReset();
  });

  test('an answer with status 501 is handed over at once and is not asked for again', async () => {
    const sentence = 'This version cannot read a question, so nothing was analysed. Run the test you want on its own page.';
    instance.post.mockRejectedValue(answered(501, sentence));
    await expect(api.post('/v1/autonomous/query/', {})).rejects.toMatchObject({ status: 501, message: sentence });
    expect(instance.post).toHaveBeenCalledTimes(1);
  });

  test('an answer with status 503 is asked for three more times', async () => {
    instance.post.mockRejectedValue(answered(503, 'Service Unavailable'));
    await expect(api.post('/v1/stats/ttest/', {})).rejects.toMatchObject({ status: 503 });
    expect(instance.post).toHaveBeenCalledTimes(4);
  });

  test('an answer with status 500 is asked for again as before, and the second answer is taken', async () => {
    instance.get.mockRejectedValueOnce(answered(500, 'Internal Server Error')).mockResolvedValueOnce({ data: { ok: true } });
    await expect(api.get('/v1/health/')).resolves.toEqual({ data: { ok: true } });
    expect(instance.get).toHaveBeenCalledTimes(2);
  });

  test('an answer with status 400 is not asked for again', async () => {
    instance.post.mockRejectedValue(answered(400, 'Invalid input'));
    await expect(api.post('/v1/stats/ttest/', {})).rejects.toMatchObject({ status: 400 });
    expect(instance.post).toHaveBeenCalledTimes(1);
  });
});
