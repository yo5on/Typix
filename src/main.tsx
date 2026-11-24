import { render } from 'preact';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';
import './ui/tokens.css';
import './ui/base.css';
import './ui/motion.css';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
