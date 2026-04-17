/**
 * Legacy theme shim.
 *
 * The canonical theme lives in `src/theme.js`. This module re-exports the
 * light and dark themes from there so existing `import { lightTheme } from
 * 'themes'` usages keep working without diverging from the design system.
 */

import { getTheme } from '../theme';

const lightTheme = getTheme('light');
const darkTheme = getTheme('dark');

export { lightTheme, darkTheme };
export default lightTheme;
