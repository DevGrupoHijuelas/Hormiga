// Ícono de Hormiga, vista desde arriba, en línea como los demás íconos (toma el color del texto).
export default function AntIcon({ size = 24, strokeWidth = 1.8, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <circle cx="16" cy="7.5" r="3" />
      <ellipse cx="16" cy="14.5" rx="2.4" ry="2.8" />
      <ellipse cx="16" cy="23.5" rx="4" ry="5.2" />
      <path d="M14.3 5 11.5 2M17.7 5 20.5 2" />
      <path d="M13.8 13.5 8 10.5M18.2 13.5 24 10.5M13.6 15.5 7 17.5M18.4 15.5 25 17.5M13 20.5 7.5 25.5M19 20.5 24.5 25.5" />
    </svg>
  );
}

export const APP_NAME = "Hormiga";
export const APP_VERSION = "1.0";
