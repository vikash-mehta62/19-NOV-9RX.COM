import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  locationId?: string;
}

export function GroupMessaging({ groupId }: { groupId: string }) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const [messages] = useState<Message[]>([]); // In a real app, this would use React Query

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // In a real app, this would make an API call
    // console.log("Sending message:", { groupId, message });
    
    toast({
      title: "Message Sent",
      description: "Your message has been sent to all locations.",
    });
    
    setMessage("");
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[400px] border rounded-lg">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold">Group Communications</h3>
          <p className="text-sm text-muted-foreground">Send messages to all locations in this group</p>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-2 font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start a conversation with all locations in this group
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm">{msg.content}</p>
              </div>
            ))
          )}
        </ScrollArea>
        
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message to all locations</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}