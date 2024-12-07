export interface Context {
    Value(key: any): any
}

export function Background(): Context {
    return new emptyCtx();
}

class emptyCtx {
    Value(key: any): any {
        return null;
    }
}

export function WithValue(ctx: Context, key: any, val: any): Context {
    return new valueCtx(ctx, key, val);
}

class valueCtx {
    key: any;
    val: any;
    parent: Context

    constructor(parent: Context, key: any, val: any) {
        this.parent = parent;
        this.key = key;
        this.val = val;
    }

    Value(key: any): any {
        if (this.key === key) {
            return this.val;
        }

        return this.parent.Value(key);
    }
}