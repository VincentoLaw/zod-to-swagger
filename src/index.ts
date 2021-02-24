import * as z from 'zod';
//TODO remove express, no need to depend on one framework
import { Request, Response, NextFunction, RequestHandler } from 'express';
import swaggerTemplateOrig from './swagger_template';
let swaggerTemplate = JSON.parse(JSON.stringify(swaggerTemplateOrig));//deepCopy
import fs from 'fs';
import _ from 'lodash';//TODO remove lodash, it's used just for merge

import { IZodObject, TInputType } from './types';
import { handleZodDescr } from './zodHandler';


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



/*
1) if union with undefined => property is optional (not required)

2) union for cases schema1 or schema2 (example in project z.union)
how to do it in swagger: https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/

3) swagger doc should correctly show these types:
string
number
bigint
boolean
date

undefined
null
void

union:(null/undefined/void + smth)

enum
object
array

any
unknown

tuple
record

nonstrict check (unknown keys)

4) handle lazy type (use $ref type definition)
*/

class InnerDocumentationError extends Error {
    zodSchemas: {}
    constructor(obj: { params?: IZodObject, body?: IZodObject, query?: IZodObject }) {
      super('InnerDocumentationError');
      this.name = 'InnerDocumentationError';
      this.zodSchemas = obj;
    }
}


//couldn't write it fast using conditional types =(
/*
function withTypesAndDocs<ZOP extends IZodObject, ZOB extends IZodObject, ZOQ extends IZodObject>
    (req: Request, { params, body, query } : { params: ZOP, body: ZOB, query: ZOQ })
    : { params: z.infer<typeof params>, body: z.infer<typeof body>, query: z.infer<typeof query> };
function withTypesAndDocs<ZOP extends IZodObject, ZOB extends IZodObject>
    (req: Request, { params, body } : { params: ZOP, body: ZOB })
    : { params: z.infer<typeof params>, body: z.infer<typeof body> };
function withTypesAndDocs<ZOP extends IZodObject, ZOQ extends IZodObject>
    (req: Request, { params, query } : { params: ZOP, query: ZOQ })
    : { params: z.infer<typeof params>, query: z.infer<typeof query> };
function withTypesAndDocs<ZOB extends IZodObject, ZOQ extends IZodObject>
    (req: Request, { body, query } : { body: ZOB, query: ZOQ })
    : { body: z.infer<typeof body>, query: z.infer<typeof query> };
function withTypesAndDocs<ZO extends IZodObject>(req: Request, { params } : { params: ZO })
    : { params: z.infer<typeof params> };
function withTypesAndDocs<ZO extends IZodObject>(req: Request, { body } : { body: ZO })
    : { body: z.infer<typeof body> };
function withTypesAndDocs<ZO extends IZodObject>(req: Request, { query } : { query: ZO })
    : { query: z.infer<typeof query> };
function withTypesAndDocs<ZO extends IZodObject>(req: Request, { } : { })
    : { };
//fulfills several objectives:
//1. shortcut for zod request data validation
//2. makes request data strictly typed
//3. generates api docs based on zod data description

function withTypesAndDocs<ZOP extends IZodObject, ZOB extends IZodObject, ZOQ extends IZodObject>
(req: Request, { params, body, query }: { params?: ZOP, body?: ZOB, query?: ZOQ })
{
    if (process.env.NODE_ENV === "documentation"){
        if (body){
            type zodDocBody = z.infer<typeof body>;
        }
        if (query){
            type zodDocQuery = z.infer<typeof query>;
        }
        if (params){
            //https://github.com/colinhacks/zod/blob/master/src/parser.ts
            type zodDocParams = z.infer<typeof params>;
            // const json = params.toJSON();
            // if (params._type === z.ZodTypes.object){
            //     const p = params as IZodObj;
            //     const sh = p.shape;
            //     const swagObj: Object = {};
            //     for (let propName in p.shape){
            //         const prop = p.shape[propName];
            //         swagObj[propName] = prop._type;
            //         // switch(prop._type){
            //         //     case z.ZodTypes.string: swagObj[propName]
            //         // }
            //     }
            //     //isOptional
            //     //isNullable
            //     const pr = p.primitives();
            //     const npr = p.nonprimitives();
            // } else {//lazy
            //     //defined always zoddef? if not lazy and not object => throw error
            //     const p = (params as any) as z.ZodDef;
            //     if (p.t === z.ZodTypes.lazy){
            //         const lazySchema = p.getter();
            //     }
            //     //const lazySchema = (params as z.ZodSchema<Object>).getter();
            // }
        }

        throw new InnerDocumentationError({ params, body, query});
    }

    return {
        params: params? params.parse(req.params) : undefined,
        body: body ? body.parse(req.body) : undefined,
        query: query ? query.parse(req.query) : undefined,
    }
}
*/

type TMethod = 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
type TOptionalZodObj<T> = T extends IZodObject ? z.infer<T> : undefined;
type TZodDescr = IZodObject|undefined;
type TReqData<TB extends TZodDescr=undefined, TP extends TZodDescr = undefined, TQ extends TZodDescr = undefined>
    = {
        body?: TB, params?: TP, query?: TQ,
        description?: string,
        path: string|{regex: RegExp, stringExample: string},
        pathExample?: string,
        method: TMethod,
    };
/*
type TReqDataInfer<TB extends TZodDescr=undefined, TP extends TZodDescr = undefined, TQ extends TZodDescr = undefined>
    = { body?: TOptionalZodObj<TB>, params?: TOptionalZodObj<TP>, query?: TOptionalZodObj<TQ> };
*/
//cannot write it simplier =(
type TReqDataInfer<TB extends TZodDescr=undefined, TP extends TZodDescr = undefined, TQ extends TZodDescr = undefined>
    = TB extends IZodObject ?
        TP extends IZodObject ?
            TQ extends IZodObject ?
                { body: z.infer<TB>, params: z.infer<TP>, query: z.infer<TQ> }
                : { body: z.infer<TB>, params: z.infer<TP> }
        : TQ extends IZodObject ?
            { body: z.infer<TB>, query: z.infer<TQ> }
            : { body: z.infer<TB> }
    : TP extends IZodObject ?
        TQ extends IZodObject ?
            { params: z.infer<TP>, query: z.infer<TQ> }
            : { params: z.infer<TP> }
        : TQ extends IZodObject ?
            { query: z.infer<TQ> }
            : {};

let currentRoutes: any = undefined;
let swagRes = {

};

Error.stackTraceLimit = 10000;//TODO
const zodToSwaggerGeneratedFuncName = 'zodToSwaggerGeneratedFunc';
let generatedFuncId = 0;
const funcPathById = {};
let completedWrappersCnt = 0;

export function pathWithDocs(path: string|{regex: RegExp, stringExample: string}, importedModule: any/*...etc: T[]*/)
: [string|RegExp, any]
{
    const pathStr: string = typeof path === 'string' ? path : path.stringExample;

    let res: any;

    function namedWrapper(){
        /*for (let i of etc){
            const r = (i as any)();
            res.push(r);//todo may be bad call, this lost?
        }*/
        res = (importedModule());
    }

    Object.defineProperty(namedWrapper, 'name', { value: zodToSwaggerGeneratedFuncName + (generatedFuncId) + '' });
    funcPathById[generatedFuncId] = pathStr;
    generatedFuncId++;
    completedWrappersCnt++;
    namedWrapper();
    completedWrappersCnt--;
    //console.log(swagRes);
    if (completedWrappersCnt === 0){
        //TODO
        //there can be a problem if withDocs called in async env, or if error were thrown
        //if unhandled error thrown, it's ok that we don't generate docs

        //console.log(swaggerTemplate.paths['/api/test1/test2/test3/testPath']);
    }

    const origPath = typeof path === 'string' ? path : path.regex;
    return [origPath, res];
}

async function init({outFile}: InitOptions){
    (swaggerTemplate as any).paths = {
        ...swaggerTemplate.paths,
        ...swagRes,
    };
    //TODO it's saved to root of project, need to dist
    return fs.promises.writeFile(outFile, JSON.stringify(swaggerTemplate));
}

type InitOptions = { outFile: string };
export async function zodToSwaggerInit(initOptions: InitOptions){
    return init(initOptions).finally(() => {
        //swagRes = {};
        //swaggerTemplate = JSON.parse(JSON.stringify(swaggerTemplateOrig));
    });
}

//replace syntax: "/:param" => "/{param}"
function convertParamSyntax(curPath: string){
    if (curPath.length === 0)
        return curPath;

    let needCloseBrace = false;
    let res = curPath[0];
    for (let i = 1; i < curPath.length; i++){
        //todo need better condition? like when numbers or letters end?
        if (needCloseBrace && (curPath[i] === '/' || curPath === '?')){
            res += '}' + curPath[i];
            needCloseBrace = false;
            continue;
        }
        if (curPath[i - 1] === '/' && curPath[i] === ':'){
            res += '{';
            needCloseBrace = true;
        } else {
            res += curPath[i];
        }
    }
    if (needCloseBrace)
        res += '}';
    return res;
}

//https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file



export type TReqHandlerWithPath = [TMethod, string|RegExp, RequestHandler];
export function withDocs<TBody extends TZodDescr=undefined, TParams extends TZodDescr=undefined, TQuery extends TZodDescr=undefined>
(
    reqData: TReqData<TBody, TParams, TQuery>,
    handler: (reqData: TReqDataInfer<TBody, TParams, TQuery>, req: Request, res: Response, next: NextFunction) => void
): TReqHandlerWithPath {
    const path = typeof reqData.path === 'string' ? reqData.path : reqData.path.stringExample;
    if (true){//generate documentation or not

        var err = new Error();
        const errRows = err.stack?.split('\n') || [];
        let fullPath = path;
        for (let row of errRows){
            const words = row.split(' ');
            for (let w of words){
                const fInd = w.indexOf(zodToSwaggerGeneratedFuncName);
                if (fInd >= 0){
                    const n = new Number(w.substr(fInd + zodToSwaggerGeneratedFuncName.length));
                    fullPath = funcPathById[n.toString()] + fullPath;
                    break;
                }
            }
        }

        fullPath = convertParamSyntax(fullPath);

        if (!swagRes[fullPath])
            swagRes[fullPath] = {};

        const inputs: { inputType: TInputType, zodDescr: any }[] = [
            { inputType: 'params', zodDescr: reqData.params },
            { inputType: 'body', zodDescr: reqData.body },
            { inputType: 'query', zodDescr: reqData.query }
        ];

        inputs.forEach(({inputType, zodDescr}) => {
            if (zodDescr){
                // if (zodDescr._def.t === z.ZodTypes.lazy){//TODO all levels, not only 1
                //     zodDescr = zodDescr._def.getter();
                // }
                swagRes = _.mergeWith(swagRes, {
                    [fullPath]:{
                        [reqData.method]: handleZodDescr(zodDescr, inputType)
                    }
                //concat arrays instead of merge
                }, (objValue, srcValue) => (_.isArray(objValue) ? objValue.concat(srcValue): undefined))
            }
        });

        /*return [
            reqData.method,
            path,
            function(req: Request, res: Response, next: NextFunction){
                //or here?
                throw new InnerDocumentationError(reqData);
            }
        ];*/
    }

    return [
        reqData.method,
        path,
        function(req: Request, res: Response, next: NextFunction){
            const parsed: { body?: Object, query?: Object, params?: Object} = {};

            if (reqData.body)
                parsed.body = reqData.body.parse(req.body);
            if (reqData.query)
                parsed.query = reqData.query.parse(req.query);
            if (reqData.params)
                parsed.params = reqData.params.parse(req.params);

            return handler(parsed as TReqDataInfer<TBody, TParams, TQuery>, req, res, next);
        }
    ]
}