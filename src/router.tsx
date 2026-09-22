import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DashboardRoute } from "./routes/DashboardRoute";
import { DistributionRoute } from "./routes/DistributionRoute";
import { PackingRoute } from "./routes/PackingRoute";
import { ProcessesRoute } from "./routes/ProcessesRoute";
import { ReceivingRoute } from "./routes/ReceivingRoute";
import { TransportRoute } from "./routes/TransportRoute";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardRoute,
});

const processesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/processes",
  component: ProcessesRoute,
});

const packingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packing",
  component: PackingRoute,
});

const transportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transport",
  component: TransportRoute,
});

const receivingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/receiving",
  component: ReceivingRoute,
});

const distributionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/distribution",
  component: DistributionRoute,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  processesRoute,
  packingRoute,
  transportRoute,
  receivingRoute,
  distributionRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

