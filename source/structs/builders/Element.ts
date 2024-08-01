import { AnySelectMenuInteraction, AutocompleteInteraction, ButtonInteraction, CacheType, ChannelSelectMenuInteraction, ChatInputCommandInteraction, Collection, CommandInteraction, Interaction, MentionableSelectMenuInteraction, ModalMessageModalSubmitInteraction, ModalSubmitInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction } from "discord.js";
import { Args, getArguments, Prettify } from '#structs'

export type ElementInteraction = Exclude<Interaction, AutocompleteInteraction | CommandInteraction | ChatInputCommandInteraction>

export enum ElementType {
    Button = "Button(s)",
    Modal = "Modal(s)",
    ModalComponent = "Modal component(s)",
    Select = "Select menu(s)"
};

export enum ElementSelect {
    String = "String",
    Mentionable = "Mentionable",
    Channel = "Channel",
    User = "User",
    Role = "Role",
    Any = "Any"
}

export type GetInteraction<Element, Cache extends CacheType = CacheType, Select = never> =
Element extends ElementType.Button ? ButtonInteraction<Cache> :
Element extends ElementType.Modal ? ModalSubmitInteraction<Cache> :
Element extends ElementType.ModalComponent ? ModalMessageModalSubmitInteraction<Cache> :
Element extends ElementType.Select ? Select extends ElementSelect ?
    Select extends ElementSelect.Mentionable ? MentionableSelectMenuInteraction<Cache> :
    Select extends ElementSelect.Channel ? ChannelSelectMenuInteraction<Cache> :
    Select extends ElementSelect.String ? StringSelectMenuInteraction<Cache> :
    Select extends ElementSelect.Role ? RoleSelectMenuInteraction<Cache> :
    Select extends ElementSelect.User ? UserSelectMenuInteraction<Cache> :
    Select extends ElementSelect.Any ? AnySelectMenuInteraction<Cache>
    : never
    : never
: never;

export type ElementOptions<I, E, C extends CacheType = CacheType, S = never> =
E extends ElementType.Select ? {
    customId: I; cache?: C;
    type: ElementType.Select; selectType: S;
    executor(interaction: GetInteraction<E, C, S>, args: Prettify<Args<I>>): void;
} : {
    customId: I; cache?: C;
    type: E;
    executor(interaction: GetInteraction<E, C, never>, args: Prettify<Args<I>>): void;
};

type ElementList = Collection<string, ElementOptions<string, ElementType, CacheType, ElementSelect>>

export class Element<
    I extends string,
    E extends ElementType,
    C extends CacheType,
    S extends ElementSelect
> {
    public static items: Collection<ElementType, ElementList> = new Collection();

    declare customId: Required<I>;
    declare type: Required<E>;
    declare selectType: Required<S>
    declare executor: (
        interaction: GetInteraction<E, C, E extends ElementType.Select ? S : never>,
        args: Prettify<Args<I>>
    ) => void;

    public cached?: C;
    constructor(options: ElementOptions<I, E, C, S>) {
        const subitems = Element.items.get(options.type) ?? new Collection();
        subitems.set(Element.sortCustomIds(options.customId).id, options);
        Element.items.set(options.type, subitems);
    };

    public static sortCustomIds(id: string) {
        const segments = id.replace(/\[|\]/g, '').split(',').map(item => item.trim());

        return {
            hasArgs: segments.some(args => args.includes(':')),
            id: segments[0],
            count: segments.length,
            args: segments
        }
    }

    public static getElementType(interaction: ElementInteraction) {
        return interaction.isMentionableSelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.Mentionable } :
        interaction.isChannelSelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.Channel } :
        interaction.isStringSelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.String } :
        interaction.isUserSelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.User } :
        interaction.isRoleSelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.Role } :
        interaction.isAnySelectMenu() ? { elementType: ElementType.Select, selectType: ElementSelect.Any } :
        interaction.isButton() ? { elementType: ElementType.Button } :
        interaction.isFromMessage() ? { elementType: ElementType.ModalComponent} :
        interaction.isModalSubmit() ? { elementType: ElementType.Modal } : undefined;
    };

    public static onInteraction(interaction: ElementInteraction) {
        const objectType = Element.getElementType(interaction);

        if (!objectType) return;
        let subItems: ElementList | undefined;

        switch (objectType.elementType) {
            case ElementType.Button:
                subItems = Element.items.find(items => items.find(item => item.type === ElementType.Button));
                break;
            case ElementType.Modal:
                subItems = Element.items.find(items => items.find(item => item.type === ElementType.Modal));
                break;
            case ElementType.ModalComponent:
                subItems = Element.items.find(items => items.find(item => item.type === ElementType.ModalComponent));
                break;
            case ElementType.Select:
                subItems = Element.items.find(items => items.find(item => item.type === ElementType.Select && item.selectType === objectType.selectType));
                break;
        };

        if (!subItems) subItems = new Collection();

        const element = subItems.find(element => {
                const defArr = Element.sortCustomIds(element.customId);
                const cusArr = Element.sortCustomIds(interaction.customId);

                if (defArr.args.length !== cusArr.args.length) return;
                return defArr.args[0] === cusArr.args[0]
        });

        if (!element) return;

        const args = getArguments(element.customId, interaction.customId) ?? {};

        element.executor(interaction as never, args)
    }
};