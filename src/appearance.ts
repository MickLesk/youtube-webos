/**
 * Optional look-and-feel tweaks: pure black background and no animations.
 */
import { configAddChangeListener, configRead } from './config';
import './appearance.css';

const OPTIONS = {
  oledTheme: 'ytaf-oled',
  disableAnimations: 'ytaf-no-animations'
} as const;

for (const [key, className] of Object.entries(OPTIONS)) {
  const apply = () =>
    document.body.classList.toggle(className, !!configRead(key));
  apply();
  configAddChangeListener(key, apply);
}
