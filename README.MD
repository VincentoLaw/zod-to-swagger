# zod-to-swagger
___
# About:
Converts your API definition in code to swagger/openapi3 file. Api input data should be described using zod library https://github.com/colinhacks/zod. The core idea is that API methods, paths, incomming data types, returnTypes and examples are often described in code. So if you want to have single source of truth and maintain documentation in actual state after each API change, without documentation file update, you can use this library.


Swagger supports restricted subset of zod types, so for unsupported cases we add some description and AnyValue type for corresponding swagger field.

This library is agnostic to backend framework, but requires request handler to be wrapped by ```withDocs``` function.
# Installation:
```sh
npm install zod-to-swagger
```
or
```sh
yarn add zod-to-swagger
```

# Examples:
### basic example
```ts
import { withDocs, zodToSwaggerInit } from 'zod-to-swagger';

const [method, path, requestHandler] = withDocs(
    {
        method: 'post',
        path: '/some_path/endpoint/{param}',
        params: z.object({ param: z.string() }),
        query: z.object({ query_param: z.string() }),
        body: z.object({ body_prop: z.number() }),
    },
    //request handler
    (requestData, req, res) => {
        //types defined for params, query, body are available for typescript(same as in zod)
        const { params, query, body } = requestData;
        //params.param has type string in typescript
        //query.query_param has type string in typescript
        //body.body_prop has type number in typescript
    }
);

//in express you can register handler using code this line of code
//router[method](path, handler);

//zodToSwaggerInit should be called after all withDocs calls
await zodToSwaggerInit({ outFile: 'swagger_file.json' });
//now you can use library(for example swagger-ui-express), to visualize swagger_file.json
```
This code generates swagger_file.json, that can be visualized like this:
![Example 1 image](/examples/e1.jpg)

### Express example
If you don't use nested routes, you can just use basic example.
But you may want to create nested subroutes in different files in Express. In our API you will need to use dynamic import: ```pathWithDocs('/subroute', () => require('./subroute').default)```. Motivation is described in ```Restrictions```.

#### **`subroute.ts`**
```ts
const [method, path, handler] = withDocs(
    { method: 'get', path: '/endpoint', query: z.object({name: z.string()}) },
    (reqData, req, res) => {
        //reqData.query.name has type string in typescript
    }
);

const router = express.Router();
//register method in express router
router[method](path, handler);
//you can use router.get('/endpoint', handler) instead, but such approach will duplicate method and path definition
```

#### **`index.ts`**
```ts
import { pathWithDocs, zodToSwaggerInit } from 'zod-to-swagger';
import express from 'express';
const app = express();

//!Important. It's important to load `subroute` module like this. Details in `Restrictions` section.
app.use(...pathWithDocs('/subroute', () => require('./subroute').default));

//zodToSwaggerInit should be called after all withDocs and pathWithDocs calls
zodToSwaggerInit({ outFile: 'swagger_file.json' }).then(sd => {
    //now you can use library(for example swagger-ui-express), to visualize swagger_file.json
    /*
    const swaggerDocument = require('./swagger_file.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
    */
});
```

# Restrictions:
- ```zodToSwaggerInit``` should be called after all withDocs and pathWithDocs calls.
- ```zodToSwaggerInit``` is async, you can access to generated file only after this func call completed.
- You can use only ```zod.object``` or ```zod.lazy(() => zod.object())``` for ```params/query/body``` definition. You cannot use ```zod.lazy``` for root level definition of ```params/query```.
- ```pathWithDocs(path, module)```, here module always should be defined in format ```() => require('./path_to_module').default)``` right in ```pathWithDocs``` call. It's because we use call stack to restore nested structure of routes definitions. We cannot provide another API for nested routes definition, so you should use this syntax, or use ```withDocs({path: 'full/path/to/endpoint'})``` and set path option to full path to endpoint.
- Now we support only zod1. But we will support other versions.

# Motivation:
The core idea is that API methods, paths, incomming data types, returnTypes and examples are often described in code. So if you want to have single source of truth and maintain documentation in actual state after each API change, without documentation file update, you can use this library.

We choose zod, because it's a best library to define and validate types for typescript projects. We keeping the advantage of zod, we transfering all typescript types from API definition to request handlers.

# TODO
- [X] Support all zod types
- [X] Support nested routes definition
- [X] Make typescript types defined in zod schemas available in requestData.
- [X] Write tests for complex zod types combinations
- [ ] Detach ```requestData``` from handler definition, to make it easier to use ```withDocs``` in any backend framework
- [ ] Extend API for more flexible usage.
    - [ ] ```zodToSwaggerInit``` should return generated file.
    - [ ] Add additional swagger fields definition, like example, returnType, etc.
    - [ ] Add option to disable autoparsing.
    - [ ] Add check for params existance in url.
    - [ ] Pass validate function to request handler, wrapped by withDocs, to call validate by hands in specific place of request handler.
    - [ ] Improve API to make it easier to use middlewares before/after endpoint
    - [ ] Make decision, do we need autoconverters for data types like zod.Date.
- [ ] Add API for models definition
- [ ] Add tests for express, hapi, nextjs and other frameworks
- [ ] Implement/check/test zod2 and zod3 support
- [ ] Describe how zod-to-swagger converts types from zod that are not supported by swagger
- [ ] Add authentification support