import type React from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { mermaidTemplates } from "../../extensions/code-block/constant";

interface MermaidMenuProps {
  editor: Editor;
}

const MermaidMenu: React.FC<MermaidMenuProps> = ({ editor }) => {
  const insertTemplate = (template: string) => {
    const templateCode = getTemplateCode(template);
    editor.chain().focus().insertContent(templateCode).run();
  };

  const getTemplateCode = (template: string) => {
    switch (template) {
      case "flowchart":
        return "flowchart TD\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Confirm]\n    B -->|No| D[End]";
      case "sequenceDiagram":
        return "sequenceDiagram\n    ParticipantA->>ParticipantB: Hello B, how are you?\n    ParticipantB->>ParticipantA: I'm fine, thank you!";
      case "classDiagram":
        return "classDiagram\n    ClassA --|> ClassB\n    ClassC --* ClassD\n    ClassE --o ClassF\n    ClassG --> ClassH\n    ClassI -- ClassJ\n    ClassK ..> ClassL\n    ClassM ..|> ClassN\n    ClassO .. ClassP";
      case "stateDiagram":
        return "stateDiagram-v2\n    [*] --> StillSolid\n    StillSolid --> Liquid: Melting\n    Liquid --> Gas: Evaporation\n    Gas --> Liquid: Condensation\n    Liquid --> StillSolid: Freezing";
      case "erDiagram":
        return "erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses";
      case "journey":
        return "journey\n    title My working day\n    section Go to work\n      Wake up: 1: Me\n      Catch bus: 2: Me\n      Arrive at office: 3: Me\n    section At work\n      Development tasks: 5: Me, TeamMate\n      Meeting: 2: Me, TeamMate\n    section Go home\n      Leave office: 3: Me\n      Get home: 4: Me";
      case "gantt":
        return "gantt\n    title Project Timeline\n    dateFormat  YYYY-MM-DD\n    section Design\n    Task1           :a1, 2023-01-01, 7d\n    Task2           :after a1, 5d\n    section Development\n    Task3           :2023-01-15, 10d\n    section Testing\n    Task4           :2023-01-25, 5d";
      case "pie":
        return 'pie title My Favorite Pies\n    "Apple" : 40\n    "Banana" : 30\n    "Cherry" : 30';
      case "requirementDiagram":
        return "requirementDiagram\n    requirement TestRequirement {\n    id: 1\n    text: The system should handle user login\n    risk: high\n    verifymethod: test\n    }\n    element TestElement {\n    type: module\n    }\n    TestElement - satisfies > TestRequirement";
      default:
        return `\`\`\`mermaid\n${template}\n    // Add your diagram code here\`\`\``;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* template */}
      <div className="relative">
        <select
          onChange={(e) => insertTemplate(e.target.value)}
          className="mermaid-template-selector max-w-32 appearance-none bg-transparent text-sm focus:outline-none cursor-pointer mr-2"
        >
          <option value="">Insert Template</option>
          {mermaidTemplates.map((template) => (
            <option key={template.value} value={template.value}>
              {template.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
      {/* HelpCircle */}
      <div className="w-px h-4 bg-gray-300" />
      <a
        href="https://mermaid.js.org/intro/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center text-sm text-blue-500 hover:underline px-1 cursor-pointer text-decoration-none"
      >
        <HelpCircle className="w-4 h-4 mr-1 inline-block" />
        Syntax
      </a>
      {/* layout */}
      <div className="w-px h-4 bg-gray-300" />
      <MermaidDisplaySelector editor={editor} />
    </div>
  );
};

const MermaidDisplaySelector: React.FC<{ editor: Editor }> = ({ editor }) => {
  const handleDisplayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDisplay = event.target.value;
    editor.chain().focus().updateAttributes("codeBlock", { mermaidDisplay: newDisplay }).run();
  };

  const currentDisplay = editor.getAttributes("codeBlock").mermaidDisplay || "split";

  return (
    <div className="relative flex items-center">
      <select value={currentDisplay} onChange={handleDisplayChange} className="appearance-none bg-transparent text-sm focus:outline-none mr-2 cursor-pointer">
        <option value="code">Code</option>
        <option value="preview">Preview</option>
        <option value="split">Split</option>
      </select>

      <ChevronDown className=" w-4 h-4 text-gray-400" />
    </div>
  );
};

export default MermaidMenu;
