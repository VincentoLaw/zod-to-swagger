import * as z from 'zod';

export type TInputType = 'params'|'body'|'query';
//ZodRawShape === {[key: string]: z.ZodTypeAny}, z.ZodTypeAny is more abstract than z.ZodType<z.ZodTypes>
export type IZodObj = z.ZodObject<{[key: string]: z.ZodType<z.ZodTypes>}>;
//z.ZodLazy<...>
export type IZodObject = IZodObj|z.ZodSchema<Object>;//z.ZodType<Object, z.ZodTypeDef>
//interface IZodObject extends z.ZodObject<{[key: string]: any}>{}//z.ZodTypes.object{}//z.ZodTypeAny{};//
//ZodDef - all types
/*
type IZodObject = {
    [k: string]: ZodTypeAny;
};
*/