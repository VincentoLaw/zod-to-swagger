import express from 'express';
import * as z from 'zod';
import fs from 'fs';
const swaggerUi = require('swagger-ui-express');
import { pathWithDocs, withDocs, zodToSwaggerInit } from '../index';

const testsDir = './testsTempDir';
const swaggerPath = testsDir + '/swagger.json';

async function getSwaggerFile(){
    return JSON.parse(await (await fs.promises.readFile(swaggerPath)).toString());
}

beforeAll(async () => {
    try {
        await fs.promises.access(testsDir);
    } catch (err) {
        await fs.promises.mkdir(testsDir);
    }
});

const withSwaggerUI = true;

afterAll(async () => {
    try {
        if (!withSwaggerUI){
            await fs.promises.rmdir(testsDir);
        } else {
            const swaggerDocument = require('../../' + swaggerPath);
            const app = express();
            app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
            app.listen(8000, function () {
                console.log(`Example app listening on port ${8000}!`);
            });
            await new Promise((res) => setTimeout(res, 24 * 60* 60 * 1000));
        }
    } catch (err) {
        console.log(err);
    }
});

afterEach(async () => {
    try {
        if (!withSwaggerUI){
            await fs.promises.rm(swaggerPath);
        }
    } catch (err) {
    }
});

//https://medium.com/@mtiller/debugging-with-typescript-jest-ts-jest-and-visual-studio-code-ef9ca8644132
describe('generated file correctness', () => {
    test('file created', async () => {
        withDocs(
            { method: 'get', path: '/file_created', query: z.object({ name: z.string() }) },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });

        expect(fs.promises.access(swaggerPath)).resolves;
    });

    test('empty body, query, params', async () => {
        //TODO root level withDocs not working?
        pathWithDocs('/api', () => {
            withDocs(
                { method: 'get', path: '/empty_body_query_params', query: z.object({ name: z.string() }) },
                (reqData) => {}
            );
        })

        await zodToSwaggerInit({ outFile: swaggerPath });

        const file = await getSwaggerFile();

        expect(file.paths['/api/empty_body_query_params'].get.parameters).toEqual([
            query('string', 'name')
        ]);
    });

    /*
    test('query', async () => {
        //TODO root level withDocs not working?
        pathWithDocs('/api', () => {
            withDocs(
                { method: 'get', path: '/test2', query: z.object({ name: z.string() }) },
                (reqData) => {}
            );
        })

        await zodToSwaggerInit({ outFile: swaggerPath });

        const file = JSON.parse(await (await fs.promises.readFile(swaggerPath)).toString());

        expect(file.paths['/api/test2'].get.parameters).toEqual([{
            in:'query',
            name:'name',
            required:true,
            schema:{type: 'string'}}
        ]);
    });*/
});

function queryOrParams(qOrP: 'query'|'path', type: string, name: string, required: boolean){
    return {
        in: qOrP,
        name,
        required,
        schema:{ type }
    }
}
function params(type: string, name: string, required: boolean = true){
    return queryOrParams('path', type, name, required);
}

function query(type: string, name: string, required: boolean = true){
    return queryOrParams('query', type, name, required);
}

//TODO check required flag in every new case

describe('standard types', () => {
    test('string', async() => {
        //describe endpoint in docs
        withDocs(
            {
                method: 'post', path: '/standard_types/string',
                params: z.object({ p: z.string() }),
                query: z.object({ q: z.string() }),
                body: z.object({ b: z.string() }),
            },
            () => {}
        );

        //generate and save documentation file
        await zodToSwaggerInit({ outFile: swaggerPath });

        //save documentation file to 'file' variable
        const file = await getSwaggerFile();

        //check, does documentation have parameter p with type string, and parameter q with type string
        expect(file.paths['/standard_types/string'].post.parameters).toEqual([
            params('string', 'p'),
            query('string', 'q'),
        ]);

        //check, does documentation have body property p
        expect(file.paths['/standard_types/string'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"string"
                            },
                        },
                        "required":[
                            "b"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('number', async() => {
        //describe endpoint in docs
        withDocs(
            {
                method: 'post', path: '/standard_types/number',
                params: z.object({ p: z.number() }),
                query: z.object({ q: z.number() }),
                body: z.object({ b: z.number() }),
            },
            () => {}
        );

        //generate and save documentation file
        await zodToSwaggerInit({ outFile: swaggerPath });

        //save documentation file to 'file' variable
        const file = await getSwaggerFile();

        //check, does documentation have parameter p with type string, and parameter q with type string
        expect(file.paths['/standard_types/number'].post.parameters).toEqual([
            params('number', 'p'),
            query('number', 'q'),
        ]);

        //check, does documentation have body property p
        expect(file.paths['/standard_types/number'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"number"
                            },
                        },
                        "required":[
                            "b"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    })

    /*
    string - done
    number
    bigint
    boolean
    date

    undefined (one property - undefined, another - undefined or string)
    null (one property - null, another - null or string)
    void (one property - void, another - void or string)

    union (with [object & array & string] or [number & string])

    enum (of literal)
    object (of string, number, boolean)
    array (one property - array of objects, another property - array of strings)

    any
    unknown

    tuple ([string, number, object, array])
    record (some object like in zod documentation, with any string key of object)

    lazy (of object, of string, of array, may be 3 different tests)
    */
});

describe('mixed types', () => {
    const zodExampleObj = z.object({ s: z.string() });
    //here in tests any abstract type like lazy or array should contain zodExampleObj,
    //or [zodExampleObj & string] for types like union

    //record+lazy, record+union, record+array
    //object+lazy(object), object+lazy(string), object+union([lazy(object), object, string]), object+array, object+tuple
    //array+object, array+tuple, array+lazy(string), array+union([lazy(object), string])
    //tuple+([lazy(object), union([lazy(string), string]) ])

    //  attention! here is union of union, don't misunderstand!
    //union([lazy(object),  union([lazy(string), object]) ])
    //lazy+(lazy(object)), lazy+lazy(union([lazy(object), string]))
});
