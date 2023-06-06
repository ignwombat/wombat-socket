import { WebSocket } from 'ws';

import { EventMap } from 'typed-emitter';
import { SocketData, BaseEvents, EventHandler } from './types';

import eventEmitter from './emitter';
import { randomUUID } from 'crypto';
import { setTimeout } from 'timers/promises';

export default class Socket<Up extends EventMap = EventMap, Down extends EventMap = Up, Shared extends EventMap = {}, Data extends SocketData = SocketData> {
    private _socket: WebSocket;
    private _emitter = eventEmitter<Up & Shared, BaseEvents>();
    private _acknowledgements = new Map<string, (...args: any[]) => void>();

    private _data: Partial<Data> = {};
    private _shareData: boolean;

    /** Timestamp for when the socket finished connecting. */
    connectedAt = Date.now();

    /** Milliseconds since the socket was connected. */
    get timeSinceConnected() {
        return Date.now() - this.connectedAt;
    }

    /** Timestamp for last time a message was sent. */
    lastSentAt?: number;

    /** Timestamp for last time a message was received. */
    lastReceivedAt?: number;

    private _on = this._emitter.on;
    private _off = this._emitter.off;
    private _once = this._emitter.once;

    /** The library uses the _ (underscore) prefix for its build in events. */
    on: EventHandler<Up & Shared> = this._on;

    /** The library uses the _ (underscore) prefix for its build in events. */
    off: EventHandler<Up & Shared> = this._off;

    /** The library uses the _ (underscore) prefix for its build in events. */
    once: EventHandler<Up & Shared> = this._once;

    /** Sends any data to the sockets. Stringifies it with JSON if possible. */
    send(data: any) {
        try {
            const json = JSON.stringify(data);
            data = json;
        } catch {}

        this._socket.send(data);
        this.lastSentAt = Date.now();    
    }

    parseIncoming?: (...args: any[]) => any[];
    parseOutgoing?: (...args: any[]) => any[];

    private async _emit<EV extends string & keyof (Down & Shared & BaseEvents)>(ev: EV, ...args: Parameters<(Down & Shared & BaseEvents)[EV]>|any[]) {
        const t = 1000 - this.timeSinceConnected;
        if (t > 0) await setTimeout(t);
    
        const parsedArgs = this.parseOutgoing?.(...args);
        this.send({
            _event: ev,
            _args: parsedArgs
        });
    }

    async emit<EV extends string & keyof (Down & Shared)>(ev: EV, ...args: Parameters<(Down & Shared)[EV]>) {
        return this._emit(ev, ...args);
    }

    get(key: string & keyof Data) {
        return this._data[key];
    }

    set<K extends string & keyof Data>(key: K, value: Data[K]) {
        this._data[key] = value;
        this._shareData && this._emit('_data', key, value);
    }

    unset(key: string & keyof Data) {
        this._data[key] = undefined;
        this._shareData && this._emit('_data', key);
    }

    constructor(socket: WebSocket, shareData: boolean = true, writable: boolean = true) {
        this._socket = socket;
        this._shareData = shareData;

        this.parseIncoming = (...args) => args.map(arg => {
            const id = arg?._acknowledgement as string|undefined;
            if (!id) return arg;

            return (..._args: any[]) => {
                this.send({
                    _event: '_acknowledgement',
                    _args: [id, ...(this.parseOutgoing?.(..._args) ?? [])]
                });
            }
        });

        this.parseOutgoing = (...args) => args.map(arg => {
            if (typeof arg !== 'function') return arg;

            let id = randomUUID();
            while (this._acknowledgements.has(id)) id = randomUUID();

            this._acknowledgements.set(id, (..._args) => {
                this._acknowledgements.delete(id);
                arg(...(this.parseIncoming?.(..._args) ?? []));
            });

            return { _acknowledgement: id };
        });

        writable && this._on('_data', (key: string & keyof Data, value?: any) => {
            this._data[key] = value;
        });
    }
}