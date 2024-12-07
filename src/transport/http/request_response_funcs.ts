import * as context from '../../context/context';
import Express from 'express';

// RequestFunc may take information from an HTTP request and put it into a
// request context. In Servers, RequestFuncs are executed prior to invoking the
// endpoint. In Clients, RequestFuncs are executed after creating the request
// but prior to invoking the HTTP client.
export type RequestFunc = (ctx: context.Context, req: Express.Request) => context.Context;

// ServerResponseFunc may take information from a request context and use it to
// manipulate a ResponseWriter. ServerResponseFuncs are only executed in
// servers, after invoking the endpoint but prior to writing a response.
export type ServerResponseFunc = (ctx: context.Context, res: Express.Response) => context.Context;

// SetContentType returns a ServerResponseFunc that sets the Content-Type header
// to the provided value.
export function SetContentType(contentType: string) :ServerResponseFunc {
    return SetResponseHeader("Content-Type", contentType)
}

// SetResponseHeader returns a ServerResponseFunc that sets the given header.
export function SetResponseHeader(key: string, val: string): ServerResponseFunc {
    return function(ctx: context.Context, w: Express.Response): context.Context {
        w.header(key, val);
        return ctx
    }
}

// SetRequestHeader returns a RequestFunc that sets the given header.
export function SetRequestHeader(key: string, val: string): RequestFunc {
    return function(ctx: context.Context, r: Express.Request): context.Context {
        r.headers[key] = val;
        return ctx
    }
}

// PopulateRequestContext is a RequestFunc that populates several values into
// the context from the HTTP request. Those values may be extracted using the
// corresponding ContextKey type in this package.
export function PopulateRequestContext(ctx: context.Context, r: Express.Request): context.Context {
    const ctxMap = new Map<symbol, any>([
        [ContextKeyRequestMethod, r.method],
        [ContextKeyRequestURI, r.url],
        [ContextKeyRequestPath, r.path],
        [ContextKeyRequestProto, r.protocol],
        [ContextKeyRequestHost, r.hostname],
        [ContextKeyRequestRemoteAddr, r.ip],
        [ContextKeyRequestXForwardedFor, r.get("X-Forwarded-For")],
        [ContextKeyRequestXForwardedProto, r.get("X-Forwarded-Proto")],
        [ContextKeyRequestAuthorization, r.get("Authorization")],
        [ContextKeyRequestReferer, r.get("Referer")],
        [ContextKeyRequestUserAgent, r.get("User-Agent")],
        [ContextKeyRequestXRequestID, r.get("X-Request-Id")],
        [ContextKeyRequestAccept, r.get("Accept")],
    ]);

    ctxMap.forEach((val, key) => {
        ctx = context.WithValue(ctx, key, val);
    });

    return ctx;
}

export const ContextKeyRequestMethod = Symbol("ContextKeyRequestMethod");
export const ContextKeyRequestURI = Symbol("ContextKeyRequestURI");
export const ContextKeyRequestPath = Symbol("ContextKeyRequestPath");
export const ContextKeyRequestProto = Symbol("ContextKeyRequestProto");
export const ContextKeyRequestHost = Symbol("ContextKeyRequestHost");
export const ContextKeyRequestRemoteAddr = Symbol("ContextKeyRequestRemoteAddr");
export const ContextKeyRequestXForwardedFor = Symbol("ContextKeyRequestXForwardedFor");
export const ContextKeyRequestXForwardedProto = Symbol("ContextKeyRequestXForwardedProto");
export const ContextKeyRequestAuthorization = Symbol("ContextKeyRequestAuthorization");
export const ContextKeyRequestReferer = Symbol("ContextKeyRequestReferer");
export const ContextKeyRequestUserAgent = Symbol("ContextKeyRequestUserAgent");
export const ContextKeyRequestXRequestID = Symbol("ContextKeyRequestXRequestID");
export const ContextKeyRequestAccept = Symbol("ContextKeyRequestAccept");
export const ContextKeyResponseHeaders = Symbol("ContextKeyResponseHeaders");
export const ContextKeyResponseSize = Symbol("ContextKeyResponseSize");