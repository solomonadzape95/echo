import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import CallScreen from "./pages/CallScreen";
import { UserProvider } from "./contexts/UserContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/join/:id",
    element: <CallScreen />,
  },
]);
export function App() {
  return <>
    
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>

  </>
}