import type React from "react";
import { fieldTypes, Property } from "../../properties/fieldTypes";
import { convertValueToType } from "../../properties/parsers";
import { HeaderApi } from "../header/api";
import i18n from "../i18n";
import { defaultMenu, menuSeparator } from "../menus/SelectMenu";
import { windowFromDocument } from "../screen";
import { Rect, SelectOption, SelectOptionType } from "../types";

/** The menu on a property's name (make.md's `showPropertiesMenu` for a note). */
export const showPropertiesMenu = (api: HeaderApi, path: string, rect: Rect, win: Window, property: Property) => {
	const field = fieldTypes.find((f) => f.type == property.type || f.multiType == property.type);
	const isMulti = property.type.endsWith("-multi");
	/** Converts the note's current value to `type` instead of resetting it. */
	const convertTo = (type: string): void =>
		void api.updateProperty(path, property.name, (current) => convertValueToType(current, property.type, type));
	const changeType = (e: React.MouseEvent) => {
		api.ui.openMenu(
			(e.target as HTMLElement).getBoundingClientRect(),
			{
				multi: false,
				editable: false,
				searchable: false,
				// A list stays a list when the new type has a multiple form, and "Option" is always a
				// list: a single "a, b" string would read back as text.
				saveOptions: (_, v) => {
					const multiType = fieldTypes.find((f) => f.type == v[0])?.multiType;
					convertTo(isMulti || v[0] == "option" ? (multiType ?? v[0]) : v[0]);
				},
				value: [],
				showAll: true,
				options: fieldTypes
					.filter((f) => f.metadata)
					.map((f, i) => ({ id: i + 1, name: f.label, value: f.type, icon: f.icon })),
			},
			windowFromDocument(e.view.document),
		);
	};
	// make.md offers to copy the value into one of the note's spaces (there are none), in a
	// menu anchored to the property name rather than to this menu.
	const syncToContext = () => {
		api.ui.openMenu(
			rect,
			{
				multi: false,
				editable: false,
				value: [],
				options: [],
				placeholder: i18n.labels.spaceSelectPlaceholder,
				detail: true,
				searchable: true,
				showAll: true,
			},
			win,
			"bottom",
		);
	};

	const menuOptions: SelectOption[] = [
		{
			name: "",
			type: SelectOptionType.Input,
			value: property.name,
			onValueChange: (value) => void api.renameProperty(path, property.name, value),
			description: "",
		},
		menuSeparator,
	];
	// Tags are always a list, and their type cannot be changed (make.md forces `tags-multi`).
	if (property.type != "tags-multi") {
		menuOptions.push({ name: i18n.menu.changePropertyType, icon: "ui//list", onClick: changeType });
		if (field?.multiType) {
			menuOptions.push({
				name: i18n.labels.multiple,
				type: SelectOptionType.Radio,
				value: isMulti ? "multiple" : "",
				onClick: () => convertTo(isMulti ? field.type : (field.multiType ?? field.type)),
			});
		}
	}
	if (property.type != "object") {
		menuOptions.push({ name: i18n.menu.syncToContext, icon: "ui//sync", onClick: syncToContext });
	}
	menuOptions.push({
		name: i18n.menu.deleteProperty,
		icon: "ui//trash",
		onClick: () => void api.deleteProperty(path, property.name),
	});
	api.ui.openMenu(rect, defaultMenu(menuOptions), win);
};
