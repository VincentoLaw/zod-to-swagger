import express from 'express';
import * as z from 'zod';
import fs from 'fs';
import request from 'supertest';
import { pathWithDocs, withDocs, zodToSwaggerInit } from '../index';

const testsDir = './testsTempDir';
const swaggerPath = testsDir + '/swagger.json';

beforeAll(async () => {
    try {
        await fs.promises.access(testsDir);
    } catch (err) {
        await fs.promises.mkdir(testsDir);
    }
});

afterAll(async () => {
    try {
        await fs.promises.rmdir(testsDir);
    } catch (err) {
    }
});

afterEach(async () => {
    try {
        await fs.promises.rm(swaggerPath);
    } catch (err) {
    }
})

//hapi has server.inject for testing
//https://niralar.com/testing-hapi-js-with-jest/

//https://soyuka.me/call-framework-routes-programmatically/

describe('express', () => {
    const app = express();

    test('empty test', () => {//TODO remove
        expect(1).toBe(1);
    });

    /*test('full path', () => {

    });

    test('root level', () => {


    });*/

    /*test('deep level', async () => {
        let called = false;
        app.use(...pathWithDocs('/subroute', () =>
            () => {
                const router = express.Router();
                const [method, path, handler] = withDocs(
                    { method: 'get', path: '/endpoint', query: z.object({name: z.string()}) },
                    (reqData, req, res) => {
                        expect(reqData.query.name).toBe('someName')
                        called = true;//can use spy instead
                        console.log('called!');
                        return res.status(200).send('');
                    }
                );
                router[method](path, handler);
            }
        ));
        // app.get('/subroute/endpoint', function(req, res) {
        //     console.log('called!');
        //     called = true;
        //     res.status(200).json({ name: 'john' });
        // });
        zodToSwaggerInit({ outFile: swaggerPath });
        await request(app)
            .get('/subroute/endpoint?name=qwe');

        //app._router.handle({url: '/subroute/endpoint', method: 'POST'}, {}, () => {});
        expect(called).toBe(true);
    });*/

    /*test('middlewares', () => {

    });

    test('autoparse query and params', () => {

    });
    */
});
