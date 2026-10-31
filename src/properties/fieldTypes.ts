import i18n from "../ui/i18n";

export type FieldType = {
	type: string;
	label: string;
	icon: string;
	multi?: boolean;
	multiType?: string;
	/** Offered when choosing a frontmatter property's type. */
	metadata?: boolean;
	restricted?: boolean;
	description?: string;
};

/** A frontmatter property as the header rows see it. */
export type Property = {
	name: string;
	type: string;
};

/** make.md's field types that a frontmatter property can end up as. The order is theirs:
    it is the order of the "property type" menu. */
export const fieldTypes: FieldType[] = [
	{ type: "unknown", label: "", restricted: true, icon: "ui//file-question" },
	{
		type: "text",
		label: i18n.properties.text.label,
		metadata: true,
		icon: "ui//text",
		description: i18n.properties.text.description,
	},
	{
		type: "number",
		label: i18n.properties.number.label,
		metadata: true,
		icon: "ui//binary",
		description: i18n.properties.number.description,
	},
	{
		type: "boolean",
		label: i18n.properties.boolean.label,
		metadata: true,
		icon: "ui//check-square",
		description: i18n.properties.boolean.description,
	},
	{
		type: "date",
		label: i18n.properties.date.label,
		metadata: true,
		icon: "ui//calendar",
		description: i18n.properties.date.description,
	},
	{
		type: "option",
		label: i18n.properties.option.label,
		metadata: true,
		multi: true,
		multiType: "option-multi",
		icon: "ui//list",
		description: i18n.properties.option.description,
	},
	{
		type: "tags-multi",
		label: i18n.properties.tags.label,
		icon: "ui//tags",
		description: i18n.properties.tags.description,
	},
	{
		type: "link",
		label: i18n.properties.link.label,
		multi: true,
		multiType: "link-multi",
		metadata: true,
		icon: "ui//file-text",
		description: i18n.properties.link.description,
	},
	{
		type: "object",
		label: i18n.properties.object.label,
		multi: true,
		multiType: "object-multi",
		metadata: true,
		icon: "ui//list-tree",
		description: i18n.properties.object.description,
	},
	{
		type: "icon",
		label: i18n.properties.icon.label,
		multi: true,
		multiType: "icon-multi",
		icon: "ui//gem",
		restricted: true,
		description: i18n.properties.icon.description,
	},
	{
		type: "image",
		label: i18n.properties.image.label,
		multi: true,
		multiType: "image-multi",
		metadata: true,
		icon: "ui//mk-make-image",
		description: i18n.properties.image.description,
	},
];

/** Kept exactly as make.md resolves it, including its quirks: no field type is *named*
    `option-multi`, so `aliases` resolves to nothing (and renders no value cell), and
    `sticker` only resolves when its type is `icon`. Both keys are hidden in the header. */
export const fieldTypeForType = (type: string, name?: string): FieldType | undefined =>
	name?.toLowerCase() == "tags"
		? fieldTypes.find((t) => t.type == "tags-multi")
		: name == "aliases"
			? undefined
			: name == "sticker"
				? type == "icon"
					? fieldTypes[0]
					: undefined
				: (fieldTypes.find((t) => type == t.type) ?? fieldTypes.find((t) => type == t.multiType));

export const stickerForField = (f: Property) => fieldTypeForType(f.type, f.name)?.icon;

export const propertyIsObjectType = (property: Property) => property.type == "object" || property.type == "object-multi";
