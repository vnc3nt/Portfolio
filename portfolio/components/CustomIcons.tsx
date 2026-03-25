import React from 'react';

export const AppleIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.057 12.872c.025 2.747 2.395 3.666 2.422 3.678-.022.072-.379 1.3-1.274 2.608-.774 1.13-1.577 2.256-2.845 2.279-1.248.022-1.649-.74-3.073-.74-1.424 0-1.871.717-3.051.763-1.226.045-2.148-1.217-2.927-2.347-1.594-2.313-2.812-6.541-1.166-9.408.817-1.42 2.274-2.32 3.864-2.343 1.205-.022 2.343.81 3.082.81.738 0 2.112-.99 3.535-.845 1.189.049 2.158.48 2.822 1.454-3.321 2.001-2.791 6.096.606 7.097zM14.9 3.82c.624-.757 1.042-1.808.928-2.82-1.036.042-2.293.689-3.036 1.558-.665.761-1.245 1.838-1.089 2.828 1.156.09 2.324-.658 3.197-1.566z"/>
  </svg>
);

export const AndroidIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="M17.6 11.48 L 19.1 8.83 A 0.52 0.52 0 0 0 19 8.24 A 0.53 0.53 0 0 0 18.4 8.16 L 16.8 10.9 C 15.4 10.27 13.76 9.9 12 9.9 C 10.23 9.9 8.59 10.27 7.2 10.9 L 5.6 8.16 A 0.53 0.53 0 0 0 5 8.24 A 0.52 0.52 0 0 0 4.9 8.83 L 6.4 11.48 C 3.1 13.29 1.76 16.92 2.1 20.37 L 21.9 20.37 C 22.24 16.92 20.9 13.29 17.6 11.48 Z M 7.5 16 A 0.5 0.5 0 1 1 7.5 15 A 0.5 0.5 0 0 1 7.5 16 Z M 16.5 16 A 0.5 0.5 0 1 1 16.5 15 A 0.5 0.5 0 0 1 16.5 16 Z" />
  </svg>
);

export const WindowsIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
    stroke="none"
  >
    <path d="M0 3.449L9.886 2.102V11.536H0V3.449ZM11.238 1.91L24 0.165V11.536H11.238V1.91ZM0 12.825H9.886V21.146L0 19.722V12.825ZM11.238 12.825H24V23.753L11.238 22.016V12.825Z" />
  </svg>
);
