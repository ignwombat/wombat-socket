import Socket from '../socket';

import {
    BaseEvents,
    EventMap,
    SocketData
} from '../types';

import { IncomingMessage } from 'http';
import { NextFunction } from 'express';

export type Handler<Up extends EventMap = EventMap, Down extends EventMap = Up, Shared extends EventMap = {}, Data extends SocketData = SocketData> = (
    ws: Socket<Up, Down, Shared, Data>,
    req: IncomingMessage,
    next: NextFunction
) => void;

export type WebsocketRoute = <Up extends EventMap = EventMap, Down extends EventMap = Up, Shared extends EventMap = {}, Data extends SocketData = SocketData>(
    path: string,
    ...handlers: Handler<Up, Down, Shared & BaseEvents, Data>[]
) => void;