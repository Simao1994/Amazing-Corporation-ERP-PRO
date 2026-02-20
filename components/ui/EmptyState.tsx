
import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon = <PackageOpen size={48} className="text-zinc-300" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="text-zinc-500 text-sm mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6" variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
