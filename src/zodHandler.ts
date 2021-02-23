import { IZodObj, TInputType } from './types';

//obj - zodSchema of param/body/query
export function handleZodDescr(zodDescr: IZodObj, type: TInputType){
    const bodyObj: any = {
        "requestBody": {
            "required": true,
            "content": {
                "application/json": {
                    "schema": {
                        "properties": {
                        },
                        "required": [
                        ],
                        "type": "object"
                    }
                }
            }
        }
    };
    const parameters: Object[] = [];
    for (let propName in zodDescr.shape){
        const prop = zodDescr.shape[propName];
        //console.log(propName, prop);
        //console.log(propName, prop._def.t);
        //swaggerTemplate.paths['/api/zod/' + mw.route.path];
        //swagObj[propName] = prop._type;
        // switch(prop._type){
        //     case z.ZodTypes.string: swagObj[propName]
        // }
        if (type === 'body'){
            //console.log(propName, prop._def.t, prop);
            if (prop._def.t === 'union'){//TODO handle all union types using one of
                const union = (prop._def as any);
                //if (union.options.find(x => x._def.t === 'undefined'))
                //    console.log('undef!');
                //console.log(union.options.map(u => u._def.t));
            }
            bodyObj.requestBody.content['application/json'].schema.properties[propName] = {
                type: prop._def.t
            }
        } else {
            parameters.push({
                in: type === 'params' ? 'path' : 'query',
                name: propName,
                required: true,//TODO
                schema: { "type": prop._def.t /*"$ref": "#/definitions/zsqwe4"*/ }
            });
        }
    }

    if (type === 'body'){
        //bodyObj.requestBody.content['application/json'].schema.required = ['qwe'];//TODO how to get required?
        return bodyObj;
    } else {
        return { parameters };
    }
}