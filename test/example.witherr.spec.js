"use strict";

const wrapAsyncWithErr = require('../').wrapAsyncWithErr;

const logger = require('pino')({ prettyPrint: true }),
    nock = require('nock'),
    http = require('superagent'),
    redis = require('redis-mock'),
    client = redis.createClient();

const chai = require('chai');
const expect = chai.expect;

describe('wrapAsyncWithErr with logger', () => {
    describe('httpclient', () => {
        let testUrl = 'http://localhost:3000';

        it('HttpClient#get', async () => {
            let mockResponseBody = `ok withErr`;
            nock(testUrl).get('/').query({env: process.env.NODE_ENV}).reply(200, { result: mockResponseBody });

            let httpClient = new HttpClient();
            let response = await httpClient.get(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000);
            expect(response.body.result).to.equal(mockResponseBody);
        });

        it('HttpClient#getErr', async () => {
            let mockResponseBody = `ok withErr`;
            nock(testUrl).get('/').query({env: process.env.NODE_ENV}).reply(200, { result: mockResponseBody });

            let httpClient = new HttpClient();

            try {
                let response = await httpClient.getErr(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000);
            } catch (err) {
                expect(err.message).to.equal('just error!!');
            }
        });
    });
});

class HttpClient {
    constructor() {
        ['get', 'getErr'].forEach((name) => {
            let oldF = this[name];
            this[name] = wrapAsyncWithErr(this, oldF,
                ({ thisArg, func, args, time, result }) => {
                    logger.info(`${thisArg.constructor.name}#${func.name}: ${time} ms elapsed.`);
                    logger.info(`[Request ${func.name.toUpperCase()} ${result.statusCode}] ${args[0]}`);
                    logger.info(`[Request headers] ${JSON.stringify(args[1])}`);
                    logger.info(`[Request queries] ${JSON.stringify(args[2])}`);
                    logger.info(`[Request timeout] ${JSON.stringify(args[3])}`);
                    logger.info(`[Response headers] ${JSON.stringify(result.headers)}`);
                    logger.info(`[Response body] ${JSON.stringify(result.body)}\n`);
                },
                ({ thisArg, func, args, time, error }) => {
                    logger.info(`${thisArg.constructor.name}#${func.name}: ${time} ms elapsed.`);
                    logger.info(`[Request ${func.name.toUpperCase()}] ${args[0]}`);
                    logger.info(`[Request headers] ${JSON.stringify(args[1])}`);
                    logger.info(`[Request queries] ${JSON.stringify(args[2])}`);
                    logger.info(`[Request timeout] ${JSON.stringify(args[3])}`);
                    logger.info(`[Error message] ${error.message}`);
                }
            );
        });
    }

    get(url, headers, queries, timeout) {
        let restObj = http.get(url).timeout(timeout);
        if (headers) restObj.set(headers);
        if (queries) restObj.query(queries);
        return restObj;
    };

    getErr(url, headers, queries, timeout) {
        throw new Error('just error!!')
    };
}