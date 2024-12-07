import * as context from '../../context/context';
import Express from 'express';

export declare type DecodeRequestFunc<T> = (ctx: context.Context, req: Express.Request) => T

export declare type EncodeResponseFunc<T> = (ctx: context.Context, res: Express.Response, data: T) => void
