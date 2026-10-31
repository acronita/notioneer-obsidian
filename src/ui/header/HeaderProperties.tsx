import React, { PropsWithChildren, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Property } from "../../properties/fieldTypes";
import { defaultValueForType, detectPropertyType, parseMDBStringValue, parseProperty } from "../../properties/parsers";
import { hiddenPropertyKeys } from "../../settings";
import i18n from "../i18n";
import { defaultMenu, menuSeparator } from "../menus/SelectMenu";
import { isTouchScreen, windowFromDocument } from "../screen";
import { SelectOption } from "../types";
import { showNewPropertyMenu } from "../properties/newPropertyMenu";
import { showPropertiesMenu } from "../properties/propertyMenu";
import { DataPropertyView } from "../properties/PropertyRow";
import { CellEditMode } from "../properties/types";
import { HeaderApi } from "./api";
import { openCoverPicker } from "./BannerView";
import { NoteState, useNote } from "./NoteContext";

/** The chevron that folds the property rows (make.md's `CollapseToggle`). */
const CollapseToggle = (props: { collapsed: boolean; onToggle: () => void }) => {
	const { api } = useNote();
	return (
		<button
			className={`mk-collapse ${props.collapsed ? "mk-collapsed" : ""}`}
			onClick={(e) => {
				e.stopPropagation();
				props.onToggle();
			}}
			dangerouslySetInnerHTML={{ __html: api.ui.getSticker("ui//collapse") }}
		></button>
	);
};

/** The note's top-level folder and immediate parent, shown where make.md listed the note's
    spaces; clicking one reveals it in the file explorer. The parent is drawn lighter. */
const FolderCrumb = (props: { path: string }) => {
	const { api } = useNote();
	const parent = props.path.includes("/") ? props.path.slice(0, props.path.lastIndexOf("/")) : "";
	if (parent === "") return null;
	const segments = parent.split("/");
	const paths = [segments[0], parent].filter((path, index, all) => all.indexOf(path) === index);
	return (
		<>
			{paths.map((path, index) => (
				<div
					key={path}
					className={`mk-props-contexts-space-name notioneer-folder-crumb${index > 0 ? " notioneer-folder-crumb-faded" : ""}`}
					onClick={() => api.revealFolder(path)}
					aria-label={path}
				>
					<div
						className="mk-icon-xsmall"
						dangerouslySetInnerHTML={{ __html: api.ui.getSticker("ui//folder") }}
					></div>
					{path.split("/").pop()}
				</div>
			))}
		</>
	);
};

/** The "…" button phones get next to the folder chips: cover actions. */
const MobileHeaderBar = () => {
	const { note, api } = useNote();
	const showMenu = (e: React.MouseEvent) => {
		if (!note) return;
		const win = windowFromDocument(e.view.document);
		const hasBanner = !!note.property[api.settings.fmKeyBanner];
		const menuOptions: SelectOption[] = [menuSeparator];
		if (hasBanner) {
			menuOptions.push(
				{
					name: i18n.buttons.changeBanner,
					icon: "ui//mk-make-image",
					onClick: (ev) => void openCoverPicker(api, note.path, windowFromDocument(ev.view.document)),
				},
				{
					name: i18n.buttons.removeBanner,
					icon: "ui//file-minus",
					onClick: () => void api.deleteProperty(note.path, api.settings.fmKeyBanner),
				},
			);
		} else {
			menuOptions.push({
				name: i18n.buttons.addCover,
				icon: "ui//mk-make-image",
				onClick: (ev) => void openCoverPicker(api, note.path, windowFromDocument(ev.view.document)),
			});
		}
		api.ui.openMenu((e.target as HTMLElement).getBoundingClientRect(), defaultMenu(menuOptions), win);
	};
	return (
		<div className="mk-space-context-bar">
			<div className="mk-space-context-bar-section">
				<button className="mk-toolbar-button" onClick={(e) => showMenu(e)}>
					<div className="mk-icon-xsmall" dangerouslySetInnerHTML={{ __html: api.ui.getSticker("ui//options") }}></div>
				</button>
			</div>
		</div>
	);
};

/** Frontmatter keys in order, deduplicated case-insensitively (first spelling wins). */
const propertyKeys = (property: Record<string, unknown>) =>
	Object.keys(property).filter(
		(key, index, all) => all.findIndex((other) => other.toLowerCase() == key.toLowerCase()) === index,
	);

const rowsFor = (note: NoteState, excluded: string[], api: HeaderApi) => {
	const columns: Property[] = propertyKeys(note.property).map((name) => ({
		name,
		type: detectPropertyType(note.property[name], name, api.isMultiTextProperty(name)),
	}));
	return columns
		.filter((f) => !excluded.includes(f.name))
		.map((column) => ({ column, value: parseProperty(column.name, note.property[column.name], column.type) }));
};

/** Folder chips, the fold chevron and the property rows under the title (make.md's
    `HeaderPropertiesView` + `PropertiesView`, without spaces). */
export const HeaderProperties = (props: PropsWithChildren<unknown>) => {
	const { note, api, readMode } = useNote();
	const { settings } = api;
	const [collapsed, setCollapsed] = useState(!settings.inlineContextExpanded);
	const firstRender = useRef(true);
	useEffect(() => {
		if (firstRender.current) {
			firstRender.current = false;
			return;
		}
		settings.inlineContextExpanded = !collapsed;
		api.saveSettings();
	}, [collapsed]);

	const [isPending, startTransition] = useTransition();
	useEffect(() => {
		startTransition(() => null);
	}, []);

	const excludedKeys = hiddenPropertyKeys(settings);
	const rows = useMemo(
		() => (note ? rowsFor(note, [...excludedKeys, settings.fmKeyAlias], api) : []),
		[note],
	);
	if (!note) return null;

	const newProperty = (e: React.MouseEvent) => {
		showNewPropertyMenu(
			api.ui,
			(e.target as HTMLElement).getBoundingClientRect(),
			windowFromDocument(e.view.document),
			(field) => {
				void api.saveProperties(note.path, { [field.name]: defaultValueForType(field.type) });
				return true;
			},
		);
	};

	return (
		<div className="mk-props-contexts">
			{!readMode && (
				<div style={{ position: "relative" }}>
					<div className="mk-fold">
						<CollapseToggle
							collapsed={collapsed}
							onToggle={() => startTransition(() => setCollapsed((f) => !f))}
						></CollapseToggle>
					</div>
				</div>
			)}
			<div className="mk-path-context-row">
				<div className="mk-props-contexts-space-list">
					<FolderCrumb path={note.path}></FolderCrumb>
					<span style={{ flex: 1 }}></span>
					{props.children}
					{isTouchScreen() && <MobileHeaderBar />}
				</div>
			</div>
			{(!collapsed || isPending) && (
				<div
					className="mk-header-space"
					style={{ transition: "all 0.3s ease-in-out", maxHeight: isPending ? "0px" : "unset" }}
				>
					{rows.map(({ column, value }, i) => (
						<DataPropertyView
							key={i}
							api={api}
							path={note.path}
							propertyMenu={(e) =>
								showPropertiesMenu(
									api,
									note.path,
									(e.target as HTMLElement).getBoundingClientRect(),
									windowFromDocument(e.view.document),
									column,
								)
							}
							initialValue={value}
							compactMode={false}
							column={column}
							editMode={CellEditMode.EditModeAlways}
							updateValue={(v) =>
								void api.saveProperties(note.path, {
									[column.name]: parseMDBStringValue(column.type, v, true),
								})
							}
						></DataPropertyView>
					))}
					<div className="mk-path-context-row-new">
						<div className="mk-path-context-new" onClick={(e) => newProperty(e)}>
							<div
								className="mk-path-context-field-icon"
								dangerouslySetInnerHTML={{ __html: api.ui.getSticker("ui//plus") }}
							></div>
							<div className="mk-path-context-field-key">{i18n.labels.newProperty}</div>
						</div>
					</div>
				</div>
			)}
			{excludedKeys.length > 0 && (
				<style>
					{`${excludedKeys.map((f) => `.metadata-property[data-property-key="${f}"]`).join(", ")}
      {
         display: none;
      }`}
				</style>
			)}
		</div>
	);
};
