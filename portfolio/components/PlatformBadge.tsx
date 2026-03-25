'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ElementType } from 'react';

interface PlatformBadgeProps {
  icon: LucideIcon | ElementType;
  label: string;
  url?: string;
  colorClass: string; // z.B. "bg-blue-500"
  isEditMode?: boolean;
  onClick?: () => void;
}

export default function PlatformBadge({
  icon: Icon,
  label,
  url,
  colorClass,
  isEditMode,
  onClick
}: PlatformBadgeProps) {
  const isActive = !!url;
  const isClickable = isActive || isEditMode;

  return (
    <motion.div
      onClick={() => {
        if (isActive && !isEditMode && url) window.open(url, '_blank');
        if (isEditMode && onClick) onClick();
      }}
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0.4,
        filter: isActive ? 'grayscale(0%)' : 'grayscale(100%)',
        scale: 1,
        width: "auto"
      }}
      whileHover={isClickable ? { 
        scale: 1.05,
        paddingRight: 12
      } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`group relative flex h-8 items-center rounded-full overflow-hidden transition-colors ${
        isActive ? colorClass : 'bg-gray-500/50 dark:bg-gray-800/50'
      } text-white ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ minWidth: 32 }}
      title={!isActive && !isEditMode ? `${label} (nicht verfügbar)` : label}
    >
      <div className="flex h-8 w-8 items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      
      {/* Label Text - Smooth CSS Transition for width */}
      <span className={`whitespace-nowrap text-xs font-medium overflow-hidden transition-all duration-300 ease-out max-w-0 ${isClickable ? 'group-hover:max-w-[150px] group-hover:pl-2' : ''}`}>
        {label}
      </span>
    </motion.div>
  );
}
