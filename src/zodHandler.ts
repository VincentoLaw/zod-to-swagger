import * as z from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import swaggerTemplate from './swagger_template';
import fs from 'fs';
import _ from 'lodash';

/*
In swagger I should generate routes with full path to route on backend, without any regex.
So there are 2 problems: (1) regexp in route path and (2) full path retrieve.
1) In express and other frameworks it's possible to define route as regexp, so
a) GOOD: I need to force developer to pass some string example of regexp path
b) BAD: I can use randexp, but it will look strange in swagger
2) If there is no nesting in routes definition, developer just should pass fullPath prop with method.
How to get full path to route in nested routed definition case?
Anyway I need to wrap subroutes by pathWithDocs function, to restore path tree of nested routes.
So I need to use runtime module upload, to force pathWithDocs func load all funcs of subroutes,
to retrieve all pathWithDocs calls in call stack of withDocs.
a) GOOD: restore path tree using error stack and generated function names
b) BAD: use deprecated arguments.caller... (old, works strange, couldn't setup correctly, works same as (a))
c) BAD: no need to wrap. Traverse all express routes. But again in routes there can be regexp. And that solution will
    work only for express than.
d) MAY BE OK: leaves of path has access to full path, and export it to upper modules. upper modules get it from leaves.
    So we have full path at leaves and no need to wrap modules.

So anyway as developer you:
1) set fullPath in withDocs
or
2) you need to use dynamic import modules and wrap each route
*/

export class InnerDocumentationError extends Error {
    zodSchemas: {}
    constructor(obj: { params?: IZodObject, body?: IZodObject, query?: IZodObject }) {
      super('InnerDocumentationError');
      this.name = 'InnerDocumentationError';
      this.zodSchemas = obj;
    }
}

//ZodRawShape === {[key: string]: z.ZodTypeAny}, z.ZodTypeAny is more abstract than z.ZodType<z.ZodTypes>
type IZodObj = z.ZodObject<{[key: string]: z.ZodType<z.ZodTypes>}>;
//z.ZodLazy<...>
type IZodObject = IZodObj|z.ZodSchema<Object>;//z.ZodType<Object, z.ZodTypeDef>
//interface IZodObject extends z.ZodObject<{[key: string]: any}>{}//z.ZodTypes.object{}//z.ZodTypeAny{};//
//ZodDef - all types
/*
type IZodObject = {
    [k: string]: ZodTypeAny;
};
*/



/*
1) if union with undefined => property is optional (not required)

2) union for cases schema1 or schema2 (example in project z.union)
how to do it in swagger: https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/

union on root lvl can contain only objects, on other lvls can contain any types
if union on root level for params/query => throw Error('unsupported root level union');

TODO: 

3) swagger doc should correctly show these types:
string -ok
number -ok
bigint -ok
boolean -ok
date -ok

undefined -ok
null -ok
void -ok

union:(null/undefined/void + smth)

enum -ok
object - ok
array - ok

any -ok
unknown -ok

tuple -ok
record -ok

nonstrict check (unknown keys)

4) handle lazy type (use $ref type definition)
5) arr and object optional doesnt work
*/
type TInputType = 'params'|'body'|'query';
//obj - zodSchema of param/body/query
//1) тип для сваггера можно описать двумя способами:
//a) описать тип напрямую без ссылок
//b) сослаться на тип с помощью ref, предварительно описав его в components/schemas
//По большому счёту описывать тип в components/schemas лучше только для union и для lazy. Возможно ещё для array и некоторых других типов.

const generatedTypes: { zodTypeRef: any, generatedName: string}[] = [];
let typesNameValue = 10;

export function handleZodDescr(zodDescr: IZodObj | any, type: TInputType){
    let bodyObj: any = {
        "requestBody": {
            "required": true,
            "content": {
                "application/json": {
                    "schema": {
                        "properties": {
                        },
                        "required": [
                        ],
                        "type": "object",
                    }
                }
            }
        }
    };
    /*
    пример описания типа в components/schemas
    swaggerTemplate.components.schemas["yourNewTypeName"] = {
        type: "object", //он не обятельно object
        "properties": {
            //take properties from zodDescr.shape
        }
    };
    */
    const parameters: Object[] = [];
    if(zodDescr._def.t === 'object') {
        const deferredLazy: any[] = [];
        for (let propName in zodDescr.shape){
            const prop: any = zodDescr.shape[propName];
            if (type === 'body'){
                let requiredArr = bodyObj.requestBody.content['application/json'].schema.required;
                isPropRequired(prop, propName, requiredArr);
                bodyObj.requestBody.content['application/json'].schema.properties = {
                    ...bodyObj.requestBody.content['application/json'].schema.properties,
                    ...handleZodType(prop, propName)
                }
            } else {
                let parametersObj = {
                    in: type === 'params' ? 'path' : 'query',
                    name: propName,
                    required: true,
                    schema: {}
                };
                let propertyObj = handleZodType(prop, propName);
                parametersObj.schema = {...parametersObj.schema, ...propertyObj[propName]};
                parametersObj.required = isPropRequired(prop, propName, undefined);
                parameters.push(parametersObj);
            }
        }
    }

    else if(zodDescr._def.t === 'union') {
        bodyObj.requestBody.content['application/json'].schema["anyOf"] = [];
        const unionOptionsArr: any = zodDescr._def;
        for(let unionObj of unionOptionsArr.options) {
            for (let propName in unionObj.shape){
                const prop: any = unionObj.shape[propName];
                if(type === 'body'){
                    let requiredArr = bodyObj.requestBody.content['application/json'].schema.required;
                    bodyObj.requestBody.content['application/json'].schema["anyOf"].push({
                        "type": "object",
                        "properties": handleZodType(prop, propName),
                        "required": isPropRequired(prop, propName, requiredArr),
                    });
                }
                else {
                    throw Error('unsupported root level union');
                }
            }
        }
    }

    else if(zodDescr._def.t === 'lazy'){
        if (type === 'body'){
            //let lazyObj = zodDescr._def.getter();
            //bodyObj.requestBody.content['application/json'].schema = {"$ref": "#/components/schemas/type2"}
            bodyObj.requestBody.content['application/json'].schema = {
                ...bodyObj.requestBody.content['application/json'].schema,
                ...handleLazyType(zodDescr)
            }
            //console.log(bodyObj.requestBody.content['application/json'].schema);
        }
    }

    if (type === 'body'){
        return bodyObj;
    } else {
        return { parameters };
    }
}

function handleLazyType(lazyObj) {
    let swaggerObject:any = {
        type: "object",
        required: [],
        properties: {}
    };
    for (let gt of generatedTypes){
        if (lazyObj === gt.zodTypeRef){
            return { '$ref': '#/components/schemas/' + gt.generatedName };
        }
    }
    const generatedTypeName = `type${typesNameValue}`;
    typesNameValue++;
    generatedTypes.push({zodTypeRef: lazyObj, generatedName: generatedTypeName });
    lazyObj = lazyObj._def.getter();
    for(let propName in lazyObj.shape){
        const prop: any = lazyObj.shape[propName];
        swaggerObject.properties = {
            ...swaggerObject.properties,
            ...handleZodType(prop, propName)
        };
        swaggerObject.required = isPropRequired(prop, propName, swaggerObject.required);
    }
    //console.log(swaggerObject);
    swaggerTemplate.components.schemas[generatedTypeName] = swaggerObject;
    //console.log(swaggerTemplate.components.schemas);
    return { '$ref': '#/components/schemas/' + generatedTypeName };
}

function handleZodType(prop, propName) {
    let resultingObj: any = {};
    if (prop._def.t === 'union'){
        resultingObj = {
            ...resultingObj,
            ...ifPropTypeUnion(prop, resultingObj, propName)
        }
    }
    else if(prop._def.t === 'lazy'){
        resultingObj[propName] = handleLazyType(prop);
    }
    else if (prop._def.t === 'object'){
        resultingObj[propName] = {
            type: prop._def.t,
            properties: {},
            required: []
        };
        const zodObj = prop._def.shape();
        for(let zodObjName in zodObj){
            resultingObj[propName].properties = {
                ...resultingObj[propName].properties,
                ...handleZodType(zodObj[zodObjName], zodObjName)
            }
            resultingObj[propName].required = isPropRequired(zodObj[zodObjName], zodObjName, resultingObj[propName].required);
        }
    }
    else if(prop._def.t === 'array') {
        resultingObj[propName] = {
            ...resultingObj[propName],
            ...ifPropTypeArray(prop)
        }
    }
    else if(prop._def.t === 'enum' && prop._def.values) {
        resultingObj[propName] = {
            type: prop._def.t,
            enum: prop._def.values,
        }
    }
    else if(prop._def.t === 'bigint') {
        resultingObj[propName] = {
            type: 'number'
        }
    }
    else if(prop._def.t === 'date') {
        resultingObj[propName] = {
            type: 'string'
        }
    }
    else {
        resultingObj[propName] = {
            type: prop._def.t,
        };
    }
    //console.log(resultingObj);
    return resultingObj;
}

//TODO split into 2 functions, isPropRequired and updateRequiredArr
function isPropRequired(prop, propName, requiredArrOrBool) {
    if(prop._def.t !== 'union'){
        if(requiredArrOrBool) {
            requiredArrOrBool.push(propName);
        }
        else requiredArrOrBool = true;
    }
    else if(prop._def.t === 'union'){
        if (prop._def.options.every(x => x._def.t !== 'undefined')) { // if union type and not optional (2 types schemas)
            if(requiredArrOrBool) {
                requiredArrOrBool.push(propName);
            }
            else requiredArrOrBool = true;
        }
        else { // if optional (union)
            if(!requiredArrOrBool) {
                requiredArrOrBool = false; 
            }
        }
    }
    return requiredArrOrBool;
}

function ifPropTypeArray(prop) {
    let resultingObj = {};
    resultingObj["type"] = prop._def.t;
    if(prop._def.type._def.t === 'array'){
        resultingObj["items"] = {
            ...resultingObj["items"],
            ...ifPropTypeArray(prop._def.type)
        }
    }
    else if(prop._def.type._def.t === 'object'){
        resultingObj["items"] = {
            type: prop._def.type._def.t,
            properties: {},
            required: []
        }
        const zodeObj = prop._def.type._def.shape();
        for(let zodeObjName in zodeObj){
            resultingObj["items"].properties = {
                ...resultingObj["items"].properties,
                ...handleZodType(zodeObj[zodeObjName], zodeObjName)
            }
            resultingObj["items"].required = isPropRequired(zodeObj[zodeObjName], zodeObjName, resultingObj["items"].required);
        }
    }
    else {
        resultingObj["items"] = {
            type: prop._def.type._def.t
        }
        if(prop._def.type._def.t === 'enum' && prop._def.type._def.values) {
            resultingObj["items"]["enum"] = prop._def.type._def.values;
        }
    }
    return resultingObj;
}

function ifPropTypeUnion (zodeTypeObj: any, resultingObj: any, propName: string) {
    if (zodeTypeObj._def.options.find(x => x._def.t === 'undefined')) {
        for(let prop of zodeTypeObj._def.options) {
            if(prop._def.t !== 'undefined'){
                resultingObj = handleZodType(prop, propName);
            }
        }
    }
    else if(zodeTypeObj._def.options.find(x => x._def.t === 'null')) {
        for(let prop of zodeTypeObj._def.options) {
            if(prop._def.t !== 'null'){
                resultingObj = handleZodType(prop, propName);
            }
        }
    }
    else {
        resultingObj[propName] = {
            "type": "object",
            "anyOf": []
        };
        for(let prop of zodeTypeObj._def.options) {
            if (prop._def.t === 'object') {
                const zodObj = prop._def.shape();
                let properties = {};
                let requiredArr = [];
                for(let zodObjName in zodObj){
                    properties = {
                        ...properties,
                        ...handleZodType(zodObj[zodObjName], zodObjName)
                    }
                    requiredArr = (isPropRequired(zodObj[zodObjName], zodObjName, requiredArr));
                }
                resultingObj[propName]["anyOf"].push({
                    type: prop._def.t,
                    required: requiredArr,
                    properties
                })
            } 
            else {
                if(prop._def.t === 'enum' && prop._def.values){
                    resultingObj[propName]["anyOf"].push({
                        type: prop._def.t,
                        enum: prop._def.values,
                    })
                }
                else {
                    resultingObj[propName]["anyOf"].push({
                        type: prop._def.t,
                    });
                }
            }
        }
    }
    return resultingObj;
}