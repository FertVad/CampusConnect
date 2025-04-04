import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MessageCircleOff } from 'lucide-react';

export default function Chat() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <Card className="w-full">
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
    </div>
  );
}