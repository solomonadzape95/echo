import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CallScreen from "./pages/CallScreen";

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
  return <RouterProvider router={router} />
}