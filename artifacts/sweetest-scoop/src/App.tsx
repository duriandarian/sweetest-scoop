import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Home } from './game/Home';
import { RoomPage } from './game/RoomPage';
import { SoloPage } from './game/Solo';
import { QuestionPreview } from './game/QuestionPreview';
import { MusicProvider } from './game/MusicProvider';
import './game/game.css';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Home}/>
    <Route path="/room/:code" component={RoomPage}/>
    <Route path="/solo" component={SoloPage}/>
    <Route path="/preview/question"><QuestionPreview/></Route>
    <Route component={NotFound}/>
  </Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><MusicProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></MusicProvider></TooltipProvider></QueryClientProvider>;
}

export default App;
