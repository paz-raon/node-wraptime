"use strict";

const wrapAsync = require('../').wrapAsync;

const {promisify} = require('util'),
    logger = require('pino')({ prettyPrint: true }),
    nock = require('nock'),
    http = require('superagent'),
    redis = require('redis-mock'),
    client = redis.createClient();

const chai = require('chai');
const expect = chai.expect;

describe('wraptime without logger', () => {
    describe('redis', () => {
        let key = 'foo';
        let value = 'bar';

        it('get after set', async () => {
            let setAsync = promisify(client.set).bind(client);
            let getAsync = promisify(client.get).bind(client);
            await setAsync(key, value);
            let result = await getAsync(key);
            expect(result).to.equal(value);
        });

        it('get after set with wraptime', async () => {
            let setAsync = promisify(client.set).bind(client);
            let getAsync = promisify(client.get).bind(client);
            wrapAsync(null, setAsync)(key, value);
            let result = await wrapAsync(null, getAsync)(key);
            expect(result).to.equal(value);
        });
    });
});

describe('wraptime with logger', () => {
    describe('httpclient', () => {
        let testUrl = 'http://localhost:3000';

        it('HttpClient#get on production env', async () => {
            process.env.NODE_ENV = 'production';
            let mockResponseBody = `ok (${process.env.NODE_ENV})`;
            nock(testUrl).get('/').query({env: process.env.NODE_ENV}).reply(200, { result: mockResponseBody });

            let httpClient = new HttpClient();
            let response = await httpClient.get(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000)
            expect(response.body.result).to.equal(mockResponseBody);
        });

        it('HttpClient#get on test env', async () => {
            process.env.NODE_ENV = 'test';
            let mockResponseBody = `ok (${process.env.NODE_ENV})`;
            nock(testUrl).get('/').query({env: process.env.NODE_ENV}).reply(200, { result: mockResponseBody });

            let httpClient = new HttpClient();
            let response = await httpClient.get(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000)
            expect(response.body.result).to.equal(mockResponseBody);
        });
    });
});

class HttpClient {
    constructor() {
        // wrapper
        if (process.env.NODE_ENV === 'test') {
            ['get'].forEach((name) => {
                let oldF = this[name];
                this[name] = wrapAsync(this, oldF, ({ thisArg, func, result, args, time }) => {
                        logger.info(`${thisArg.constructor.name}#${func.name}: ${time} ms elapsed.`);
                        logger.info(`[Request ${func.name.toUpperCase()} ${result.statusCode}] ${args[0]}`);
                        logger.info(`[Request headers] ${JSON.stringify(args[1])}`);
                        logger.info(`[Request queries] ${JSON.stringify(args[2])}`);
                        logger.info(`[Request timeout] ${JSON.stringify(args[3])}`);
                        logger.info(`[Response headers] ${JSON.stringify(result.headers)}`);
                        logger.info(`[Response body] ${JSON.stringify(result.body)}\n`);
                    }
                );
            });
        }
    }

    get(url, headers, queries, timeout) {
        let restObj = http.get(url).timeout(timeout);
        if (headers) restObj.set(headers);
        if (queries) restObj.query(queries);
        return restObj;
    };
}