/**
 * Subtitle size, background and position, independent of YouTube's own
 * caption settings. Applied with CSS classes on <body>.
 */
import { configAddChangeListener, configRead } from './config';
import './subtitle-style.css';

const KEYS = ['subtitleSize', 'subtitleBackground', 'subtitlePosition'];

function apply() {
  const body = document.body;
  const remove: string[] = [];
  for (let i = 0; i < body.classList.length; i++) {
    const name = body.classList[i]!;
    if (name.indexOf('ytaf-sub-') === 0) remove.push(name);
  }
  for (const name of remove) body.classList.remove(name);

  for (const key of KEYS) {
    const value = String(configRead(key));
    if (value !== 'default') body.classList.add(`ytaf-sub-${value}`);
  }
}

for (const key of KEYS) configAddChangeListener(key, apply);
apply();
