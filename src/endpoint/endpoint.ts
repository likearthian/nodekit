import { Context } from '../context/context';

export type Endpoint<I,O> = (ctx: Context, request: I) => O | Promise<O>;

export type Middleware<I,O> = (endpoint: Endpoint<I,O>) => Endpoint<I,O>;

// Chain is a helper function for composing middlewares. Requests will
// traverse them in the order they're declared. That is, the first middleware
// is treated as the outermost middleware.
export function Chain<I,O>(outer: Middleware<I,O>, ...others: Middleware<I,O>[]): Middleware<I,O> {
    return function(next: Endpoint<I,O>): Endpoint<I,O> {
        for (var i = others.length - 1; i >= 0; i--) { // reverse
            next = others[i](next)
        }
        return outer(next)
    }
}

// Failer may be implemented by response types that contain business
// logic error details. If Failed returns a non-nil error, the transport
// layer may interpret this as a business logic error, and may encode it
// differently than a regular, successful response.
//
// It's not necessary for your response types to implement Failer, but it may
// help for more sophisticated use cases.
interface Failer {
    Failed(): string
}
