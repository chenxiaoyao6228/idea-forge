/**
 * Frequently used languages in frontend development
 */
export const FRONTEND_FREQUENT_USED_LANGUAGES = {
  mermaid: "Mermaid Diagram",
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  json: "JSON",
  markdown: "Markdown",
};

/**
 * Less frequently used languages in frontend development
 */
export const LESS_FREQUENT_USED_LANGUAGES = {
  python: "Python",
  sql: "SQL",

  nginx: "Nginx",
  docker: "Docker",
  yaml: "YAML",
  php: "PHP",
  ruby: "Ruby",
  go: "Go",
  rust: "Rust",
  swift: "Swift",
  java: "Java",
  csharp: "C#",
  kotlin: "Kotlin",
  graphql: "GraphQL",
  bash: "Bash",
  powershell: "Powershell",
  toml: "TOML",
  solidity: "Solidity",
  cpp: "C++",
  clike: "C",
  objectivec: "Objective-C",
  perl: "Perl",
  r: "R",
  scala: "Scala",
  haskell: "Haskell",
  lua: "Lua",
  elixir: "Elixir",
  erlang: "Erlang",
  groovy: "Groovy",
  ocaml: "OCaml",
  vb: "Visual Basic",
  verilog: "Verilog",
  vhdl: "VHDL",
  lisp: "Lisp",
  nix: "Nix",
  hcl: "HCL",
  ini: "INI",
  zig: "Zig",
  none: "Plain Text",
};

export const LANGUAGES_MAP = { ...FRONTEND_FREQUENT_USED_LANGUAGES, ...LESS_FREQUENT_USED_LANGUAGES };

export const mermaidTemplates = [
  { name: "Flowchart", value: "flowchart" },
  { name: "Sequence Diagram", value: "sequenceDiagram" },
  { name: "Class Diagram", value: "classDiagram" },
  { name: "State Diagram", value: "stateDiagram" },
  { name: "Entity Relationship Diagram", value: "erDiagram" },
  { name: "User Journey", value: "journey" },
  { name: "Gantt Chart", value: "gantt" },
  { name: "Pie Chart", value: "pie" },
  { name: "Requirement Diagram", value: "requirementDiagram" },
];
