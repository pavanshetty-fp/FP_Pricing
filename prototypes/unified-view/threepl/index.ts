export { BrokerOrdersScreen } from "./BrokerOrdersScreen";
export { RecurringOrdersScreen } from "./RecurringOrdersScreen";
export { RecurringRulesScreen } from "./RecurringRulesScreen";
export { RecurringProgramsScreen } from "./RecurringProgramsScreen";
export {
  BrokerVendorsScreen,
  BrokerCustomersScreen,
  BrokerProductsScreen,
  RentalAssetsScreen as BrokerRentalAssetsScreen,
  useDirectoryData,
  type DirectoryData,
} from "./DirectoryScreens";
export { type Navigator as DirectoryNavigator } from "./DirectoryEntityScreen";
export { BrokerBoard, BOARD_VERSIONS, type BoardLane, type BoardCard, type BoardVersion } from "./BrokerBoard";
export { BrokerOrderSheet, type BrokerOrderDraft } from "./BrokerOrderSheet";
export {
  BROKER_ORDERS,
  BROKER_COLUMNS,
  BROKER_STATUSES,
  ORDER_KINDS,
  assertConsistent,
  totalGal,
  type BrokerOrder,
  type BrokerStatus,
  type OrderKind,
} from "./orders";
export { VENDORS, BUSINESS_LINES, type Vendor } from "./vendors";
import {
  BROKER_ORDERS as BROKER_ORDERS_IMPL,
  assertConsistent as assertConsistentImpl,
} from "./orders";
import { assertMovementAssetsExist, assertProductsCoverOrders } from "./directory";
export { VENDOR_GROUP_DIMS } from "./vendorDims";

/*
  THE INVARIANTS ARE RUN, not merely written. Three assertions existed and
  nothing called them, which made "fails the build if that drifts" a claim the
  code did not back. They run once at module load in dev — the seed is static,
  so once is enough, and a broken invariant is then a loud console error the
  first time the module is imported rather than a wrong number someone notices
  in a screenshot weeks later. Stripped from production by the `DEV` guard.
*/
if (import.meta.env?.DEV) {
  const problems = assertConsistentImpl(BROKER_ORDERS_IMPL);
  if (problems.length > 0) {
    console.error("[3PL] seed invariants broken:\n" + problems.join("\n"));
  }
  try {
    assertProductsCoverOrders();
    assertMovementAssetsExist();
  } catch (e) {
    console.error("[3PL] " + (e as Error).message);
  }
}
