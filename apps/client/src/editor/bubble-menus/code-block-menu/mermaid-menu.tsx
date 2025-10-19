import type React from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { mermaidTemplates } from "../../extensions/code-block/constant";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from '@idea/ui/shadcn/ui/popover';
import { Button } from '@idea/ui/shadcn/ui/button';

interface MermaidMenuProps {
  editor: Editor;
}

// More templates: https://mermaid.js.org/syntax/flowchart.html
// Don't change the indentations of the template string, it looks ugly in the editor
const getTemplateCode = (template: string) => {
  switch (template) {
    case "flowchart":
      return `flowchart TD
A[Start] --> B{Decision?}
B -->|Yes| C[Confirm]
B -->|No| D[End]`;
    case "sequenceDiagram":
      return `sequenceDiagram
ParticipantA->>ParticipantB: Hello B, how are you?
ParticipantB->>ParticipantA: I'm fine, thank you!`;
    case "classDiagram":
      return `classDiagram
ClassA --|> ClassB
ClassC --* ClassD
ClassE --o ClassF
ClassG --> ClassH
ClassI -- ClassJ
ClassK ..> ClassL
ClassM ..|> ClassN
ClassO .. ClassP`;
    case "stateDiagram":
      return `stateDiagram-v2
[*] --> StillSolid
StillSolid --> Liquid: Melting
Liquid --> Gas: Evaporation
Gas --> Liquid: Condensation
Liquid --> StillSolid: Freezing`;
    case "erDiagram":
      return `erDiagram
CUSTOMER ||--o{ ORDER : places
ORDER ||--|{ LINE-ITEM : contains
CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`;
    case "journey":
      return `journey
title My working day
section Go to work
  Wake up: 1: Me
  Catch bus: 2: Me
  Arrive at office: 3: Me
section At work
  Development tasks: 5: Me, TeamMate
  Meeting: 2: Me, TeamMate
section Go home
  Leave office: 3: Me
  Get home: 4: Me`;
    case "gantt":
      return `gantt
title Project Timeline
dateFormat  YYYY-MM-DD
section Design
Task1           :a1, 2023-01-01, 7d
Task2           :after a1, 5d
section Development
Task3           :2023-01-15, 10d
section Testing
Task4           :2023-01-25, 5d`;
    case "pie":
      return `pie title My Favorite Pies
"Apple" : 40
"Banana" : 30
"Cherry" : 30`;
    case "requirementDiagram":
      return `requirementDiagram
requirement TestRequirement {
id: 1
text: The system should handle user login
risk: high
verifymethod: test
}
element TestElement {
type: module
}
TestElement - satisfies > TestRequirement`;
    case "architecture-beta":
      return `architecture-beta
group api(cloud)[API]

service db(database)[Database] in api
service disk1(disk)[Storage] in api
service disk2(disk)[Storage] in api
service server(server)[Server] in api

db:L -- R:server
disk1:T -- B:server
disk2:T -- B:db`;
    case "kanban":
      return `kanban
Todo
[Create Documentation]
[Create Blog Post]
[In progress]
[Implement Feature]@{ assigned: 'dev1' }
[Done]
[Setup Project]@{ ticket: PROJ-1, priority: 'High' }
[Initial Design]@{ assigned: 'dev2', priority: 'Medium' }
`;
    case "packet-beta":
      return `packet-beta
title UDP Packet
0-15: "Source Port"
16-31: "Destination Port"
32-47: "Length"
48-63: "Checksum"
64-95: "Data (variable length)"`;
    case "block-beta":
      return `block-beta
columns 1
  db(("DB"))
  blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(down)
  block:ID
    A
    B["A wide one in the middle"]
    C
  end
  space
  D
  ID --> D
  C --> D
  style B fill:#969,stroke:#333,stroke-width:4px`;
    case "xychart-beta":
      return `xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]`;
    case "sankey-beta":
      return `sankey-beta
Agricultural 'waste',Bio-conversion,124.729
Bio-conversion,Liquid,0.597
Bio-conversion,Losses,26.862
Bio-conversion,Solid,280.322
Bio-conversion,Gas,81.144
Biofuel imports,Liquid,35
Biomass imports,Solid,35
Coal imports,Coal,11.606
Coal reserves,Coal,63.965`; // Simplified for readability, you can add more data as needed
    case "mindmap":
      return `mindmap
root((mindmap))
  Origins
    Long history
    ::icon(fa fa-book)
    Popularisation
      British popular psychology author Tony Buzan
  Research
    On effectiveness<br/>and features
    On Automatic creation
      Uses
          Creative techniques
          Strategic planning
          Argument mapping
  Tools
    Pen and paper
    Mermaid`;
    case "timeline":
      return `timeline
title History of Social Media Platform
2002 : LinkedIn
2004 : Facebook
      : Google
2005 : YouTube
2006 : Twitter`;
    default:
      return `\`\`\`mermaid\n${template}\n    // Add your diagram code here\`\`\``;
  }
};

const MermaidMenu: React.FC<MermaidMenuProps> = ({ editor }) => {
  const { t } = useTranslation();
  const insertTemplate = (template: string) => {
    const templateCode = getTemplateCode(template);
    editor.chain().focus().insertContent(templateCode).run();
  };

  return (
    <div className="flex items-center space-x-2">
      {/* template */}
      <div className="relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="px-2 border-none bg-transparent text-sm">
              {t("Insert Template")}
              <ChevronDown className="h-2 w-2 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 max-h-[300px] overflow-y-auto">
            <div className="flex flex-col gap-1">
              {mermaidTemplates.map((template) => (
                <Button key={template.value} size="sm" onClick={() => insertTemplate(template.value)} variant="ghost" tabIndex={-1}>
                  {template.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {/* HelpCircle */}
      <div className="w-[1px] h-4 bg-gray-300" />
      <div
        onClick={(e) => {
          e.preventDefault();
          window.open("https://mermaid.js.org/intro/", "_blank");
        }}
        className="flex items-center text-sm text-blue-500 hover:underline px-2 cursor-pointer text-decoration-none"
      >
        <HelpCircle className="w-4 h-4 mr-1 inline-block" />
        <span className="text-nowrap">{t("Syntax")}</span>
      </div>
      {/* layout */}
      <div className="w-[1px] h-4 bg-gray-300" />
      {/* display selector */}
      <MermaidDisplaySelector editor={editor} />
    </div>
  );
};

// ❗ When using Select component in Bubble menu, the SelectContent will jump to the top left corner
// unable to fix now, so change to Popover for now
const MermaidDisplaySelector: React.FC<{ editor: Editor }> = ({ editor }) => {
  const { t } = useTranslation();
  const currentDisplay = editor.getAttributes("codeBlock").mermaidDisplay || "split";

  return (
    <div className="px-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="px-2 h-8 border-none bg-transparent text-sm">
            {currentDisplay === "code" ? t("Code") : currentDisplay === "preview" ? t("Preview") : t("Split")}
            <ChevronDown className="h-2 w-2 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={() => editor.chain().focus().updateAttributes("codeBlock", { mermaidDisplay: "code" }).run()}
              variant={currentDisplay === "code" ? "secondary" : "ghost"}
              tabIndex={-1}
            >
              {t("Code")}
            </Button>
            <Button
              size="sm"
              onClick={() => editor.chain().focus().updateAttributes("codeBlock", { mermaidDisplay: "preview" }).run()}
              variant={currentDisplay === "preview" ? "secondary" : "ghost"}
              tabIndex={-1}
            >
              {t("Preview")}
            </Button>
            <Button
              size="sm"
              onClick={() => editor.chain().focus().updateAttributes("codeBlock", { mermaidDisplay: "split" }).run()}
              variant={currentDisplay === "split" ? "secondary" : "ghost"}
              tabIndex={-1}
            >
              {t("Split")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MermaidMenu;
