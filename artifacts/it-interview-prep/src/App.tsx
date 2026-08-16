import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { QuizProvider } from '@/lib/quiz-context';
import { Navbar } from '@/components/layout/navbar';

import Home from '@/pages/home';
import Quiz from '@/pages/quiz';
import Result from '@/pages/result';
import Leaderboard from '@/pages/leaderboard';
import Race from '@/pages/race';
import About from '@/pages/about';
import CodingChallenge from '@/pages/coding-challenge';

const queryClient = new QueryClient();

function Router() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--cin-bg)', position: 'relative' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/quiz" component={Quiz} />
            <Route path="/result" component={Result} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/race" component={Race} />
            <Route path="/lab" component={CodingChallenge} />
            <Route path="/about" component={About} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </main>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <QuizProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QuizProvider>
    </QueryClientProvider>
  );
}

export default App;
