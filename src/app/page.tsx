import { Code2, PlusCircle, Send, Settings, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ModelSelection } from "./playground/model-selection-combobox";

export default function Home() {
  return (
    <>
      <div className="flex-1 flex lg:justify-between h-screen">
        <div className="w-full flex flex-col items-center">
          <div className="relative py-6 px-4 lg:px-6 flex-initial flex flex-col w-full">
            <label className="text-zinc-500 w-auto font-semibold text-sm pb-0.5 flex">
              Prompt <Sparkles className="mr-2 h-4 w-4" />
            </label>
            <div className="relative  min-h-[200px] flex-initial flex flex-col w-full">
              <textarea className="w-full min-h-[200px] placeholder-zinc-400 h-full border-none focus:ring-0 focus:border-black py-2 px-0 rounded-lg focus:outline-none" />
            </div>
          </div>
          <div className="md:divide-x md:divide-y-0 divide-y border-t bg-zinc-50 flex flex-col md:flex-row h-full w-full overflow-y-hidden">
            <div className="flex md:min-w-[465px] md:flex-1 md:flex-grow w-full">
              <div className="py-6 px-4 lg:px-6 flex-grow w-full">
                <div className="flex items-center justify-between pb-0.5">
                  <ModelSelection />
                  <div className="flex items-center ml-1 space-x-1">
                    <Button variant="ghost">
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost">
                      <Code2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="w-full text-black bg-zinc-50 min-h-[200px] placeholder-zinc-400 h-full border-none focus:ring-0 focus:border-black pt-2 pb-16 px-0 rounded-lg">
                  <div className="prose prose-pre:bg-[#282c34] flex-1 prose-sm max-w-none w-full">
                    Results here
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="sticky bottom-0 left-0 right-0 w-full border-t h-[64px] -mt-16 bg-zinc-50 z-30 px-4 lg:px-6 flex items-center justify-between py-2 shadow">
        <div className="space-x-2 flex items-center">
          <Button variant="outline">Clear</Button>
        </div>
        <div>
          <Button>
            <Send className="mr-2 h-4 w-4" /> Submit
          </Button>
        </div>
      </footer>
    </>
  );
}
