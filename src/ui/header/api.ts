import { App, TFile, TFolder, normalizePath } from "obsidian";
import { parseMDBStringValue, serializeMultiDisplayString, ensureArray, ensureString } from "../../properties/parsers";
import { NotioneerSettings } from "../../settings";
import { UI } from "../ui";

/** Everything the header components do to the vault, in place of make.md's Superstate. */
export type HeaderApi = {
	app: App;
	ui: UI;
	settings: NotioneerSettings;
	saveSettings: () => void;
	saveProperties: (path: string, properties: Record<string, unknown>) => Promise<void>;
	/** Rewrites one property from its live frontmatter value; `undefined` keeps it as is. */
	updateProperty: (path: string, name: string, update: (current: unknown) => unknown) => Promise<void>;
	renameProperty: (path: string, oldName: string, newName: string) => Promise<void>;
	deleteProperty: (path: string, name: string) => Promise<void>;
	/** Renames the note to `newName` (same folder and extension); null when it failed. */
	renamePathByName: (path: string, newName: string) => Promise<string | null>;
	/** Makes `value` the note's first alias. */
	updatePrimaryAlias: (path: string, aliases: unknown, value: string) => Promise<void>;
	/** An `<img>`-ready URL for a vault path (make.md's `getUIPath`). */
	getUIPath: (path: string) => string;
	openPath: (path: string, newLeaf: boolean) => void;
	revealFolder: (path: string) => void;
	/** Whether Obsidian declares the property a list (`multitext`); false when it cannot tell. */
	isMultiTextProperty: (key: string) => boolean;
};

const fileAt = (app: App, path: string) => {
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile ? file : null;
};

const renamePathWithExtension = (path: string, newName: string) => {
	const dir = path.substring(0, path.lastIndexOf("/"));
	const ext = path.lastIndexOf(".") != -1 ? path.substring(path.lastIndexOf(".")) : "";
	return dir.length > 0 ? `${dir}/${newName}${ext}` : `${newName}${ext}`;
};

const getParentPathFromString = (file: string) => {
	const index = file.lastIndexOf("/");
	return index == -1 ? "/" : file.substring(0, index + 1);
};

type FileExplorer = { revealInFolder?: (file: TFolder) => void };
type AppWithInternals = App & {
	internalPlugins?: { plugins?: Record<string, { instance?: FileExplorer } | undefined> };
	metadataTypeManager?: { getPropertyInfo?: (key: string) => { widget?: string; type?: string } | undefined };
};

export const createHeaderApi = (
	app: App,
	ui: UI,
	settings: NotioneerSettings,
	saveSettings: () => void,
): HeaderApi => {
	const processFrontMatter = async (path: string, fn: (frontmatter: Record<string, unknown>) => void) => {
		const file = fileAt(app, path);
		if (file) await app.fileManager.processFrontMatter(file, fn);
	};
	const saveProperties = (path: string, properties: Record<string, unknown>) =>
		processFrontMatter(path, (frontmatter) => {
			for (const [key, value] of Object.entries(properties)) frontmatter[key] = value;
		});

	return {
		app,
		ui,
		settings,
		saveSettings,
		saveProperties,
		updateProperty: (path, name, update) =>
			processFrontMatter(path, (frontmatter) => {
				const key =
					name in frontmatter ? name : (Object.keys(frontmatter).find((f) => f.toLowerCase() == name.toLowerCase()) ?? name);
				const value = update(frontmatter[key]);
				if (value !== undefined) frontmatter[key] = value;
			}),
		// make.md re-creates the frontmatter without the old key, so the renamed one moves last.
		renameProperty: (path, oldName, newName) =>
			processFrontMatter(path, (frontmatter) => {
				const value = frontmatter[oldName];
				if (!value) return;
				delete frontmatter[oldName];
				frontmatter[newName] = value;
			}),
		deleteProperty: (path, name) =>
			processFrontMatter(path, (frontmatter) => {
				delete frontmatter[name];
			}),
		renamePathByName: async (path, newName) => {
			const file = app.vault.getAbstractFileByPath(path);
			const newPath = renamePathWithExtension(path, newName);
			try {
				if (file) await app.fileManager.renameFile(file, newPath);
				else await app.vault.adapter.rename(path, newPath);
				return newPath;
			} catch {
				return null;
			}
		},
		updatePrimaryAlias: (path, aliases, value) => {
			const newValue = serializeMultiDisplayString([
				value,
				...ensureArray(aliases)
					.map(ensureString)
					.filter((f) => f == value),
			]);
			return saveProperties(path, {
				[settings.fmKeyAlias]: parseMDBStringValue("option-multi", newValue, true),
			});
		},
		getUIPath: (path) => {
			const file = fileAt(app, path);
			const cacheBuster = Math.floor(Math.random() * 1000);
			if (file) return `${app.vault.getResourcePath(file)}?${cacheBuster}`;
			if (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/i.test(path)) return path;
			const root = getParentPathFromString(app.vault.adapter.getResourcePath(normalizePath("/")));
			return `${root}${path}?${cacheBuster}`;
		},
		openPath: (path, newLeaf) => {
			const file = fileAt(app, path);
			if (file) void app.workspace.getLeaf(newLeaf).openFile(file);
		},
		isMultiTextProperty: (key) => {
			// `metadataTypeManager` is not public API; a version without it declares nothing.
			try {
				const info = (app as AppWithInternals).metadataTypeManager?.getPropertyInfo?.(key.toLowerCase());
				return (info?.widget ?? info?.type) == "multitext";
			} catch {
				return false;
			}
		},
		revealFolder: (path) => {
			// `revealInFolder` is not public API; a version without it does nothing.
			try {
				const folder = app.vault.getAbstractFileByPath(path);
				const explorer = (app as AppWithInternals).internalPlugins?.plugins?.["file-explorer"]?.instance;
				if (folder instanceof TFolder) explorer?.revealInFolder?.(folder);
			} catch (error) {
				console.error("Notioneer: could not reveal folder", error);
			}
		},
	};
};
