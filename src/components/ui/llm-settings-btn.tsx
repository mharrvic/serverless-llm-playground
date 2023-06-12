import { Code2, PlusCircle, Settings } from "lucide-react";
import { Button } from "./common/button";

export default function LLMSettingsButton() {
  return (
    <div className="flex items-center ml-1 space-x-1">
      <Button variant="ghost" disabled>
        <PlusCircle className="h-5 w-5" />
      </Button>
      <Button variant="ghost" disabled>
        <Code2 className="h-5 w-5" />
      </Button>
      <Button variant="ghost" disabled>
        <Settings className="h-5 w-5" />
      </Button>
    </div>
  );
}
