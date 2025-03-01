import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import LandingPage from "./components/LandingPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/home",
    element: <div>Hello Home!</div>,
  },
]);
export function App() {
  return <RouterProvider router={router} />
}