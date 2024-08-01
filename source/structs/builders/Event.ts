import { Client, ClientEvents, Collection } from "discord.js";

export interface EventOptions<EventName extends keyof ClientEvents> {
    name: string, event: EventName; once?: boolean;
    executor(...args: ClientEvents[EventName]): void;
};

type EventList = Collection<string, EventOptions<keyof ClientEvents>>;

export class Event<EventName extends keyof ClientEvents> implements EventOptions<EventName> {
    public static items: Collection<keyof ClientEvents, EventList>;

    declare name: string;
    declare event: EventName;
    declare executor: (...args: ClientEvents[EventName]) => void

    public once?: boolean | undefined;
    constructor(options: EventOptions<EventName>) {
        const events = Event.items.get(options.event) ?? new Collection();
        events.set(options.name, options);
        Event.items.set(options.event, events);
    }

    public static register(client: Client) {
        const itemList = Event.items.map((list, event) => ({
            event, eventList: list.map(e => ({ executor: e.executor, once: e.once }))
        }));

        for (const { event, eventList } of itemList) {
            client.on(event, (...args) => {
                for(const { executor } of eventList.filter(e => !e.once)) executor(...args);
            });

            client.once(event, (...args) => {
                for(const { executor } of eventList.filter(e => e.once)) executor(...args);
            });
        }
    }
}