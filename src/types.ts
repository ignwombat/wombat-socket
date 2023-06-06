import { EventMap as IEventMap } from 'typed-emitter';

export type EventMap = IEventMap;
export type EventHandler<Events extends EventMap> = <EV extends string & keyof Events>(ev: EV, handler: Events[EV]) => void;

export type BaseEvents = {
    _acknowledgement: (id: string, ...args: any[]) => void;
    _data: (key: string, value?: any) => void;
}

export type SocketData = Record<string, any>;