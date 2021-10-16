/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/eslint-etc
 */

import { TSESLint as eslint } from "@typescript-eslint/experimental-utils";

export function fromFixture<TMessageIds extends string>(
  fixture: string,
  invalidTestCase?: {
    output?: string;
    suggestions?: eslint.SuggestionOutput<TMessageIds>[] | null | undefined;
  }
): eslint.InvalidTestCase<TMessageIds, never>;

export function fromFixture<
  TMessageIds extends string,
  TOptions extends unknown[]
>(
  fixture: string,
  invalidTestCase: Omit<
    eslint.InvalidTestCase<TMessageIds, TOptions>,
    "code" | "errors"
  > & {
    suggestions?: eslint.SuggestionOutput<TMessageIds>[] | null | undefined;
  }
): eslint.InvalidTestCase<TMessageIds, TOptions>;

export function fromFixture<
  TMessageIds extends string,
  TOptions extends unknown[]
>(
  fixture: string,
  invalidTestCase: Omit<
    eslint.InvalidTestCase<TMessageIds, TOptions>,
    "code" | "errors"
  > & {
    suggestions?: eslint.SuggestionOutput<TMessageIds>[] | null | undefined;
  } = {}
): eslint.InvalidTestCase<TMessageIds, TOptions> {
  const { suggestions, ...rest } = invalidTestCase;
  return {
    ...rest,
    ...parseFixture(fixture, suggestions),
  };
}

function getSuggestions<TMessageIds extends string>(
  suggestions: eslint.SuggestionOutput<TMessageIds>[] | null | undefined,
  suggest: boolean,
  indices: string | undefined
): { suggestions?: eslint.SuggestionOutput<TMessageIds>[] } {
  if (!suggestions || !suggest) {
    return {};
  }
  if (!indices) {
    return { suggestions };
  }
  return {
    suggestions: indices
      .split(/\s+/)
      .map((index) => suggestions[Number.parseInt(index, 10)]),
  };
}

function parseFixture<TMessageIds extends string>(
  fixture: string,
  suggestions: eslint.SuggestionOutput<TMessageIds>[] | null | undefined
) {
  const errorRegExp =
    /^(?<indent>\s*)(?<error>~+)\s*\[(?<id>\w+)\s*(?<data>.*?)(?:\s*(?<suggest>suggest)\s*(?<indices>[\d\s]*))?\]\s*$/;
  const lines: string[] = [];
  const errors: eslint.TestCaseError<TMessageIds>[] = [];
  let suggestFound = false;
  fixture.split("\n").forEach((line) => {
    const match = line.match(errorRegExp);
    if (match?.groups) {
      const column = match.groups.indent.length + 1;
      const endColumn = column + match.groups.error.length;
      const { length } = lines;
      errors.push({
        column,
        data: JSON.parse(match.groups.data || "{}"),
        endColumn,
        endLine: length,
        line: length,
        messageId: match.groups.id as TMessageIds,
        ...getSuggestions(
          suggestions,
          Boolean(match.groups.suggest),
          match.groups.indices?.trim()
        ),
      });
      if (match.groups.suggest) {
        suggestFound = true;
      }
    } else {
      lines.push(line);
    }
  });
  if (suggestions && !suggestFound) {
    throw new Error("Suggestions specified but no 'suggest' annotation found.");
  }
  return {
    code: lines.join("\n"),
    errors,
  };
}
