import React from 'react';
import { User } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircleOff } from 'lucide-react';

interface ChatInterfaceProps {
  currentUser: User;
  selectedUser?: User | null;
  users: User[];
  messages?: any[];
  onSelectUser?: (user: User) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentUser
}) => {
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Chat Temporarily Disabled</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-10">
        <MessageCircleOff className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg text-center mb-2">Chat functionality is temporarily disabled</p>
        <p className="text-sm text-muted-foreground text-center">
          The chat system is currently under maintenance.
        </p>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;