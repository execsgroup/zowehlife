import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Loader2, Wand2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AITextHelperProps {
  currentValue: string;
  onTextGenerated: (text: string) => void;
  context?: string;
  placeholder?: string;
}

export function AITextHelper({
  currentValue,
  onTextGenerated,
  context,
  placeholder = "e.g., Make it more encouraging...",
}: AITextHelperProps) {
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt?: string; existingText?: string; context?: string }) => {
      const res = await apiRequest("POST", "/api/ai/generate-text", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.text) {
        onTextGenerated(data.text);
        setPrompt("");
        setOpen(false);
        toast({
          title: "Text generated",
          description: "The AI has generated new text for you.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Could not generate text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim() && !currentValue.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a prompt or have existing text to improve.",
        variant: "destructive",
      });
      return;
    }
    
    generateMutation.mutate({
      prompt: prompt.trim() || undefined,
      existingText: currentValue.trim() || undefined,
      context,
    });
  };

  const handleImprove = () => {
    if (!currentValue.trim()) {
      toast({
        title: "No text to improve",
        description: "Please write some text first.",
        variant: "destructive",
      });
      return;
    }
    
    generateMutation.mutate({
      existingText: currentValue.trim(),
      context,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 px-2 shadow-sm"
          data-testid="button-ai-helper"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">AI</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium text-sm">AI Text Helper</span>
          </div>
          
          <div className="space-y-2">
            <Input
              placeholder={placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              disabled={generateMutation.isPending}
              data-testid="input-ai-prompt"
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="flex-1"
                data-testid="button-ai-generate"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                )}
                {prompt.trim() ? "Generate" : "Write for me"}
              </Button>
              
              {currentValue.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleImprove}
                  disabled={generateMutation.isPending}
                  data-testid="button-ai-improve"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Improve
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {currentValue.trim() 
              ? "Enter instructions to modify your text, or click Improve to enhance it."
              : "Describe what you want to write and AI will generate it for you."}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AITextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  context?: string;
  aiPlaceholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
}

export function AITextarea({
  value,
  onChange,
  placeholder,
  context,
  aiPlaceholder,
  rows = 4,
  className = "",
  disabled = false,
  id,
  "data-testid": dataTestId,
}: AITextareaProps) {
  return (
    <div className="relative">
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`pr-10 pb-10 resize-none ${className}`}
        disabled={disabled}
        data-testid={dataTestId}
      />
      <div className="absolute bottom-3 right-3">
        <AITextHelper
          currentValue={value}
          onTextGenerated={onChange}
          context={context}
          placeholder={aiPlaceholder}
        />
      </div>
    </div>
  );
}
