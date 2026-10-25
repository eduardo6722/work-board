const STATE_HOOKS = new Set(["useState", "useReducer"]);
const EFFECT_HOOKS = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);
const LIBRARY_HOOKS = new Set([
  "useForm",
  "useFormContext",
  "useFormState",
  "useWatch",
  "useFieldArray",
  "useController",
  "useQuery",
  "useQueries",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useMutation",
  "useQueryClient",
  "useIsFetching",
  "useIsMutating",
  "useRouter",
  "usePathname",
  "useSearchParams",
  "useParams",
  "useSelectedLayoutSegment",
  "useSelectedLayoutSegments",
  "useContext",
  "useRef",
  "useMemo",
  "useCallback",
  "useId",
  "useDeferredValue",
  "useTransition",
  "useOptimistic",
  "useSyncExternalStore",
  "useImperativeHandle",
  "useDebugValue",
]);

const SECTION_RANK = {
  state: 1,
  library: 2,
  custom: 3,
  constant: 4,
  function: 5,
  effect: 6,
  return: 7,
};

const SECTION_LABEL = {
  1: "states",
  2: "library hooks",
  3: "custom hooks",
  4: "constants",
  5: "functions",
  6: "effects",
  7: "return",
};

function isPascalCase(name) {
  return typeof name === "string" && /^[A-Z]/.test(name);
}

function hookNameFromCallee(callee) {
  if (!callee) {
    return null;
  }
  if (callee.type === "Identifier" && /^use[A-Z]/.test(callee.name)) {
    return callee.name;
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    /^use[A-Z]/.test(callee.property.name)
  ) {
    return callee.property.name;
  }
  return null;
}

function classifyHook(name) {
  if (STATE_HOOKS.has(name)) {
    return "state";
  }
  if (EFFECT_HOOKS.has(name)) {
    return "effect";
  }
  if (LIBRARY_HOOKS.has(name)) {
    return "library";
  }
  return "custom";
}

function unwrap(node) {
  let current = node;
  while (
    current &&
    (current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "ChainExpression")
  ) {
    current = current.expression ?? current;
  }
  return current;
}

function isFunctionNode(node) {
  return (
    node &&
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionExpression" ||
      node.type === "FunctionDeclaration")
  );
}

function classifyInit(init) {
  const value = unwrap(init);
  if (!value) {
    return "constant";
  }
  if (isFunctionNode(value)) {
    return "function";
  }
  if (value.type === "CallExpression") {
    const hook = hookNameFromCallee(value.callee);
    if (hook) {
      return classifyHook(hook);
    }
  }
  if (
    value.type === "AwaitExpression" &&
    value.argument?.type === "CallExpression"
  ) {
    const hook = hookNameFromCallee(value.argument.callee);
    if (hook) {
      return classifyHook(hook);
    }
  }
  return "constant";
}

function classifyStatement(statement) {
  if (statement.type === "ReturnStatement") {
    return "return";
  }
  if (statement.type === "IfStatement") {
    return containsReturn(statement) ? "return" : null;
  }
  if (statement.type === "FunctionDeclaration") {
    return "function";
  }
  if (statement.type === "ExpressionStatement") {
    const expr = unwrap(statement.expression);
    if (expr?.type === "CallExpression") {
      const hook = hookNameFromCallee(expr.callee);
      if (hook) {
        return classifyHook(hook);
      }
    }
    return null;
  }
  if (statement.type === "VariableDeclaration") {
    const kinds = statement.declarations.map((declarator) =>
      classifyInit(declarator.init),
    );
    const rank = Math.min(...kinds.map((kind) => SECTION_RANK[kind]));
    return Object.keys(SECTION_RANK).find((key) => SECTION_RANK[key] === rank);
  }
  return null;
}

function containsReturn(node) {
  if (!node) {
    return false;
  }
  if (node.type === "ReturnStatement") {
    return true;
  }
  if (node.type === "BlockStatement") {
    return node.body.some((child) => containsReturn(child));
  }
  if (node.type === "IfStatement") {
    return containsReturn(node.consequent) || containsReturn(node.alternate);
  }
  return false;
}

function containsJsx(node, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) {
    return false;
  }
  seen.add(node);
  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value) && value.some((item) => containsJsx(item, seen))) {
      return true;
    }
    if (value && typeof value === "object" && containsJsx(value, seen)) {
      return true;
    }
  }
  return false;
}

function functionBody(node) {
  if (node.type === "ArrowFunctionExpression" && node.body.type !== "BlockStatement") {
    return null;
  }
  if (node.body?.type === "BlockStatement") {
    return node.body.body;
  }
  return null;
}

function isComponentFunction(node, context) {
  if (!isFunctionNode(node)) {
    return false;
  }
  let name = null;
  if (node.id?.name) {
    name = node.id.name;
  } else if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    name = node.parent.id.name;
  } else if (
    node.parent?.type === "ExportDefaultDeclaration" &&
    context.sourceCode.getFirstToken(node.parent)?.value
  ) {
    name = "DefaultComponent";
  }
  if (name && !isPascalCase(name) && node.parent?.type !== "ExportDefaultDeclaration") {
    return false;
  }
  if (node.parent?.type === "ExportDefaultDeclaration" && !name) {
    return containsJsx(node);
  }
  if (!name) {
    return false;
  }
  return containsJsx(node);
}

/** @type {import("eslint").Rule.RuleModule} */
export const reactComponentStructureRule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce project React function component section order: states, library hooks, custom hooks, constants, functions, effects, return.",
    },
    schema: [],
    messages: {
      outOfOrder:
        "React component body must follow: states → library hooks → custom hooks → constants → functions → effects → return. Found {{actual}} after {{previous}}.",
    },
  },
  create(context) {
    function checkFunction(node) {
      if (!isComponentFunction(node, context)) {
        return;
      }
      const body = functionBody(node);
      if (!body) {
        return;
      }

      let previousRank = 0;
      let previousLabel = "start";

      for (const statement of body) {
        const section = classifyStatement(statement);
        if (!section) {
          continue;
        }
        const rank = SECTION_RANK[section];
        if (rank < previousRank) {
          context.report({
            node: statement,
            messageId: "outOfOrder",
            data: {
              actual: SECTION_LABEL[rank],
              previous: previousLabel,
            },
          });
        }
        if (rank >= previousRank) {
          previousRank = rank;
          previousLabel = SECTION_LABEL[rank];
        }
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};
