export enum ItemStatus {
  NOT_PACKED = "NOT_PACKED",
  PACKED = "PACKED",
  RECEIVED = "RECEIVED",
  MISSING = "MISSING",
  DISTRIBUTED = "DISTRIBUTED"
}

export interface Item {
  catalog_id: UUID;
  description: string;
  price: number;
  item_status: ItemStatus;
  is_balmas: boolean;
}

