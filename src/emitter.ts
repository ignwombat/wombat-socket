import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { EventMap } from './types';

export default function eventEmitter<BaseEvents extends EventMap = {}, Events extends EventMap = {}>() {
    return new EventEmitter as TypedEmitter<BaseEvents> & TypedEmitter<Events>;
}