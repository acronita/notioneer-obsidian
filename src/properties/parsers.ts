import { format } from "date-fns";

/** Parses JSON, or returns undefined. */
export const safelyParseJSON = (json: string): unknown => {
	try {
		return JSON.parse(json) as unknown;
	} catch {
		return undefined;
	}
};

export const ensureString = (value: unknown): string => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return value.toString();
	return JSON.stringify(value);
};

export const ensureArray = (value: unknown): unknown[] => {
	if (Array.isArray(value)) return value as unknown[];
	if (typeof value === "string") return [value];
	return [];
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** `a, b` → ["a", "b"], trimmed. The `\,` escape does not work: its first occurrence is turned
    into a plain comma before splitting, so it separates items like any other comma. */
export const parseMultiDisplayString = (str: string): string[] =>
	(ensureString(str).replace("\\,", ",").match(/(\\.|[^,])+/g) ?? []).map((f) => f.trim());

/** A multi-value cell is stored either as a JSON array or as a comma-separated string. */
export const parseMultiString = (str: string): string[] =>
	ensureString(str).startsWith("[")
		? ensureArray(safelyParseJSON(str)).map((f) => ensureString(f))
		: parseMultiDisplayString(str);

export const serializeMultiDisplayString = (value: string[]) => value.map((f) => f.replace(",", "\\,")).join(", ");
export const serializeMultiString = (value: string[]) => JSON.stringify(value);

const indexOfCharElseEOS = (char: string, str: string) => (str.indexOf(char) > 0 ? str.indexOf(char) : str.length);

/** `[[Note|alias]]` → `Note`; anything else unchanged. */
export const parseLinkString = (string: string) => {
	if (!string) return "";
	const match = /\[\[(.*?)\]\]/g.exec(string);
	const stringValue = match && match.length > 1 ? match[1].substring(0, indexOfCharElseEOS("|", match[1])) : string;
	return stringValue || string;
};

export const parseObject = (value: string, multi: boolean): unknown =>
	multi ? ensureArray(safelyParseJSON(value)) : (safelyParseJSON(value) ?? {});


/** A YAML `[[link]]` parses as a one-element array holding a one-element array. */
const isYamlLink = (value: unknown): value is [[string]] =>
	Array.isArray(value) &&
	value.length == 1 &&
	Array.isArray(value[0]) &&
	(value[0] as unknown[]).length == 1 &&
	typeof (value[0] as unknown[])[0] === "string";

const pathOf = (value: unknown): string | undefined =>
	isRecord(value) && typeof value.path === "string" ? value.path : undefined;

/** Detects a property's type from its frontmatter value (make.md's `detectPropertyType`).
    `declaredMulti` is true when Obsidian itself declares the key a list (`multitext`): such a
    key stays a list when its value is empty, a bare string or a single `[[link]]`. */
export const detectPropertyType = (value: unknown, key: string, declaredMulti = false): string => {
	if (key?.toLowerCase() == "tag" || key?.toLowerCase() == "tags") return "tags-multi";
	if (value instanceof Date) return "date";
	if (typeof value === "string") {
		if (/\/\/(\S+?(?:jpe?g|png|gif|svg))/gi.test(value) || value.includes("unsplash")) return "image";
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date";
		if (key == "tag" || key == "tags") return "tags-multi";
		if (/\[\[.*?\]\]/.test(value)) return declaredMulti ? "link-multi" : "link";
		return declaredMulti ? "option-multi" : "text";
	}
	if (typeof value === "number") return "number";
	if (typeof value === "boolean") return "boolean";
	if (!value) return declaredMulti ? (key == "tag" || key == "tags" ? "tags-multi" : "option-multi") : "unknown";
	if (Array.isArray(value)) {
		if (key == "tag" || key == "tags") return "tags-multi";
		if (isYamlLink(value)) return declaredMulti ? "link-multi" : "link";
		const types = [...new Set((value as unknown[]).map((f) => detectPropertyType(f, key)))];
		if (types.length == 1 && types[0] == "link") return "link-multi";
		if (types.some((f) => f == "object")) return "object-multi";
		return "option-multi";
	}
	if (isRecord(value)) return value.type == "file" ? "link" : "object";
	return "unknown";
};

/** Frontmatter value → the string a cell edits (make.md's `parseProperty`). */
export const parseProperty = (field: string, value: unknown, type?: string): string => {
	const yamlType = type ?? detectPropertyType(value, field);
	if (!value) return "";
	switch (yamlType) {
		case "tags-multi":
			return Array.isArray(value) ? serializeMultiString(value.map(ensureString)) : ensureString(value);
		case "object":
		case "object-multi": {
			if (Array.isArray(value)) {
				if (pathOf(value[0])) return JSON.stringify(value.map(pathOf));
			} else if (pathOf(value)) {
				return pathOf(value) ?? "";
			}
			return JSON.stringify(value);
		}
		case "number":
			return ensureString(value);
		case "boolean":
			return value ? "true" : "false";
		case "date":
			if (value instanceof Date) return format(value, "yyyy-MM-dd");
			return typeof value === "string" ? value : "";
		case "option-multi":
		case "link-multi":
			if (typeof value === "string") return serializeMultiString([parseLinkString(value)]);
			return serializeMultiString(
				ensureArray(value).map((v) => {
					if (typeof v === "number" || typeof v === "boolean") return String(v);
					if (!v) return "";
					if (typeof v === "string") return parseLinkString(v);
					if (pathOf(v)) return pathOf(v) ?? "";
					if (Array.isArray(v) && v.length == 1 && Array.isArray(v[0]) && typeof v[0][0] === "string") {
						return v[0][0];
					}
					// An unquoted `[[x]]` is itself the list: its only element is the bare name.
					if (isYamlLink(value) && Array.isArray(v) && v.length == 1 && typeof v[0] === "string") return v[0];
					return JSON.stringify(v);
				}),
			);
		case "link":
			if (isYamlLink(value)) return value[0][0];
			if (typeof value === "string") return parseLinkString(value);
			return pathOf(value) ?? "";
		case "text":
		case "tag":
		case "option":
		case "image":
			return ensureString(value);
	}
	return "";
};

/** Cell string → the frontmatter value written back (make.md's `parseMDBStringValue`). */
export const parseMDBStringValue = (type: string, value: string, frontmatter?: boolean): unknown => {
	if (!type) return value;
	if (type == "object" || type == "object-multi") return safelyParseJSON(value);
	if (type == "number") return parseFloat(value);
	if (type == "boolean") return value == "true";
	if (type == "date" || type == "datetime" || type == "date-end") {
		if (!value) return null;
		const date = new Date(value);
		return !isNaN(date.getTime()) ? date : value;
	}
	if (type.includes("-multi")) {
		return parseMultiString(value).map((f) => parseMDBStringValue(type.replace("-multi", ""), f, frontmatter));
	}
	if (type.includes("link") || type.includes("context")) return frontmatter ? `[[${value}]]` : value;
	return value;
};

/** Initial frontmatter value for a property created with a given type. */
export const defaultValueForType = (type: string): unknown => {
	if (type == "date") return format(Date.now(), "yyyy-MM-dd");
	if (type == "number") return 0;
	if (type == "boolean") return true;
	if (type == "link") return "[[Select Note]]";
	if (type == "text") return " ";
	// A list starts empty; "option" is a list too (a lone "one, two" string would read back as text).
	if (type == "option" || type.endsWith("-multi")) return [];
	if (type == "image") {
		return "https://images.unsplash.com/photo-1675789652575-0a5d2425b6c2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80";
	}
	return undefined;
};

/** A link as it is written in frontmatter (`[[Note|alias]]` kept whole), or undefined. */
const asLink = (value: unknown): string | undefined => {
	if (typeof value === "string") return value.trim() ? (/\[\[.*?\]\]/.test(value) ? value : `[[${value}]]`) : undefined;
	if (isYamlLink(value)) return `[[${value[0][0]}]]`;
	const path = pathOf(value);
	return path ? `[[${path}]]` : undefined;
};

/** The value a property gets when its type changes, carrying the existing one over instead of
    resetting it. Lists and text convert both ways (`a, b` ⇄ `["a", "b"]`; line breaks also
    separate items), `link` ⇄ `link-multi` keep the links whole (aliases included). Rules
    that lose nothing silently, and never return `undefined`:
    - empty current value (or only whitespace) → the target's default (`[]` for a list);
    - a list going to a single value joins with ", "; a single `link` cannot hold several, so
      a list of more than one link is returned unchanged;
    - a value the target cannot represent — `foo` as a number or date, `a, b` as a boolean —
      is returned unchanged rather than invented or blanked;
    - objects and icons have no text/list form: only `object` ⇄ `object-multi` (and `icon`)
      change, by wrapping in / unwrapping a list; any other conversion leaves the value. */
export const convertValueToType = (current: unknown, fromType: string, toType: string): unknown => {
	const multiTarget = toType.endsWith("-multi");
	const fromFamily = fromType.replace("-multi", "");
	const toFamily = toType.replace("-multi", "");
	const fallback = multiTarget ? [] : (defaultValueForType(toType) ?? current);

	if (/^(object|icon)$/.test(fromFamily) || /^(object|icon)$/.test(toFamily)) {
		if (fromFamily != toFamily) return current;
		if (multiTarget) return Array.isArray(current) ? current : current == null ? [] : [current];
		return Array.isArray(current) && current.length == 1 ? current[0] : current;
	}
	if (fromFamily == "link" && toFamily == "link") {
		const links = (Array.isArray(current) && !isYamlLink(current) ? current : [current])
			.map(asLink)
			.filter((f): f is string => !!f);
		if (multiTarget) return links;
		return links.length > 1 ? current : (links[0] ?? fallback);
	}

	// `parseProperty` reads falsy values as empty, which would blank 0 and false.
	const cell =
		typeof current === "number" || typeof current === "boolean"
			? String(current)
			: parseProperty("", current, fromType);
	if (!cell.trim()) return fallback;

	const items = (
		fromType.endsWith("-multi")
			? parseMultiString(cell)
			: multiTarget && (fromType == "text" || fromType == "option")
				? parseMultiDisplayString(cell.replace(/\r?\n/g, ","))
				: [cell]
	).filter((f) => f);
	if (items.length == 0) return fallback;
	if (multiTarget) return items.map((f) => parseMDBStringValue(toFamily, f, true));
	if (toType == "link" && items.length > 1) return current;

	const single = toType == "link" ? items[0] : items.join(", ");
	switch (toType) {
		case "number":
			return single.trim() != "" && Number.isFinite(Number(single)) ? Number(single) : current;
		case "boolean":
			return /^(true|false)$/i.test(single.trim()) ? single.trim().toLowerCase() == "true" : current;
		case "date":
			return /^\d{4}-\d{2}-\d{2}$/.test(single.trim()) ? single.trim() : current;
		default:
			return parseMDBStringValue(toType, single, true);
	}
};
