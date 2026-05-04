import useRole from "./useRole";

export default function usePermissions(permissions) {
  const { isOwner } = useRole();

  return {
    canSellFromMultipleShops:
      isOwner || !!permissions?.canSellFromMultipleShops,
    canAccessStoresReports: isOwner || !!permissions?.canAccessStoresReports,
    canViewIncome: isOwner || !!permissions?.canViewIncome,
    canAddEditDeleteProduct: isOwner || !!permissions?.canAddEditDeleteProduct,
    canAddEditDeleteOutlet: isOwner || !!permissions?.canAddEditDeleteOutlet,
    canManageWorkers: isOwner || !!permissions?.canDeleteProduct,
    canAddRemoveOutletProducts: isOwner || !!permissions?.canAddOutlet,
  };
}
