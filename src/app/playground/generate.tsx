"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/common/button";
import LLMSettingsButton from "~/components/ui/llm-settings-btn";
import { models } from "~/model-config";
import { ModelSelection } from "./model-selection-combobox";

const initModelState: { [key: string]: string } = {};

models.forEach(({ endpoint }) => {
  initModelState[endpoint] = "";
});

export default function Generate() {
  const [loading, setLoading] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [responses, setResponses] = React.useState(initModelState);

  const onClear = () => {
    setInput("");
    setResponses(initModelState);
  };

  const generateResponse = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setResponses(initModelState);
    setLoading(true);

    const responses = await Promise.all(
      models.map(async (llm) => {
        return await fetch(llm.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_MODAL_KEY}`,
          },
          body: JSON.stringify({
            prompt: input,
          }),
        });
      })
    );

    responses.map(async (response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      // This data is a ReadableStream
      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setLoading(true);
        setResponses((prev) => ({
          ...prev,
          [response.url]: prev[response.url] + chunkValue,
        }));
      }

      if (done) {
        setLoading(false);
      }
    });
  };

  return (
    <>
      <div className="flex-1 flex lg:justify-between h-screen">
        <div className="w-full flex flex-col items-center">
          <div className="relative py-6 px-4 lg:px-6 flex-initial flex flex-col w-full">
            <label className="text-zinc-500 w-auto font-semibold text-sm pb-0.5 flex">
              Prompt <Sparkles className="mr-2 h-4 w-4" />
            </label>
            <div className="relative  min-h-[200px] flex-initial flex flex-col w-full">
              <textarea
                className="w-full min-h-[200px] placeholder-zinc-400 h-full border-none focus:ring-0 focus:border-black py-2 px-0 rounded-lg focus:outline-none"
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
            </div>
          </div>
          <div className="md:divide-x md:divide-y-0 divide-y border-t bg-zinc-50 flex flex-col md:flex-row h-full w-full overflow-y-hidden">
            {models.map((model) => {
              return (
                <div
                  className="flex md:min-w-[465px] md:flex-1 md:flex-grow w-full"
                  key={model.endpoint}
                >
                  <div className="py-6 px-4 lg:px-6 flex-grow w-full">
                    <div className="flex items-center justify-between pb-0.5">
                      <ModelSelection
                        models={models}
                        defaultValue={model.name}
                        disabled
                      />
                      <LLMSettingsButton />
                    </div>
                    <div className="w-full text-black bg-zinc-50 min-h-[200px] placeholder-zinc-400 h-full border-none focus:ring-0 focus:border-black pt-2 pb-16 px-0 rounded-lg">
                      <div className="prose prose-pre:bg-[#282c34] flex-1 prose-sm max-w-none w-full">
                        {responses[model.endpoint]}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0 w-full border-t h-[64px] -mt-16 bg-zinc-50 z-30 px-4 lg:px-6 flex items-center justify-between py-2 shadow">
        <div className="space-x-2 flex items-center">
          <Button variant="outline" onClick={onClear} disabled={loading}>
            Clear
          </Button>
        </div>
        <div>
          {loading ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
            </Button>
          ) : (
            <Button onClick={generateResponse}>
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
