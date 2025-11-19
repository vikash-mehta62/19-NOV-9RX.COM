import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
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
    <div className="flex flex-col h-[400px] border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Group Communications</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{msg.sender}</span>
              <span className="text-sm text-muted-foreground">
                {msg.timestamp.toLocaleString()}
              </span>
            </div>
            <p className="mt-1">{msg.content}</p>
          </div>
        ))}
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}