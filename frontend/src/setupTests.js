// Jest setup file — auto-loaded by CRA before each test suite

// Polyfill TextEncoder/TextDecoder for jsdom environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// No test fails because the machine that runs it is busy.
//
// Two clocks run in every test: Jest's budget for one test, five seconds unless a file sets its
// own, and the testing library's deadline for something a test waits for (findBy..., waitFor),
// one second. Both are measured on the machine that runs the tests. On a busy machine six tests
// have each failed on one of the two, with nothing wrong in the code under test.
//
// A test that waits for the page still goes on as soon as the page is there. It gives up after
// 30 seconds, and a test has a minute.
const { configure } = require('@testing-library/react');

configure({ asyncUtilTimeout: 30 * 1000 });
jest.setTimeout(60 * 1000);
