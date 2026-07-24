const ENDPOINT_DECORATOR = /@(call|view|init)(?:\s*\([^)]*\))?/g;
const STORE_TYPES = new Set([
  "LookupMap",
  "LookupSet",
  "IterableMap",
  "IterableSet",
  "Vector",
  "Deferred",
  "LazyOption",
]);

function findClosing(source, start, open, close) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    if (source[index] === close) depth -= 1;
    if (depth === 0) return index;
  }
  throw new Error(`Unclosed ${open} at offset ${start}`);
}

export function generateContractModule(source, sdkImport) {
  const matches = [...source.matchAll(/@contract_state\s+(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one @contract_state class, found ${matches.length}`);
  }

  const [match] = matches;
  const className = match[1];
  const classStart = match.index;
  const classBodyStart = source.indexOf("{", classStart + match[0].length);
  if (classBodyStart === -1) throw new Error(`Contract class ${className} has no body`);
  const classBodyEnd = findClosing(source, classBodyStart, "{", "}");

  // @contract_state also marks the root object as recursively JSON serializable.
  const beforeClass = source.slice(0, classStart);
  const storeFields = discoverStoreFields(source.slice(classBodyStart + 1, classBodyEnd));
  const contractAndBody = omitStoreFields(source
    .slice(classStart, classBodyEnd + 1)
    .replace("@contract_state", "@json"), storeFields);
  const afterClass = source.slice(classBodyEnd + 1);
  const state = `

const __loadedContract = __loadContract<${className}>();
export const state: ${className} = __loadedContract === null
  ? new ${className}()
  : __loadedContract!;
${storeFields.map(({ name, initializer }) => `if (changetype<usize>(state.${name}) == 0) state.${name} = ${initializer};`).join("\n")}
${storeFields.map(({ name }) => `state.${name}.__bind("state.${name}");`).join("\n")}
`;

  const generatedSource = `import { __loadContract } from ${JSON.stringify(sdkImport)};\n${beforeClass}${contractAndBody}${state}${afterClass}`;

  return {
    className,
    // Contracts always use the public package name. A local build can map that
    // package to a relative SDK entry without leaking the path into user code.
    source: generatedSource.replace(
      /from\s+(["'])near-sdk-as\1/g,
      `from ${JSON.stringify(sdkImport)}`,
    ),
  };
}

function discoverStoreFields(classBody) {
  const fields = [];
  const fieldPattern = /^\s*(?:public\s+)?(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(?::\s*((?:(?:store|collections)\.)?([A-Za-z_$][\w$]*)(?:<([^;=]+)>)?))?\s*=\s*(new\s+(?:(?:store|collections)\.)?([A-Za-z_$][\w$]*)(?:<[^;=()]+>)?\s*\(\s*\))/gm;
  for (const match of classBody.matchAll(fieldPattern)) {
    const type = match[6];
    if (!STORE_TYPES.has(type)) continue;
    if (new RegExp(`\\b(${[...STORE_TYPES].join("|")})\\s*(?:<|\\b)`).test(match[4] || "")) {
      throw new Error("Nested scalable collections are not supported");
    }
    fields.push({ name: match[1], type, initializer: match[5] });
  }
  return fields;
}

function omitStoreFields(contractSource, fields) {
  let result = contractSource;
  for (const { name } of fields) {
    const field = new RegExp(`^(\\s*)(?:@omit\\s*\\n\\s*)?((?:public\\s+)?(?:readonly\\s+)?${name}\\s*[:=])`, "m");
    result = result.replace(field, "$1@omit\n$1$2");
  }
  return result;
}

function splitParameters(parameters) {
  const trimmed = parameters.trim();
  if (!trimmed) return [];

  let angle = 0;
  let square = 0;
  let round = 0;
  const result = [];
  let start = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === "<") angle += 1;
    else if (char === ">") angle -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "," && angle === 0 && square === 0 && round === 0) {
      result.push(trimmed.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(trimmed.slice(start).trim());
  return result;
}

function parseParameter(parameter, endpointName) {
  const match = /^([A-Za-z_$][\w$]*)\s*:\s*(.+)$/.exec(parameter);
  if (!match) {
    throw new Error(
      `${endpointName} parameter ${JSON.stringify(parameter)} must have the form name: Type`,
    );
  }

  const declaration = match[2];
  let angle = 0;
  let square = 0;
  let round = 0;
  let equals = -1;
  for (let index = 0; index < declaration.length; index += 1) {
    const char = declaration[index];
    if (char === "<") angle += 1;
    else if (char === ">") angle -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "=" && angle === 0 && square === 0 && round === 0) {
      equals = index;
      break;
    }
  }

  const type = declaration.slice(0, equals === -1 ? undefined : equals).trim();
  const defaultValue = equals === -1 ? null : declaration.slice(equals + 1).trim();
  if (!type || defaultValue === "") {
    throw new Error(
      `${endpointName} parameter ${JSON.stringify(parameter)} must have the form name: Type`,
    );
  }
  return defaultValue === null
    ? { name: match[1], type }
    : { name: match[1], type, defaultValue };
}

export function discoverEndpoints(source) {
  const endpoints = [];
  for (const match of source.matchAll(ENDPOINT_DECORATOR)) {
    const kind = match[1];
    const payable = /\bpayable\s*:\s*true\b/.test(match[0]);
    const privateEndpoint = /\bprivateMethod\s*:\s*true\b/.test(match[0]);
    if (kind === "view" && payable) {
      throw new Error("@view cannot be payable");
    }
    if (kind === "init" && payable) {
      throw new Error("@init cannot be payable");
    }
    if (kind === "init" && privateEndpoint) {
      throw new Error("@init cannot be private");
    }
    const declarationStart = match.index + match[0].length;
    const declaration = /^\s*export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(
      source.slice(declarationStart),
    );
    if (!declaration) {
      throw new Error(`@${kind} must be followed by an exported function`);
    }

    const name = declaration[1];
    const parameterStart =
      declarationStart + declaration.index + declaration[0].lastIndexOf("(");
    const parameterEnd = findClosing(source, parameterStart, "(", ")");
    const parameters = splitParameters(source.slice(parameterStart + 1, parameterEnd))
      .map((parameter) => parseParameter(parameter, name));

    const afterParameters = source.slice(parameterEnd + 1);
    const returnMatch = /^\s*:\s*([^\{\n]+)\s*\{/.exec(afterParameters);
    if (!returnMatch) {
      throw new Error(`${name} must declare an explicit return type`);
    }

    const endpoint = {
      kind,
      name,
      parameters,
      returnType: returnMatch[1].trim(),
      returnsVoid: returnMatch[1].trim() === "void",
    };
    if (endpoint.returnType === "Promise") {
      if (kind === "view") throw new Error("@view cannot return a Promise");
      if (kind === "init") throw new Error("@init cannot return a Promise");
      endpoint.returnsPromise = true;
    }
    if (payable) endpoint.payable = true;
    if (privateEndpoint) endpoint.private = true;
    endpoints.push(endpoint);
  }
  return endpoints;
}

export function generateEntry({ sourceImport, sdkImport, endpoints }) {
  if (endpoints.length === 0) {
    throw new Error("No @call, @view, or @init endpoints were found");
  }

  const imports = endpoints
    .map((endpoint) => `${endpoint.name} as __${endpoint.name}`);
  const builtinTypes = new Set([
    "bool", "string", "i8", "i16", "i32", "i64", "isize",
    "u8", "u16", "u32", "u64", "usize", "f32", "f64",
    "ArrayBuffer", "Uint8Array",
  ]);
  const parameterTypes = new Set();
  const sdkParameterTypes = new Set();
  for (const endpoint of endpoints) {
    for (const parameter of endpoint.parameters) {
      const root = /^([A-Za-z_$][\w$]*)/.exec(parameter.type)?.[1];
      if (root === "NearToken" || root === "U128" || root === "Gas" || root === "JSON") {
        sdkParameterTypes.add(root);
      }
      else if (root && !builtinTypes.has(root)) parameterTypes.add(root);
    }
  }
  imports.push(...parameterTypes);
  if (endpoints.some(({ kind }) => kind !== "view")) {
    imports.push("state as __state");
  }
  const functions = imports.join(",\n  ");
  const needsInput = endpoints.some(({ parameters }) => parameters.length > 0);
  const needsReturn = endpoints.some(({ returnsVoid, returnsPromise }) =>
    !returnsVoid && !returnsPromise);
  const helpers = [];
  if (needsInput) helpers.push("__readInput");
  helpers.push(...sdkParameterTypes);
  if (needsReturn) helpers.push("__returnJson");
  if (endpoints.some(({ returnsPromise }) => returnsPromise)) {
    helpers.push("__returnPromise");
  }
  if (endpoints.some(({ payable }) => !payable)) {
    helpers.push("__requireNoDeposit");
  }
  if (endpoints.some(({ kind }) => kind !== "view")) {
    helpers.push("__saveContract");
  }
  if (endpoints.some(({ kind }) => kind === "init")) {
    helpers.push("__requireUninitialized");
  }
  if (endpoints.some(({ private: privateEndpoint }) => privateEndpoint)) {
    helpers.push("__requirePrivate");
  }

  const argumentClasses = endpoints
    .filter(({ parameters }) => parameters.length > 0)
    .map(({ name, parameters }) => `@json
class __Args_${name} {
${parameters.map((parameter) => {
    const type = parameter.type === "NearToken" || parameter.type === "U128"
      ? "string"
      : parameter.type;
    return parameter.defaultValue === undefined
      ? `  ${parameter.name}!: ${type};`
      : `  ${parameter.name}: ${type} = ${parameter.defaultValue};`;
  }).join("\n")}
}`)
    .join("\n\n");

  const wrappers = endpoints.map((endpoint) => {
    const lines = [`export function ${endpoint.name}(): void {`];
    if (!endpoint.payable) {
      lines.push("  __requireNoDeposit();");
    }
    if (endpoint.kind === "init") lines.push("  __requireUninitialized();");
    if (endpoint.private) lines.push("  __requirePrivate();");
    if (endpoint.parameters.length > 0) {
      lines.push(`  const args = __readInput<__Args_${endpoint.name}>();`);
    }
    const argumentsList = endpoint.parameters
      .map(({ name, type }) => {
        if (type === "NearToken") return `NearToken.fromYoctoNear(args.${name})`;
        if (type === "U128") return `U128.fromString(args.${name})`;
        return `args.${name}`;
      })
      .join(", ");
    const call = `__${endpoint.name}(${argumentsList})`;
    if (endpoint.returnsVoid) lines.push(`  ${call};`);
    else lines.push(`  const result = ${call};`);
    if (endpoint.kind !== "view") lines.push("  __saveContract(__state);");
    if (endpoint.returnsPromise) lines.push("  __returnPromise(result);");
    else if (endpoint.returnType === "U128" || endpoint.returnType === "NearToken") {
      lines.push("  __returnJson(result.toString());");
    }
    else if (!endpoint.returnsVoid) lines.push("  __returnJson(result);");
    lines.push("}");
    return lines.join("\n");
  }).join("\n\n");

  return `// Generated by near-as. Inspectable by design; do not edit.
import {
  ${functions},
} from ${JSON.stringify(sourceImport)};
import {
  ${helpers.join(",\n  ")},
} from ${JSON.stringify(sdkImport)};

${argumentClasses}
${argumentClasses ? "\n" : ""}${wrappers}
`;
}
