# zod-to-swagger
___
## About:
Converts your API definition in code to swagger/openapi3 file. Api input data should be described using zod library https://github.com/colinhacks/zod. The core idea is that documentation description is often defined in code, so you should have the single source of truth to maintain documentation in actual state.
Swagger supports restricted subset of zod types, so for unsupported cases we add some description and AnyValue type for corresponding swagger field.
This library is agnostic to backend framework, but requires request handler to be wrapped by ```withDocs``` function.
## Installation:
```
npm install zod-to-swagger
```
## Example:
```
import { withDocs, zodToSwaggerInit } from 'zod-to-swagger';

const [method, path, requestHandler] = withDocs(
    {
        method: 'post', path: '/some_path/endpoint/{param}',
        params: z.object({ param: z.string() }),
        query: z.object({ query_param: z.string() }),
        body: z.object({ body_prop: z.number() }),
    },
    //request handler
    () => {}
);
//zodToSwaggerInit should be called after all withDocs calls
await zodToSwaggerInit({ outFile: 'swagger_file.json' });
//now you can use library(for example swagger-ui-express), to visualize swagger_file.json
```