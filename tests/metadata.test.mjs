import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('skill uses valid simple YAML frontmatter with scoped name and description', async () => {
  const text = await fs.readFile(new URL('../skills/task-resource-guard/SKILL.md', import.meta.url), 'utf8');
  // This skill deliberately uses the JSON-string subset of YAML: no parser dependency.
  const match = /^---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ("[^\n]*")\n---\n/.exec(text);
  assert.ok(match, 'two-field simple YAML frontmatter');
  assert.equal(match[1], 'task-resource-guard');
  assert.ok(match[1].length <= 64);
  const description = JSON.parse(match[2]);
  assert.ok(description.length > 0 && description.length <= 1024);
  assert.equal(/[<>]/.test(description), false);
  assert.equal(text.includes('[TODO:'), false);
});
