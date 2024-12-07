export interface Logger {
    // for cli and npm levels
    error: (message: string, ...keyvals: any[]) => void;
    warn: (message: string, ...keyvals: any[]) => void;
    info: (message: string, ...keyvals: any[]) => void;
    debug: (message: string, ...keyvals: any[]) => void;
}
