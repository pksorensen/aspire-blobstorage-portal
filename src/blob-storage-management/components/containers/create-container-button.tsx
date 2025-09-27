'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateContainerForm } from './create-container-form';

interface CreateContainerButtonProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function CreateContainerButton({ children, className, 'data-testid': testId }: CreateContainerButtonProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
console.log("test");
  return (
    <>
      <Button 
        onClick={() => setIsCreateDialogOpen(true)}
        className={className}
        data-testid={testId}
      >
        {children}
      </Button>
      <CreateContainerForm 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
}