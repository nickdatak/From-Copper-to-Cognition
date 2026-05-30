import { useEffect } from 'react';
import { AppLayout } from './app/AppLayout';
import { useAppStore } from './store/appStore';

function App() {
  const setTheme = useAppStore((s) => s.setTheme);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return <AppLayout />;
}

export default App;
