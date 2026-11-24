import type { Lesson, Unit } from '../../core/learning/lessons';

// Code tracks (PLAN §5.2 "Unit 9", ordered as requested: Python, C, Java, C++).
// shortcut: one line per prompt because the typing engine has no Enter key; add Enter + auto-indent for snippets.

interface Track {
  id: string;
  unit: number;
  name: string;
  blurb: string;
  keywords: string[];
  operators: string[];
  statements: string[];
  lines: string[];
}

// prettier-ignore
const TRACKS: Track[] = [
  {
    id: 'py',
    unit: 10,
    name: 'Python',
    blurb: 'Colons, brackets and quotes: the symbols Python leans on.',
    keywords: [
      'def', 'return', 'if', 'elif', 'else', 'for', 'in', 'while', 'import', 'from', 'as', 'class',
      'None', 'True', 'False', 'and', 'or', 'not', 'with', 'try', 'except', 'lambda', 'pass', 'break',
      'continue', 'print', 'len', 'range', 'self', 'yield',
    ],
    operators: [
      'x = [1, 2, 3]', 'd = {"a": 1}', 't = (x, y)', 'n += 1', 'a[i] = b[j]', 'x == y', 'x != y',
      'a <= b', 'f(x, y=2)', 's[1:-1]', 'n ** 2', 'a // b', 'x % 2 == 0', 'xs[-1]', '*args, **kwargs',
    ],
    statements: [
      'import os', 'from math import sqrt', 'for i in range(10):', 'if x > 0:', 'while not done:',
      'return a + b', 'print(f"{name}: {score}")', 'with open(path) as f:', 'except ValueError as e:',
      'def add(a, b):', 'class Point:', 'self.x = x', 'assert len(xs) == 3', 'else:',
    ],
    lines: [
      'def __init__(self, name, age=0):',
      'counts = {k: v for k, v in pairs if v > 1}',
      'total = sum(x * x for x in values)',
      'if __name__ == "__main__":',
      'raise KeyError(f"missing {key!r}")',
      'lines = open("data.txt").read().splitlines()',
      'result = sorted(items, key=lambda p: p[1], reverse=True)',
      'print(", ".join(str(n) for n in range(5)))',
      'names = [n.upper() for n in names if n]',
      'return {"id": self.id, "tags": list(self.tags)}',
    ],
  },
  {
    id: 'c',
    unit: 11,
    name: 'C',
    blurb: 'Semicolons, braces, pointers and format strings.',
    keywords: [
      'int', 'char', 'float', 'double', 'void', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
      'case', 'break', 'continue', 'struct', 'typedef', 'const', 'static', 'sizeof', 'unsigned', 'long',
      'include', 'define', 'NULL',
    ],
    operators: [
      'i++', '--n', 'p->next', '*ptr = 0;', '&x', 'a[i] = b[i];', 'x << 2', 'flags & MASK', 'a || b',
      '!done', 'x ? y : z', 'n %= 10;', '(char *)buf', 's.len', 'x >> 1',
    ],
    statements: [
      '#include <stdio.h>', 'int main(void) {', 'return 0;', 'printf("%d\\n", n);',
      'for (int i = 0; i < n; i++) {', 'if (p == NULL) return -1;', 'char buf[256];', 'while (*s) s++;',
      '#define MAX 100', 'free(ptr);', 'size_t len = strlen(s);', '} else {',
    ],
    lines: [
      'typedef struct node { int value; struct node *next; } node_t;',
      'node_t *head = malloc(sizeof(node_t));',
      'memcpy(dst, src, n * sizeof(int));',
      'static const char *names[] = {"red", "green", "blue"};',
      'if (argc < 2) { fprintf(stderr, "usage: %s file\\n", argv[0]); return 1; }',
      'for (node_t *p = head; p != NULL; p = p->next) count++;',
      'unsigned int hash = (h << 5) + h + c;',
      "switch (c) { case 'a': n++; break; default: break; }",
      'int *xs = calloc(n, sizeof *xs);',
      'while ((c = getchar()) != EOF) putchar(c);',
    ],
  },
  {
    id: 'java',
    unit: 12,
    name: 'Java',
    blurb: 'Long names, generics in angle brackets, and a semicolon on every line.',
    keywords: [
      'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final',
      'void', 'new', 'return', 'this', 'super', 'import', 'package', 'try', 'catch', 'finally', 'throw',
      'throws', 'null', 'true', 'false', 'int', 'boolean', 'String',
    ],
    operators: [
      'i++', 'x += 2;', 'a == b', '!list.isEmpty()', 's.length()', 'arr[i]', 'a && b', 'x > 0 ? x : -x',
      'List<String>', 'Map<String, Integer>', 'obj instanceof Point', 'n >>> 1', '(int) d', 'a.b().c()',
    ],
    statements: [
      'import java.util.List;', 'package com.example.app;', 'public class Main {',
      'public static void main(String[] args) {', 'System.out.println("Hello");',
      'int[] nums = new int[10];', 'for (int i = 0; i < nums.length; i++) {',
      'String name = user.getName();', 'return count;', 'throw new IllegalArgumentException("empty");',
      '@Override', '} catch (IOException e) {',
    ],
    lines: [
      'List<String> names = new ArrayList<>();',
      'Map<String, Integer> counts = new HashMap<>();',
      'counts.merge(word, 1, Integer::sum);',
      'for (String word : text.split("\\\\s+")) {',
      'private final int id;',
      'public int compareTo(Point o) { return Integer.compare(x, o.x); }',
      'try (var in = new FileInputStream(path)) {',
      'names.stream().filter(n -> n.length() > 3).forEach(System.out::println);',
      'if (obj == null || getClass() != obj.getClass()) return false;',
      'public record Point(int x, int y) {}',
    ],
  },
  {
    id: 'cpp',
    unit: 13,
    name: 'C++',
    blurb: 'Scope colons, templates, references and lambdas.',
    keywords: [
      'auto', 'const', 'class', 'struct', 'namespace', 'template', 'typename', 'public', 'private',
      'virtual', 'override', 'return', 'nullptr', 'new', 'delete', 'std', 'vector', 'string', 'using',
      'include', 'constexpr', 'bool', 'true', 'false',
    ],
    operators: [
      'std::cout', 'out << x', '++it', 'v[i]', 'p->get()', 'a && b', 'int& ref', '*ptr', 'x += y;',
      'a <=> b', 'std::size_t', '[&](int x)', 'std::move(v)', 'it != end',
    ],
    statements: [
      '#include <vector>', '#include <iostream>', 'using namespace std;', 'int main() {',
      'std::vector<int> v{1, 2, 3};', 'std::cout << "Hi" << std::endl;', 'for (auto& x : v) x *= 2;',
      'return 0;', 'auto it = m.find(key);', 'std::string name = "Ada";', 'template <typename T>',
      'class Shape {', '};',
    ],
    lines: [
      'auto next = std::make_unique<Node>(42);',
      'std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });',
      'virtual double area() const = 0;',
      'explicit Point(int x, int y) : x_(x), y_(y) {}',
      'std::map<std::string, int> counts;',
      'if (auto it = m.find(k); it != m.end()) return it->second;',
      'constexpr std::size_t kMax = 1 << 10;',
      'for (std::size_t i = 0; i < v.size(); ++i) sum += v[i];',
      'static_assert(sizeof(int) == 4);',
      'const auto& [name, score] = *best;',
    ],
  },
];

const unique = (lines: readonly string[]) => [...new Set(lines.join('').replace(/ /g, ''))].join('');

function trackUnit(t: Track): Unit {
  const lessons: [string, string, string[], number][] = [
    ['Keywords', `The words every ${t.name} file is made of.`, t.keywords, 18],
    ['Operators and brackets', 'Short expressions: the symbols between the words.', t.operators, 10],
    ['Statements', 'Whole statements, one at a time.', t.statements, 6],
    ['Real lines', `Lines like the ones in real ${t.name} code.`, t.lines, 4],
  ];
  return {
    id: t.unit,
    title: t.name,
    blurb: t.blurb,
    lessons: lessons.map(([title, blurb, lines, count], i): Lesson => ({
      id: `${t.id}.l${i + 1}`,
      group: 'code',
      track: t.name,
      unit: t.unit,
      index: i + 1,
      title,
      blurb,
      newKeys: '',
      allowed: unique(lines),
      scored: true,
      steps: [
        { kind: 'drill', style: 'lines', lines, count },
        { kind: 'drill', style: 'lines', lines, count },
      ],
    })),
  };
}

export const CODE_TRACKS: Unit[] = TRACKS.map(trackUnit);
