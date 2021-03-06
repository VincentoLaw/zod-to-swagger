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

const withSwaggerUI = false;

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
        withDocs(
            {
                method: 'post', path: '/standard_types/number',
                params: z.object({ p: z.number() }),
                query: z.object({ q: z.number() }),
                body: z.object({ b: z.number() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/number'].post.parameters).toEqual([
            params('number', 'p'),
            query('number', 'q'),
        ]);
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
    });

    test('bigint', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/bigint',
                params: z.object({ p: z.bigint() }),
                query: z.object({ q: z.bigint() }),
                body: z.object({ b: z.bigint() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/bigint'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": 'Type: bigint',
                "schema": { 
                    "type": "number",
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": 'Type: bigint',
                "schema": { 
                    "type": "number",
                }
            },
        ]);
        expect(file.paths['/standard_types/bigint'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"number",
                               "description": 'Type: bigint'
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

    test('boolean', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/boolean',
                params: z.object({ p: z.boolean() }),
                query: z.object({ q: z.boolean() }),
                body: z.object({ b: z.boolean() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/boolean'].post.parameters).toEqual([
            params('boolean', 'p'),
            query('boolean', 'q'),
        ]);
        expect(file.paths['/standard_types/boolean'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"boolean"
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

    test('date', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/date',
                params: z.object({ p: z.date() }),
                query: z.object({ q: z.date() }),
                body: z.object({ b: z.date() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/date'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": 'Type: date',
                "schema": { 
                    "type": "string",
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": 'Type: date',
                "schema": { 
                    "type": "string",
                }
            },
        ]);
        expect(file.paths['/standard_types/date'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"string",
                               "description": "Type: date"
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

    test('undefined', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/undefined',
                params: z.object({ 
                    p1: z.undefined(),
                    p2: z.string().optional(),
                }),
                query: z.object({
                    q1: z.undefined(),
                    q2: z.string().optional(), 
                }),
                body: z.object({
                    b1: z.undefined(),
                    b2: z.string().optional(),               
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/undefined'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "schema": { 
                    "type": "undefined",
                    "example":  "undefined",
                }
            },
            {
                "in": "path",
                "name": "p2",
                "required": false,
                "description": "reffered to type1",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "schema": { 
                    "type": "undefined",
                    "example":  "undefined",
                }
            },
            {
                "in": "query",
                "name": "q2",
                "required": false,
                "description": "reffered to type3",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/undefined'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                               "type":"undefined",
                               "example":  "undefined",
                            },
                            "b2":{
                                "$ref": "#/components/schemas/type2",
                            }
                        },
                        "required":[
                            "b1"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('null', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/null',
                params: z.object({ 
                    p1: z.null(),
                    p2: z.string().nullable(),                            //union => (string, null)
                    p3: z.union([z.number(), z.string(), z.null()]),    //union => (number, string, null)
                    p4: z.union([z.number(), z.string()]).nullable()     //union => (union, null)
                }),
                query: z.object({
                    q1: z.null(),
                    q2: z.string().nullable(),
                    q3: z.union([z.number(), z.string(), z.null()]),
                    q4: z.union([z.number(), z.string()]).nullable() 
                }),
                body: z.object({
                    b1: z.null(),
                    b2: z.string().nullable(),
                    b3: z.union([z.number(), z.string(), z.null()]),
                    b4: z.union([z.number(), z.string()]).nullable() 
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/null'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "schema": { 
                    "type": "null",
                    "example": "null"
                }
            },
            {
                "in": "path",
                "name": "p2",
                "required": true,
                "description": "reffered to type4",
                "schema": {}
            },
            {
                "in": "path",
                "name": "p3",
                "required": true,
                "description": "reffered to type5",
                "schema": {}
            },
            {
                "in": "path",
                "name": "p4",
                "required": true,
                "description": "reffered to type6",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "schema": { 
                    "type": "null",
                    "example": "null"
                }
            },
            {
                "in": "query",
                "name": "q2",
                "required": true,
                "description": "reffered to type12",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q3",
                "required": true,
                "description": "reffered to type13",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q4",
                "required": true,
                "description": "reffered to type14",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/null'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                               "type":"null",
                               "example": "null"
                            },
                            "b2":{
                                "$ref": "#/components/schemas/type8",
                            },
                            "b3":{
                                "$ref": "#/components/schemas/type9",
                            },
                            "b4":{
                                "$ref": "#/components/schemas/type10",
                            }
                        },
                        "required":[
                            "b1", "b2", "b3", "b4"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('void', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/void',
                params: z.object({ 
                    p1: z.void(),
                }),
                query: z.object({
                    q1: z.void(), 
                }),
                body: z.object({
                    b1: z.void(),               
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/void'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "schema": { 
                    "type": "void",
                    "example":  "void",
                }
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "schema": { 
                    "type": "void",
                    "example":  "void",
                }
            },
        ]);
        expect(file.paths['/standard_types/void'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                               "type":"void",
                               "example":  "void",
                            },
                        },
                        "required":[
                            "b1"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('union', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/union',
                params: z.object({ 
                    p1: z.union([
                        z.object({
                            test: z.string()
                        }),
                        z.string(),
                        z.string().array(),
                    ]),
                    p2: z.union([
                        z.number(),
                        z.string()
                    ])
                }),
                query: z.object({
                    q1: z.union([
                        z.object({
                            test: z.string()
                        }),
                        z.string(),
                        z.string().array(),
                    ]),
                    q2: z.union([
                        z.number(),
                        z.string()
                    ])
                }),
                body: z.object({
                    b1: z.union([
                        z.object({
                            test: z.string()
                        }),
                        z.string(),
                        z.string().array(),
                    ]),
                    b2: z.union([
                        z.number(),
                        z.string()
                    ])               
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/union'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "description": "reffered to type16",
                "schema": {}
            },
            {
                "in": "path",
                "name": "p2",
                "required": true,
                "description": "reffered to type17",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "description": "reffered to type20",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q2",
                "required": true,
                "description": "reffered to type21",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/union'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                                "$ref": "#/components/schemas/type18",
                            },
                            "b2":{
                                "$ref": "#/components/schemas/type19",
                            }
                        },
                        "required":[
                            "b1", "b2",
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('enum', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/enum',
                params: z.object({ p: z.enum(["qwe", "zxc"])}),
                query: z.object({ q: z.enum(["qwe", "zxc"])}),
                body: z.object({ b: z.enum(["qwe", "zxc"])}),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/enum'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "schema": { 
                    "type": "enum",
                    "enum":  ["qwe", "zxc"]
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "schema": { 
                    "type": "enum",
                    "enum":  ["qwe", "zxc"]
                }
            },
        ]);
        expect(file.paths['/standard_types/enum'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                               "type":"enum",
                               "enum": ["qwe", "zxc"]
                            },
                        },
                        "required":[
                            "b",
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('dateAndBigintInObject', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/dateAndBigintInObject',
                params: z.object({
                    p: z.object({
                        d: z.date(),
                        b: z.bigint(),
                        s: z.string()
                    })
                }),
                query: z.object({
                    q: z.object({
                        d: z.date(),
                        b: z.bigint(),
                        s: z.string()
                    })
                }),
                body: z.object({
                    b: z.object({
                        d: z.date(),
                        b: z.bigint(),
                        s: z.string()
                    })
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/dateAndBigintInObject'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": "d: date, b: bigint",
                "schema": { 
                    "type": "object",
                    "properties": {
                        "d": {
                            "type": "string"
                        },
                        "b": {
                            "type": "number"
                        },
                        "s": {
                            "type": "string"
                        }
                    },
                    "required": ["d", "b", "s"]
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": "d: date, b: bigint",
                "schema": { 
                    "type": "object",
                    "properties": {
                        "d": {
                            "type": "string"
                        },
                        "b": {
                            "type": "number"
                        },
                        "s": {
                            "type": "string"
                        }
                    },
                    "required": ["d", "b", "s"]
                }
            },
        ]);
        expect(file.paths['/standard_types/dateAndBigintInObject'].post.requestBody).toEqual({
            "required": true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "type":"object",
                                "properties": {
                                    "d": {
                                        "type": "string",
                                        "description": "Type: date"
                                    },
                                    "b": {
                                        "type": "number",
                                        "description": "Type: bigint",
                                    },
                                    "s": {
                                        "type": "string"
                                    }
                                },
                                "required": ["d", "b", "s"]
                            },
                        },
                        "required":[
                            "b",
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('object', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/object',
                params: z.object({
                    p: z.object({
                        s: z.string(),
                        n: z.number(),
                        b: z.boolean()
                    })
                }),
                query: z.object({
                    q: z.object({
                        s: z.string(),
                        n: z.number(),
                        b: z.boolean()
                    })
                }),
                body: z.object({
                    b: z.object({
                        s: z.string(),
                        n: z.number(),
                        b: z.boolean()
                    })
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/object'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "schema": { 
                    "type": "object",
                    "properties": {
                        "s": {
                            "type": "string"
                        },
                        "n": {
                            "type": "number"
                        },
                        "b": {
                            "type": "boolean"
                        }
                    },
                    "required": ["s", "n", "b"]
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "schema": { 
                    "type": "object",
                    "properties": {
                        "s": {
                            "type": "string"
                        },
                        "n": {
                            "type": "number"
                        },
                        "b": {
                            "type": "boolean"
                        }
                    },
                    "required": ["s", "n", "b"]
                }
            },
        ]);
        expect(file.paths['/standard_types/object'].post.requestBody).toEqual({
            "required": true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "type":"object",
                                "properties": {
                                    "s": {
                                        "type": "string"
                                    },
                                    "n": {
                                        "type": "number"
                                    },
                                    "b": {
                                        "type": "boolean"
                                    }
                                },
                                "required": ["s", "n", "b"]
                            },
                        },
                        "required":[
                            "b",
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('array', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/array',
                params: z.object({
                    p1: z.object({
                        test: z.string()
                    }).array(),
                    p2: z.string().array()
                }),
                query: z.object({
                    q1: z.object({
                        test: z.string()
                    }).array(),
                    q2: z.string().array()
                }),
                body: z.object({
                    b1: z.object({
                        test: z.string()
                    }).array(),
                    b2: z.string().array()
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/array'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "schema": { 
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "test": {
                                "type": "string"
                            }
                        },
                        "required": ["test"]
                    },
                }
            },
            {
                "in": "path",
                "name": "p2",
                "required": true,
                "schema": { 
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                }
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "schema": { 
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "test": {
                                "type": "string"
                            }
                        },
                        "required": ["test"]
                    },
                }
            },
            {
                "in": "query",
                "name": "q2",
                "required": true,
                "schema": { 
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                }
            },
        ]);
        expect(file.paths['/standard_types/array'].post.requestBody).toEqual({
            "required": true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                                "type":"array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "test": {
                                            "type": "string"
                                        }
                                    },
                                    "required": ["test"]
                                }
                            },
                            "b2": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            }
                        },
                        "required":[
                            "b1", "b2"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('any', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/any',
                params: z.object({ p: z.any() }),
                query: z.object({ q: z.any() }),
                body: z.object({ b: z.any() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/any'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": "reffered to type anyType",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": "reffered to type anyType",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/any'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "$ref": "#/components/schemas/anyType",
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

    test('unknown', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/unknown',
                params: z.object({ p: z.unknown() }),
                query: z.object({ q: z.unknown() }),
                body: z.object({ b: z.unknown() }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/unknown'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": "reffered to type anyType",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": "reffered to type anyType",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/unknown'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "$ref": "#/components/schemas/anyType",
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

    test('tuple', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/tuple',
                params: z.object({ 
                    p: z.tuple([
                        z.string(),
                        z.number(),
                        z.object({
                            test: z.string()
                        }),
                        z.string().array()
                    ]) 
                }),
                query: z.object({
                    q: z.tuple([
                        z.string(),
                        z.number(),
                        z.object({
                            test: z.string()
                        }),
                        z.string().array()
                    ])
                }),
                body: z.object({
                    b: z.tuple([
                        z.string(),
                        z.number(),
                        z.object({
                            test: z.string()
                        }),
                        z.string().array()
                    ])
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/tuple'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "description": "reffered to type22",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "description": "reffered to type24",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/tuple'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "$ref": "#/components/schemas/type23",
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

    test('record', async() => {
        const User = z.object({
            name: z.string(),
        });
        withDocs(
            {
                method: 'post', path: '/standard_types/record',
                params: z.object({ 
                    p: z.record(User) 
                }),
                query: z.object({ 
                    q: z.record(User) 
                }),
                body: z.object({ 
                    b: z.record(User) 
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/record'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p",
                "required": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        }
                    },
                    "required": ["name"]
                }
            },
            {
                "in": "query",
                "name": "q",
                "required": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        }
                    },
                    "required": ["name"]
                }
            },
        ]);
        expect(file.paths['/standard_types/record'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b":{
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string"
                                    }
                                },
                                "required": ["name"]
                            }
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

    // test('recordOnRoot', async() => {
    //     const User = z.object({
    //         name: z.string(),
    //     });
    //     withDocs(
    //         {
    //             method: 'post', path: '/standard_types/recordOnRoot',
    //             body: z.record(User)
    //         },
    //         () => {}
    //     );
    //     await zodToSwaggerInit({ outFile: swaggerPath });
    //     const file = await getSwaggerFile();
    //     // expect(file.paths['/standard_types/recordOnRoot'].post.requestBody).toEqual({
    //     //     "required":true,
    //     //     "content":{
    //     //         "application/json":{
    //     //             "schema":{
    //     //                 "properties":{
    //     //                     "b":{
    //     //                         "type": "object",
    //     //                         "properties": {
    //     //                             "name": {
    //     //                                 "type": "string"
    //     //                             }
    //     //                         },
    //     //                         "required": ["name"]
    //     //                     }
    //     //                 },
    //     //                 "required":[
    //     //                     "b"
    //     //                 ],
    //     //                 "type":"object"
    //     //             }
    //     //         }
    //     //     }
    //     // });
    // });

    test('lazyInObject', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/lazyInObject',
                params: z.object({
                    p1: z.lazy(() => z.string()),
                    p2: z.lazy(() => z.string().array())
                }),
                query: z.object({
                    q1: z.lazy(() => z.string()),
                    q2: z.lazy(() => z.string().array())
                }),
                body: z.object({
                    b1: z.lazy(() => z.string()),
                    b2: z.lazy(() => z.string().array())
                }),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        expect(file.paths['/standard_types/lazyInObject'].post.parameters).toEqual([
            {
                "in": "path",
                "name": "p1",
                "required": true,
                "description": "reffered to type25",
                "schema": {}
            },
            {
                "in": "path",
                "name": "p2",
                "required": true,
                "description": "reffered to type26",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q1",
                "required": true,
                "description": "reffered to type29",
                "schema": {}
            },
            {
                "in": "query",
                "name": "q2",
                "required": true,
                "description": "reffered to type30",
                "schema": {}
            },
        ]);
        expect(file.paths['/standard_types/lazyInObject'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema":{
                        "properties":{
                            "b1":{
                                "$ref": "#/components/schemas/type27",
                            },
                            "b2":{
                                "$ref": "#/components/schemas/type28",
                            },
                        },
                        "required":[
                            "b1", "b2"
                        ],
                        "type":"object"
                    }
                }
            }
        });
    });

    test('objectInLazy', async() => {
        withDocs(
            {
                method: 'post', path: '/standard_types/objectInLazy',
                // params: z.lazy(() => z.object({
                //     p: z.string()
                // })),
                // query: z.lazy(() => z.object({
                //     q: z.string()
                // })),
                body: z.lazy(() => z.object({
                    b: z.string()
                })),
            },
            () => {}
        );
        await zodToSwaggerInit({ outFile: swaggerPath });
        const file = await getSwaggerFile();
        // expect(file.paths['/standard_types/objectInLazy'].post.parameters).toEqual([
        //     {
        //         "in": "path",
        //         "required": true,
        //         "description": "reffered to type31",
        //         "schema": {}
        //     },
        //     {
        //         "in": "query",
        //         "required": true,
        //         "description": "reffered to type33",
        //         "schema": {}
        //     },
        // ]);
        expect(file.paths['/standard_types/objectInLazy'].post.requestBody).toEqual({
            "required":true,
            "content":{
                "application/json":{
                    "schema": { 
                        "type": "object",
                        "required": [],
                        "properties": {},
                        "$ref": "#/components/schemas/type31" 
                    }
                }
            }
        });
    });

    /*
    string - done
    number - done
    bigint - done => number, add description 'Type: bigint'
    boolean - done
    date - done => string, add description 'Type: date'

    if undefined/null/void (not mixed with something!), write {"type": "void", example: "void"} (null/undefined). 
    undefined (one property - undefined, string.optional) - done
    null (one property - null, string.nullable,  union(number,string,null), union(number,string).nullable) - done (for query, params and body creates 3 same types)
    void (one property - void) - done

    union (with [object & array & string] or [number & string]) - if union in params or query property, then define type with that union in components/schemas,
        and use $ref to it. Important: add to "description" of property 'refers to typeX' - done

    enum (of literal) - done
    object (of string, number, boolean) - done
    array (one property - array of objects, another property - array of strings) - done

    any - done 
    unknown - done

    tuple ([string, number, object, array]) - done
    record (some object like in zod documentation, with any string key of object)

    lazy (of object, of string, of array, may be 3 different tests) - done
    */
});

describe('mixed types', () => {
    //const zodExampleObj = z.object({ s: z.string() });
    //here in tests any abstract type like lazy or array should contain zodExampleObj,
    //or [zodExampleObj & string] for types like union

    //optional union, optional enum, optional object, optional array, optional lazy, optional tuple
    //record+lazy, record+union, record+array
    //object+lazy(object), object+lazy(string), object+union([lazy(object), object, string]), object+array, object+tuple
    //array+object, array+tuple, array+lazy(string), array+union([lazy(object), string])
    //tuple+([lazy(object), union([lazy(string), string]) ])

    //  attention! here is union of union, don't misunderstand!
    //union([lazy(object),  union([lazy(string), object]) ])
    //lazy+(lazy(object)), lazy+lazy(union([lazy(object), string]))
});
