import Express from 'express';
import winston from 'winston';
import * as http from 'http';
import * as endpoint from '../../endpoint/endpoint';
import * as context from '../../context/context';
import type { DecodeRequestFunc, EncodeResponseFunc } from './encode_decode';
import type { ServerResponseFunc, RequestFunc } from './request_response_funcs';
import * as server from './request_response_funcs';
import * as transport from '../error_handler';

interface serverOption {
    before: RequestFunc[];
    after: ServerResponseFunc[];
    errorEncoder: ErrorEncoder;
    errorHandler: transport.ErrorHandler;
    finalizer: ServerFinalizerFunc[];
}

// export interface Server {
//     ServeHTTP(req: Express.Request, res: Express.Response): Promise<void>;
// }

export function createServer<I,O>(
    e: endpoint.Endpoint<I,O>,
    dec: DecodeRequestFunc<I>,
    enc: EncodeResponseFunc<O>,
    ...options: ServerOption[]
) {
    const s: serverOption = {
        before: [],
        after: [],
        errorEncoder: DefaultErrorEncoder,
        errorHandler: new transport.LogErrorHandler(winston.createLogger()),
        finalizer: [],
    }

    options.forEach(f =>{
        f(s);
    })

    return async (req: Express.Request, res: Express.Response): Promise<void> => {
        let ctx = context.Background();
        const deferredFunc: (() => void)[] = [];

        if (s.finalizer.length > 0) {
            const iw: interceptingWriter = res;
            res = iw;
            deferredFunc.push(() => {
                ctx = context.WithValue(ctx, server.ContextKeyResponseHeaders, iw.getHeaders());
                ctx = context.WithValue(ctx, server.ContextKeyResponseSize, iw.written);

                s.finalizer.forEach(val => {
                    val(ctx, <number>iw.code, req)
                })
            })
        }

        s.before.forEach(val => {
            val(ctx, req)
        })

        try {
            const request = dec(ctx, req)
            const response = await e(ctx, request);

            s.after.forEach(f => {
                ctx = f(ctx, res);
            });

            enc(ctx, res, response);
        } catch (error) {
            s.errorHandler.Handle(ctx, error);
            s.errorEncoder(ctx, error, res);
        } finally {
            while (deferredFunc.length > 0) {
                const f = deferredFunc.pop();
                if (f) {
                    f();
                }
            }
        }
    }
}

// export class Server<I,O> {
//     private e: endpoint.Endpoint<I,O>;
//     private dec: DecodeRequestFunc<I>;
//     private enc: EncodeResponseFunc<O>;
//     private s: serverOption = {
//         before: [],
//         after: [],
//         errorEncoder: DefaultErrorEncoder,
//         errorHandler: new transport.LogErrorHandler(winston.createLogger()),
//         finalizer: [],
//     }
//
//     // before: RequestFunc[] = [];
//     // after: ServerResponseFunc[] = [];
//     // errorEncoder: ErrorEncoder = DefaultErrorEncoder;
//     // errorHandler: transport.ErrorHandler = new transport.LogErrorHandler(winston.createLogger())
//     // finalizer: ServerFinalizerFunc[] = [];
//
//     constructor(
//         e: endpoint.Endpoint<I,O>,
//         dec: DecodeRequestFunc<I>,
//         enc: EncodeResponseFunc<O>,
//         ...options: ServerOption[]
//     ) {
//         this.e = e;
//         this.dec = dec;
//         this.enc = enc;
//
//         options.forEach(f =>{
//             f(this.s);
//         })
//     }
//
//     async ServeHTTP(req: Express.Request, res: Express.Response): Promise<void> {
//         let ctx = context.Background();
//         const deferredFunc: (() => void)[] = [];
//
//         if (this.s.finalizer.length > 0) {
//             const iw: interceptingWriter = res;
//             res = iw;
//             deferredFunc.push(() => {
//                 ctx = context.WithValue(ctx, server.ContextKeyResponseHeaders, iw.getHeaders());
//                 ctx = context.WithValue(ctx, server.ContextKeyResponseSize, iw.written);
//
//                 this.s.finalizer.forEach(val => {
//                     val(ctx, <number>iw.code, req)
//                 })
//             })
//         }
//
//         this.s.before.forEach(val => {
//             val(ctx, req)
//         })
//
//         try {
//             const request = this.dec(ctx, req)
//             const response = await this.e(ctx, request);
//
//             this.s.after.forEach(f => {
//                 ctx = f(ctx, res);
//             });
//
//             this.enc(ctx, res, response);
//         } catch (error) {
//             this.s.errorHandler.Handle(ctx, error);
//             this.s.errorEncoder(ctx, error, res);
//         } finally {
//             while (deferredFunc.length > 0) {
//                 const f = deferredFunc.pop();
//                 if (f) {
//                     f();
//                 }
//             }
//         }
//     }
//
// }

// EncodeJSONResponse is a EncodeResponseFunc that serializes the response as a
// JSON object to the ResponseWriter. Many JSON-over-HTTP services can use it as
// a sensible default. If the response implements Headerer, the provided headers
// will be applied to the response. If the response implements StatusCoder, the
// provided StatusCode will be used instead of 200.
export function EncodeJSONResponse(ctx: context.Context, w: Express.Response, response: any): void {
    w.setHeader("Content-Type", "application/json").status(200).json(response);
}

// ErrorEncoder is responsible for encoding an error to the ResponseWriter.
// Users are encouraged to use custom ErrorEncoders to encode HTTP errors to
// their clients, and will likely want to pass and check for their own error
// types.
export type ErrorEncoder = (ctx: context.Context, err: any, res: Express.Response) => void

// ServerFinalizerFunc can be used to perform work at the end of an HTTP
// request, after the response has been written to the client. The principal
// intended use is for request logging. In addition to the response code
// provided in the function signature, additional response parameters are
// provided in the context under keys with the ContextKeyResponse prefix.
export type ServerFinalizerFunc = (ctx: context.Context, code: number, req: Express.Request) => void

export type ServerOption = (s: serverOption) => void

// ServerBefore functions are executed on the HTTP request object before the
// request is decoded.
export function ServerBefore(...before: RequestFunc[]): ServerOption {
    return function(s: serverOption) { s.before.push(...before) }
}

// ServerAfter functions are executed on the HTTP response writer after the
// endpoint is invoked, but before anything is written to the client.
export function ServerAfter(...after: ServerResponseFunc[]): ServerOption {
    return function(s: serverOption) { s.after.push(...after) }
}

// ServerErrorEncoder is used to encode errors to the http.ResponseWriter
// whenever they're encountered in the processing of a request. Clients can
// use this to provide custom error formatting and response codes. By default,
// errors will be written with the DefaultErrorEncoder.
export function ServerErrorEncoder(ee: ErrorEncoder): ServerOption {
    return function(s: serverOption) { s.errorEncoder = ee }
}

// ServerFinalizer is executed at the end of every HTTP request.
// By default, no finalizer is registered.
export function ServerFinalizer(...f: ServerFinalizerFunc[]): ServerOption {
    return function(s: serverOption) { s.finalizer.push(...f) }
}

// DefaultErrorEncoder writes the error to the ResponseWriter, by default a
// content type of text/plain, a body of the plain text of the error, and a
// status code of 500. If the error implements Headerer, the provided headers
// will be applied to the response. If the error implements json.Marshaler, and
// the marshaling succeeds, a content type of application/json and the JSON
// encoded form of the error will be used. If the error implements StatusCoder,
// the provided StatusCode will be used instead of 500.
function DefaultErrorEncoder(ctx: context.Context, err: string, w: Express.Response) {
    const contentType = "text/plain; charset=utf-8";
    const body = err

    w.setHeader("Content-Type", contentType).status(200).json(body);
}

interface interceptingWriter extends Express.Response {
    code?: number
    written?: number
}