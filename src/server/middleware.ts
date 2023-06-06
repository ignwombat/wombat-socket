import { Express } from 'express';

import { Server, createServer } from 'http';
import { Server as WsServer } from 'ws';

import { Handler, WebsocketRoute } from './types';
import { EventMap, SocketData } from '../types';

import Socket from '../socket';

import eventEmitter from '../emitter';
import { setTimeout } from 'timers/promises';

import { randomUUID } from 'crypto';

declare module 'express' {
    function Router(options?: import('express').RouterOptions): import('express').Router & {
        ws: WebsocketRoute;
    }
}

export default function middleware(app: Express, server?: Server) {
    if (!server) {
        server = createServer(app);
        app.listen = (...args) => server.listen(...args);
    }

    const wsServers: [string, WsServer][] = [];
    server.on('upgrade', (req, socket, head) => {
        const matchingServers = wsServers.filter(s => {
            const parsedPath = s[0]
                .replaceAll('/', '\\/')
                .replaceAll('*', '[\\w-]*')

            const regex = new RegExp(parsedPath, 'i');
            return regex.test(req.url);
        });

        if (matchingServers.length === 0) return socket.destroy(new Error('Not found'));
        if (matchingServers.length > 1) throw new Error(`Websocker URL ${req.url} returned true for more than one path: ${matchingServers.map(s => s[0]).join(' ')}`);

        const [[,wsServer]] = matchingServers;
        wsServer.handleUpgrade(req, socket, head, s => {
            wsServer.emit('connection', s, req);
        });
    });
    
    const wsMethod = <Up extends EventMap = EventMap, Down extends EventMap = Up, Shared extends EventMap = {}, Data extends SocketData = SocketData>(
        path: string,
        ...handlers: Handler<Up, Down, Shared>[]
    ) => {
        if (wsServers.some(s => s[0] === path)) throw new Error(`Websocket path ${path} is already registered`);

        const wsServer = new WsServer({
            noServer: true,
            path
        });

        wsServer.on('connection', (socket, req) => {
            const s = new Socket<Up, Down, Shared, Data>(socket, true);            
        });

        wsServers.push([path, wsServer]);
    }
}