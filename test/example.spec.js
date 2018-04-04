"use strict";

const wrapAsync = require('../').wrapAsync;

const {promisify} = require('util'),
    winston = require('winston'),
    nock = require('nock'),
    unirest = require('unirest'),
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
            let response = await httpClient.get(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000).catch(()=>{});
            expect(response.body.result).to.equal(mockResponseBody);
        });

        it('HttpClient#get on test env', async () => {
            process.env.NODE_ENV = 'test';
            let mockResponseBody = `ok (${process.env.NODE_ENV})`;
            nock(testUrl).get('/').query({env: process.env.NODE_ENV}).reply(200, { result: mockResponseBody });

            let httpClient = new HttpClient();
            let response = await httpClient.get(testUrl, { 'Content-Type': 'application/json' }, { 'env': process.env.NODE_ENV }, 1000).catch(()=>{});
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
                        winston.info(`${thisArg.constructor.name}#${func.name}: ${time} elapsed.`);
                        winston.info(`[Request ${func.name.toUpperCase()} ${result.code}] ${args[0]}`);
                        winston.info(`[Request headers] ${JSON.stringify(args[1])}`);
                        winston.info(`[Request queries] ${JSON.stringify(args[2])}`);
                        winston.info(`[Request timeout] ${JSON.stringify(args[3])}`);
                        winston.info(`[Response headers] ${JSON.stringify(result.headers)}`);
                        winston.info(`[Response body] ${JSON.stringify(result.body)}\n`);
                    }
                );
            });
        }
    }

    async get(url, headers, queries, timeout) {
        return new Promise((resolve, reject) => {
            let restObj = unirest.get(url).timeout(timeout);
            if (headers) restObj.header(headers);
            if (queries) restObj.query(queries);
            restObj.end((response) => {
                if (response.ok) {
                    resolve(response);
                } else {
                    reject(response);
                }
            });
        });
    };
}